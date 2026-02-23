# How to Handle Terraform CI/CD Pipeline Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Pipeline Failures, Troubleshooting, DevOps, Infrastructure as Code

Description: Learn how to handle and recover from Terraform CI/CD pipeline failures including partial applies, state lock issues, provider errors, timeout handling, and automated recovery strategies.

---

Terraform pipeline failures are inevitable. Network timeouts, API rate limits, stale plans, state lock contention, and partial applies all happen in production CI/CD. The difference between a team that handles these well and one that does not comes down to preparation: having monitoring, recovery procedures, and automated handling in place before things break.

## Categories of Pipeline Failures

Terraform CI/CD failures fall into distinct categories, each requiring a different response:

1. **Init failures** - Backend unreachable, provider download fails
2. **Plan failures** - Invalid configuration, API errors during refresh
3. **Apply failures** - Resource creation fails, API rate limits, timeouts
4. **Partial applies** - Apply succeeds for some resources, fails for others
5. **State issues** - Lock contention, corruption, stale state
6. **Pipeline infrastructure** - Runner crashes, out of memory, network issues

## Detecting and Classifying Failures

Build failure classification into your pipeline:

```bash
#!/bin/bash
# scripts/run-terraform.sh
# Wrapper that classifies Terraform failures

set +e
OUTPUT=$(terraform "$@" -no-color 2>&1)
EXIT_CODE=$?
set -e

echo "$OUTPUT"

if [ $EXIT_CODE -ne 0 ]; then
  # Classify the error
  if echo "$OUTPUT" | grep -q "Error acquiring the state lock"; then
    echo "::error::FAILURE_TYPE=state_lock"
    echo "failure_type=state_lock" >> $GITHUB_OUTPUT
  elif echo "$OUTPUT" | grep -q "Error: Provider"; then
    echo "::error::FAILURE_TYPE=provider_error"
    echo "failure_type=provider_error" >> $GITHUB_OUTPUT
  elif echo "$OUTPUT" | grep -q "rate exceeded\|Throttling\|RequestLimitExceeded"; then
    echo "::error::FAILURE_TYPE=rate_limit"
    echo "failure_type=rate_limit" >> $GITHUB_OUTPUT
  elif echo "$OUTPUT" | grep -q "timeout\|context deadline exceeded"; then
    echo "::error::FAILURE_TYPE=timeout"
    echo "failure_type=timeout" >> $GITHUB_OUTPUT
  elif echo "$OUTPUT" | grep -q "Error creating\|Error updating\|Error deleting"; then
    echo "::error::FAILURE_TYPE=resource_error"
    echo "failure_type=resource_error" >> $GITHUB_OUTPUT
  else
    echo "::error::FAILURE_TYPE=unknown"
    echo "failure_type=unknown" >> $GITHUB_OUTPUT
  fi
fi

exit $EXIT_CODE
```

## Handling Partial Applies

A partial apply is the most dangerous failure. Some resources were created or modified, but the apply stopped before completing. The state file reflects the partial changes.

```yaml
# .github/workflows/terraform-apply.yml
- name: Terraform Apply with recovery
  id: apply
  continue-on-error: true
  run: |
    cd terraform
    terraform apply -no-color -auto-approve 2>&1 | tee apply-output.txt
    echo "exit_code=${PIPESTATUS[0]}" >> $GITHUB_OUTPUT

- name: Handle partial apply
  if: steps.apply.outcome == 'failure'
  run: |
    cd terraform
    echo "Apply failed. Checking state for partial changes..."

    # Get the list of resources in state
    terraform state list > current-state.txt

    # Check what changed since the apply started
    echo "Resources currently in state:"
    cat current-state.txt

    # Run a plan to see what is still pending
    terraform plan -no-color -out=recovery-plan 2>&1 | tee recovery-plan-output.txt

    # Count remaining changes
    REMAINING=$(grep -c "will be" recovery-plan-output.txt || echo 0)
    echo "Resources still needing changes: $REMAINING"

    # Notify the team
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -d "{
        \"text\": \"Terraform partial apply detected. $REMAINING resources still need changes. Manual review required.\",
        \"attachments\": [{
          \"color\": \"danger\",
          \"text\": \"$(head -20 apply-output.txt)\"
        }]
      }"
```

### Retry After Partial Apply

```yaml
- name: Retry apply after partial failure
  if: steps.apply.outcome == 'failure'
  run: |
    cd terraform
    MAX_RETRIES=3
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
      echo "Retry attempt $ATTEMPT of $MAX_RETRIES"

      # Wait before retry (some failures are transient)
      sleep $((ATTEMPT * 30))

      if terraform apply -no-color -auto-approve 2>&1; then
        echo "Retry succeeded on attempt $ATTEMPT"
        exit 0
      fi

      ATTEMPT=$((ATTEMPT + 1))
    done

    echo "All retry attempts failed"
    exit 1
```

## Handling API Rate Limits

Cloud provider API rate limits are common during large applies:

```hcl
# provider.tf - Configure retries for rate limiting
provider "aws" {
  region = "us-east-1"

  # Retry configuration for rate-limited API calls
  retry_mode  = "adaptive"
  max_retries = 10
}
```

In the pipeline, add parallelism limits:

```yaml
- name: Terraform Apply with parallelism limit
  run: |
    cd terraform
    # Limit concurrent API calls to avoid rate limiting
    terraform apply -no-color -auto-approve -parallelism=5
```

For particularly large deployments:

```bash
# Split the apply into targeted batches
terraform apply -auto-approve -target=module.networking
sleep 30
terraform apply -auto-approve -target=module.database
sleep 30
terraform apply -auto-approve -target=module.compute
```

## Handling State Lock Failures

```yaml
- name: Terraform Apply with lock handling
  id: apply
  continue-on-error: true
  run: |
    cd terraform
    terraform apply -no-color -auto-approve -lock-timeout=300s

- name: Handle lock failure
  if: steps.apply.outcome == 'failure'
  run: |
    cd terraform

    # Check if the failure was due to a lock
    if terraform plan -no-color 2>&1 | grep -q "Error acquiring the state lock"; then
      echo "State lock contention detected"

      # Get lock info
      LOCK_INFO=$(terraform force-unlock -force 2>&1 | head -5 || echo "Could not get lock info")
      echo "Lock info: $LOCK_INFO"

      echo "Waiting for lock to be released..."
      sleep 120

      # Retry
      terraform apply -no-color -auto-approve -lock-timeout=300s
    fi
```

## Timeout Handling

```yaml
# Set job timeout
jobs:
  apply:
    timeout-minutes: 60  # Fail if the job takes more than 60 minutes

    steps:
      - name: Terraform Apply with resource timeout
        run: |
          cd terraform
          # Set a timeout for the apply command itself
          timeout 3600 terraform apply -no-color -auto-approve || {
            EXIT_CODE=$?
            if [ $EXIT_CODE -eq 124 ]; then
              echo "Terraform apply timed out after 60 minutes"
              echo "State may be partially applied. Review required."
            fi
            exit $EXIT_CODE
          }
```

## Automated Failure Notifications

```yaml
# .github/workflows/terraform-apply.yml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');

      let errorDetails = 'No details available';
      try {
        errorDetails = fs.readFileSync('terraform/apply-output.txt', 'utf8')
          .split('\n')
          .slice(-30)  // Last 30 lines
          .join('\n');
      } catch (e) {}

      // Create a GitHub issue for the failure
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `Terraform Apply Failed - ${new Date().toISOString().split('T')[0]}`,
        body: `## Terraform Apply Failure

        **Workflow:** ${context.workflow}
        **Run:** ${context.runId}
        **Commit:** ${context.sha}
        **Actor:** ${context.actor}

        ### Error Output (last 30 lines)
        \`\`\`
        ${errorDetails.substring(0, 60000)}
        \`\`\`

        ### Next Steps
        1. Review the error output above
        2. Check if this was a partial apply (some resources may have changed)
        3. Run \`terraform plan\` locally to assess the current state
        4. Fix the issue and re-run the pipeline
        `,
        labels: ['terraform-failure', 'needs-attention']
      });
```

## Pipeline Recovery Workflow

Create a dedicated recovery workflow for manual intervention:

```yaml
# .github/workflows/terraform-recovery.yml
name: Terraform Recovery

on:
  workflow_dispatch:
    inputs:
      action:
        description: "Recovery action"
        required: true
        type: choice
        options:
          - plan-only
          - retry-apply
          - targeted-apply
          - force-unlock
          - import-resource
      target:
        description: "Resource target (for targeted-apply or import)"
        required: false
        type: string
      lock_id:
        description: "Lock ID (for force-unlock)"
        required: false
        type: string

jobs:
  recover:
    runs-on: ubuntu-latest
    environment: recovery

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Execute recovery action
        run: |
          cd terraform
          terraform init -no-color

          case "${{ inputs.action }}" in
            plan-only)
              terraform plan -no-color
              ;;
            retry-apply)
              terraform apply -no-color -auto-approve
              ;;
            targeted-apply)
              terraform apply -no-color -auto-approve -target="${{ inputs.target }}"
              ;;
            force-unlock)
              terraform force-unlock -force "${{ inputs.lock_id }}"
              ;;
            import-resource)
              echo "Import requires manual specification of resource address and ID"
              echo "Example: terraform import aws_instance.web i-1234567890abcdef0"
              ;;
          esac
```

## Pre-Apply Safety Checks

Prevent some failures before they happen:

```yaml
- name: Pre-apply safety checks
  run: |
    cd terraform

    # Generate plan for analysis
    terraform plan -no-color -out=tfplan
    terraform show -json tfplan > plan.json

    # Check for potentially dangerous operations
    DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' plan.json)
    REPLACES=$(jq '[.resource_changes[] | select(.change.actions | contains(["delete","create"]))] | length' plan.json)

    echo "Resources to destroy: $DESTROYS"
    echo "Resources to replace: $REPLACES"

    # Block if too many destructive changes
    if [ "$DESTROYS" -gt 10 ]; then
      echo "ERROR: Plan wants to destroy $DESTROYS resources. This exceeds the safety threshold."
      echo "Review the plan manually before proceeding."
      exit 1
    fi

    # Warn on replacements
    if [ "$REPLACES" -gt 0 ]; then
      echo "WARNING: $REPLACES resources will be replaced (destroyed and recreated)"
      jq '.resource_changes[] | select(.change.actions | contains(["delete","create"])) | .address' plan.json
    fi
```

## Summary

Pipeline failures are not a matter of if but when. Build your Terraform CI/CD with failure handling from the start: classify errors automatically, retry transient failures, alert on persistent ones, and have recovery workflows ready for manual intervention. The most important thing is ensuring that partial applies are detected and the team is notified immediately, since a half-applied change is worse than no change at all.

For more on recovery, see our guide on [implementing rollback strategies in Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-rollback-strategies-in-terraform-cicd/view).

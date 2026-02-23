# How to Implement Rollback Strategies in Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Rollback, Recovery, DevOps, Infrastructure as Code

Description: Learn how to implement rollback strategies in Terraform CI/CD pipelines including git-based rollbacks, state-based recovery, targeted rollbacks, and automated rollback triggers.

---

Terraform does not have a built-in "undo" button. When an apply goes wrong, you need a strategy to get back to a known good state. Unlike application deployments where you can just redeploy the previous container image, infrastructure rollbacks require careful handling because resources may have dependencies, data may have been modified, and some changes are not reversible. This guide covers the practical rollback strategies for Terraform CI/CD.

## Why Terraform Rollbacks Are Hard

Several things make infrastructure rollbacks more complex than application rollbacks:

- **Stateful resources** - A database resize cannot be undone without downtime
- **Dependent resources** - Resources have creation and deletion ordering
- **Data loss risk** - Rolling back a database deletion means the data is gone
- **No built-in rollback** - Terraform plans forward, not backward
- **State file complexity** - The state file needs to match reality

The good news is that with the right patterns, you can make rollbacks reliable.

## Strategy 1: Git Revert

The simplest rollback strategy is reverting the Git commit and re-running the pipeline:

```yaml
# .github/workflows/rollback.yml
name: Terraform Rollback

on:
  workflow_dispatch:
    inputs:
      commit_to_revert:
        description: "Commit SHA to revert"
        required: true
        type: string
      reason:
        description: "Reason for rollback"
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: rollback-approval

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Revert the commit
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Revert the specified commit
          git revert --no-edit ${{ inputs.commit_to_revert }}

          # Push the revert commit
          git push origin main

          echo "Reverted commit ${{ inputs.commit_to_revert }}"
          echo "Reason: ${{ inputs.reason }}"

      # The push to main will trigger the normal apply workflow
```

Limitations of git revert:
- If the original change destroyed resources, those resources are gone
- If the original change modified data, the data may not be recoverable
- If multiple commits need reverting, ordering matters

## Strategy 2: Terraform State-Based Rollback

Use Terraform state versioning to recover from bad applies:

### S3 State Versioning

```hcl
# backend.tf - Ensure versioning is enabled
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```bash
# List state file versions
aws s3api list-object-versions \
  --bucket mycompany-terraform-state \
  --prefix production/terraform.tfstate \
  --query 'Versions[0:5].{VersionId:VersionId,Modified:LastModified,Size:Size}' \
  --output table

# Download a previous state version
aws s3api get-object \
  --bucket mycompany-terraform-state \
  --key production/terraform.tfstate \
  --version-id "abc123xyz" \
  previous-state.tfstate

# Review what was different
terraform show previous-state.tfstate | diff - <(terraform show)
```

### Rollback to Previous State

```yaml
# .github/workflows/state-rollback.yml
name: State-Based Rollback

on:
  workflow_dispatch:
    inputs:
      state_version_id:
        description: "S3 version ID of the state to restore"
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: emergency-rollback

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

      - name: Download previous state
        run: |
          aws s3api get-object \
            --bucket mycompany-terraform-state \
            --key production/terraform.tfstate \
            --version-id "${{ inputs.state_version_id }}" \
            previous-state.tfstate

      - name: Compare states
        run: |
          cd terraform
          terraform init -no-color

          echo "=== Current state resources ==="
          terraform state list | wc -l

          echo "=== Previous state resources ==="
          terraform show -json previous-state.tfstate | jq '.values.root_module.resources | length'

      - name: Restore previous state
        run: |
          # Upload the previous state as the current state
          aws s3 cp previous-state.tfstate \
            s3://mycompany-terraform-state/production/terraform.tfstate

          # Verify
          cd terraform
          terraform init -no-color
          terraform plan -no-color | head -50
```

## Strategy 3: Targeted Rollback

When only specific resources need to be rolled back:

```yaml
# .github/workflows/targeted-rollback.yml
name: Targeted Resource Rollback

on:
  workflow_dispatch:
    inputs:
      resources:
        description: "Comma-separated list of resource addresses to rollback"
        required: true
        type: string
        # Example: aws_instance.web,aws_security_group.app

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: rollback-approval

    steps:
      - uses: actions/checkout@v4
        with:
          ref: HEAD~1  # Checkout the previous commit

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Plan targeted rollback
        run: |
          cd terraform
          terraform init -no-color

          # Build target flags
          TARGETS=""
          IFS=',' read -ra RESOURCES <<< "${{ inputs.resources }}"
          for resource in "${RESOURCES[@]}"; do
            TARGETS="$TARGETS -target=$resource"
          done

          echo "Rolling back: ${{ inputs.resources }}"
          terraform plan -no-color $TARGETS | tee plan-output.txt

      - name: Apply targeted rollback
        run: |
          cd terraform
          terraform init -no-color

          TARGETS=""
          IFS=',' read -ra RESOURCES <<< "${{ inputs.resources }}"
          for resource in "${RESOURCES[@]}"; do
            TARGETS="$TARGETS -target=$resource"
          done

          terraform apply -no-color -auto-approve $TARGETS
```

## Strategy 4: Snapshot-Based Rollback

Before major changes, take snapshots of critical resources:

```yaml
# .github/workflows/terraform-apply.yml
- name: Pre-apply snapshots
  run: |
    # Snapshot RDS instances before changes
    TIMESTAMP=$(date +%Y%m%d%H%M%S)

    # Get all RDS instances from Terraform state
    cd terraform
    terraform state list | grep "aws_db_instance" | while read resource; do
      DB_ID=$(terraform state show "$resource" | grep "identifier" | head -1 | awk '{print $3}' | tr -d '"')

      if [ -n "$DB_ID" ]; then
        echo "Creating snapshot of $DB_ID"
        aws rds create-db-snapshot \
          --db-instance-identifier "$DB_ID" \
          --db-snapshot-identifier "${DB_ID}-pre-apply-${TIMESTAMP}" || true
      fi
    done

    # Snapshot EBS volumes
    terraform state list | grep "aws_ebs_volume\|aws_instance" | while read resource; do
      VOLUME_IDS=$(terraform state show "$resource" | grep "volume_id\|ebs_block" | grep "vol-" | awk '{print $3}' | tr -d '"')

      for vol_id in $VOLUME_IDS; do
        echo "Creating snapshot of $vol_id"
        aws ec2 create-snapshot \
          --volume-id "$vol_id" \
          --description "Pre-apply snapshot ${TIMESTAMP}" || true
      done
    done
```

## Strategy 5: Automated Rollback on Health Check Failure

```yaml
# .github/workflows/apply-with-rollback.yml
jobs:
  apply:
    runs-on: ubuntu-latest
    outputs:
      applied_commit: ${{ github.sha }}

    steps:
      - uses: actions/checkout@v4

      - name: Terraform Apply
        run: |
          cd terraform
          terraform init -no-color
          terraform apply -no-color -auto-approve

  health-check:
    needs: apply
    runs-on: ubuntu-latest
    steps:
      - name: Verify infrastructure health
        id: health
        continue-on-error: true
        run: |
          ENDPOINT="https://app.mycompany.com/health"
          MAX_ATTEMPTS=10
          ATTEMPT=1

          while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $ATTEMPT: status $STATUS"
            sleep 15
            ATTEMPT=$((ATTEMPT + 1))
          done

          echo "Health check failed after $MAX_ATTEMPTS attempts"
          exit 1

  auto-rollback:
    needs: health-check
    if: failure()
    runs-on: ubuntu-latest
    environment: emergency-rollback

    steps:
      - uses: actions/checkout@v4
        with:
          ref: HEAD~1  # Previous commit
          fetch-depth: 2

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Rollback to previous state
        run: |
          cd terraform
          terraform init -no-color
          echo "Rolling back to previous commit..."
          terraform apply -no-color -auto-approve

      - name: Notify team
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -d '{
              "text": "AUTOMATED ROLLBACK: Health checks failed after Terraform apply. Infrastructure has been rolled back to previous state."
            }'
```

## Preventing Irreversible Changes

Add safeguards to catch changes that cannot be easily rolled back:

```hcl
# lifecycle.tf - Prevent accidental destruction
resource "aws_db_instance" "main" {
  # ... configuration ...

  # Prevent Terraform from destroying this resource
  lifecycle {
    prevent_destroy = true
  }

  # Enable deletion protection at the AWS level
  deletion_protection = true
}

resource "aws_s3_bucket" "data" {
  bucket = "mycompany-production-data"

  lifecycle {
    prevent_destroy = true
  }
}
```

Check for irreversible changes in the pipeline:

```bash
# scripts/check-irreversible.sh
# Fail if plan includes destruction of protected resources

PROTECTED_TYPES="aws_db_instance aws_s3_bucket aws_dynamodb_table aws_efs_file_system"

terraform show -json tfplan > plan.json

for type in $PROTECTED_TYPES; do
  DESTROYS=$(jq -r ".resource_changes[] | select(.type == \"$type\") | select(.change.actions[] == \"delete\") | .address" plan.json)

  if [ -n "$DESTROYS" ]; then
    echo "ERROR: Plan includes destruction of protected resource type: $type"
    echo "Resources: $DESTROYS"
    echo "This change cannot be easily rolled back. Requires manual approval."
    exit 1
  fi
done

echo "No irreversible changes detected"
```

## Rollback Runbook

Document your rollback procedures so the team knows what to do under pressure:

```
TERRAFORM ROLLBACK RUNBOOK

1. ASSESS
   - What changed? Check the Git commit
   - Is this a partial apply? Check terraform plan output
   - Is data at risk? Check if databases/storage were affected

2. CHOOSE STRATEGY
   - Simple config change -> Git revert + re-apply
   - Partial apply -> Retry the apply
   - Bad state -> Restore from S3 version
   - Specific resources -> Targeted rollback

3. EXECUTE
   - Use the rollback workflow: Actions > Terraform Rollback > Run
   - For emergencies: Use the emergency-rollback environment

4. VERIFY
   - Run terraform plan to confirm no drift
   - Check application health endpoints
   - Review monitoring dashboards

5. POST-MORTEM
   - Document what went wrong
   - Update rollback procedures if needed
```

## Summary

Terraform rollbacks require planning ahead. Enable state versioning so you always have previous states to fall back to. Use git reverts for simple config rollbacks. Build targeted rollback workflows for specific resources. Add automated rollback triggers tied to health checks. Most importantly, use `lifecycle { prevent_destroy = true }` on stateful resources to prevent irreversible destruction.

For more on failure handling, see our guide on [handling Terraform CI/CD pipeline failures](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-cicd-pipeline-failures/view).

# How to Debug Terraform CI/CD Pipeline Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Debugging, Troubleshooting, DevOps, Infrastructure as Code

Description: Practical debugging techniques for common Terraform CI/CD pipeline failures including authentication errors, state locks, provider issues, and timeout problems.

---

Terraform pipelines fail in ways that are often different from local failures. You can't just SSH into the runner and poke around. The error messages are sometimes buried in hundreds of lines of output. And the problem might be in authentication, state locking, network connectivity, or a dozen other places that work fine on your laptop but break in CI.

This post is a troubleshooting guide for the most common Terraform CI/CD failures.

## Enable Debug Logging

The first step for any pipeline issue is enabling Terraform's debug output:

```yaml
# .github/workflows/terraform-debug.yml
- name: Terraform Plan (debug)
  env:
    TF_LOG: DEBUG              # Options: TRACE, DEBUG, INFO, WARN, ERROR
    TF_LOG_PATH: /tmp/terraform-debug.log
  run: |
    terraform plan -no-color 2>&1 | tee plan-output.txt

# Upload debug log as artifact for analysis
- name: Upload Debug Log
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: terraform-debug-log
    path: /tmp/terraform-debug.log
    retention-days: 3
```

For provider-specific issues:

```yaml
env:
  TF_LOG: DEBUG
  TF_LOG_PROVIDER: DEBUG     # Extra logging for provider operations
  # Or target specific provider
  TF_LOG_PROVIDER_AWS: DEBUG
```

## Authentication Failures

The most common CI/CD failure. Symptoms:

```text
Error: error configuring Terraform AWS Provider: no valid credential sources found
```

Debugging steps:

```yaml
- name: Debug Authentication
  run: |
    echo "=== Environment Variables ==="
    # Check if expected vars are set (values masked)
    echo "AWS_ACCESS_KEY_ID set: ${AWS_ACCESS_KEY_ID:+yes}"
    echo "AWS_SECRET_ACCESS_KEY set: ${AWS_SECRET_ACCESS_KEY:+yes}"
    echo "AWS_SESSION_TOKEN set: ${AWS_SESSION_TOKEN:+yes}"
    echo "AWS_ROLE_ARN set: ${AWS_ROLE_ARN:+yes}"
    echo "AWS_REGION: ${AWS_REGION:-not set}"
    echo "AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION:-not set}"

    echo ""
    echo "=== AWS Identity ==="
    aws sts get-caller-identity 2>&1 || echo "STS call failed"

    echo ""
    echo "=== Credential File ==="
    ls -la ~/.aws/ 2>/dev/null || echo "No .aws directory"
    test -f ~/.aws/credentials && echo "credentials file exists" || echo "no credentials file"

    echo ""
    echo "=== OIDC Token ==="
    # For OIDC debugging
    if [ -n "$ACTIONS_ID_TOKEN_REQUEST_URL" ]; then
      echo "OIDC endpoint available"
    else
      echo "OIDC endpoint NOT available - check permissions.id-token: write"
    fi
```

Common fixes:

```yaml
# Fix 1: Missing permissions block for OIDC
permissions:
  id-token: write    # Required! Often forgotten
  contents: read

# Fix 2: Wrong role ARN or trust policy
# Check the trust policy allows the specific repo/branch

# Fix 3: Region not set
env:
  AWS_REGION: us-east-1  # Explicitly set region
```

## State Lock Issues

```text
Error: Error acquiring the state lock
```

This happens when a previous run didn't release the lock (crash, timeout, manual cancel):

```yaml
- name: Handle State Lock
  run: |
    # Try plan first
    terraform plan -no-color 2>&1 | tee plan-output.txt
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ] && grep -q "Error acquiring the state lock" plan-output.txt; then
      echo "State lock detected"

      # Extract lock ID
      LOCK_ID=$(grep -oP 'ID:\s+\K[a-f0-9-]+' plan-output.txt)
      echo "Lock ID: $LOCK_ID"

      # Option 1: Wait and retry
      echo "Waiting 60 seconds for lock to clear..."
      sleep 60
      terraform plan -no-color -out=tfplan

      # Option 2: Force unlock (use with caution)
      # Only do this if you're sure no other operation is running
      # terraform force-unlock -force "$LOCK_ID"
    fi
```

## Init Failures

### Provider Download Issues

```text
Error: Failed to query available provider packages
```

```yaml
- name: Debug Init
  run: |
    echo "=== Network Connectivity ==="
    # Check registry access
    curl -sI https://registry.terraform.io/v1/providers/hashicorp/aws/versions | head -5
    echo ""

    # Check DNS resolution
    nslookup registry.terraform.io
    echo ""

    echo "=== Disk Space ==="
    df -h /
    echo ""

    echo "=== Lock File ==="
    cat .terraform.lock.hcl | head -20
    echo ""

    echo "=== Init with Trace ==="
    TF_LOG=TRACE terraform init -no-color 2>&1 | tail -50
```

### Lock File Hash Mismatch

```text
Error: Failed to install provider - the current .terraform.lock.hcl
includes hashes for only darwin_arm64
```

Fix in CI:

```yaml
# Temporary fix: allow lock file updates in CI
- name: Terraform Init (fix lock file)
  run: |
    terraform init
    # Then regenerate lock file with CI platform
    terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
  # Proper fix: regenerate locally and commit
```

## Plan Failures

### Refresh Errors

```text
Error: error reading EC2 Instance: InvalidInstanceID.NotFound
```

Resources deleted outside Terraform cause refresh errors:

```yaml
- name: Handle Refresh Errors
  run: |
    terraform plan -no-color 2>&1 | tee plan-output.txt
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ] && grep -q "InvalidInstanceID.NotFound" plan-output.txt; then
      echo "Resource not found - likely deleted outside Terraform"
      echo "Options:"
      echo "1. terraform state rm <resource_address> (remove from state)"
      echo "2. terraform apply -refresh-only (refresh state to match reality)"

      # List problem resources
      grep -B2 "NotFound" plan-output.txt
    fi
```

### Timeout During Plan

```yaml
- name: Terraform Plan with Timeout
  timeout-minutes: 15
  run: |
    # Set explicit timeout
    terraform plan -out=tfplan -no-color

    # If plan consistently times out, check:
    # 1. Number of resources (terraform state list | wc -l)
    # 2. Parallelism (try increasing with -parallelism=30)
    # 3. API rate limiting (check provider logs)
```

## Apply Failures

### Partial Apply Recovery

When apply fails midway, some resources are created and others are not:

```yaml
- name: Terraform Apply with Recovery
  id: apply
  run: |
    terraform apply -auto-approve tfplan -no-color 2>&1 | tee apply-output.txt
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
      echo "Apply failed. Checking state..."

      # Show what was applied
      echo "=== Resources in State ==="
      terraform state list

      # Show what failed
      echo "=== Error Details ==="
      grep -A5 "Error:" apply-output.txt

      exit $EXIT_CODE
    fi

- name: On Apply Failure
  if: failure() && steps.apply.outcome == 'failure'
  run: |
    echo "Apply failed. Options:"
    echo "1. Fix the error and re-run the pipeline"
    echo "2. Run 'terraform plan' to see the current delta"
    echo "3. If resources are in a bad state, manual intervention may be needed"

    # Notify the team
    curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
      -d '{"text": "Terraform apply failed in production. Manual review needed."}'
```

## Runner-Specific Issues

### Disk Space

```yaml
- name: Check Disk Before Init
  run: |
    USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    echo "Disk usage: ${USAGE}%"

    if [ "$USAGE" -gt 85 ]; then
      echo "WARNING: Low disk space. Cleaning up..."
      # Clear old provider cache
      rm -rf /tmp/terraform-*
      rm -rf ~/.terraform.d/plugin-cache/*
      docker system prune -f 2>/dev/null || true
    fi
```

### Memory Issues with Large States

```yaml
- name: Check Memory
  run: |
    free -h
    echo ""

    # If OOM kills happen, consider:
    # 1. Using a larger runner
    # 2. Splitting the state into smaller pieces
    # 3. Reducing parallelism to lower memory usage
```

## Structured Error Reporting

Create a comprehensive error report when things fail:

```yaml
- name: Generate Failure Report
  if: failure()
  run: |
    cat > failure-report.json << EOF
    {
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "pipeline": "${{ github.run_id }}",
      "commit": "${{ github.sha }}",
      "actor": "${{ github.actor }}",
      "step": "${{ github.action }}",
      "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
      "provider_versions": $(terraform version -json | jq '.provider_selections'),
      "resource_count": $(terraform state list 2>/dev/null | wc -l),
      "error_summary": "$(grep 'Error:' plan-output.txt 2>/dev/null || echo 'unknown')"
    }
    EOF

    cat failure-report.json

- name: Upload Failure Report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: failure-report-${{ github.run_id }}
    path: |
      failure-report.json
      plan-output.txt
      /tmp/terraform-debug.log
```

## Quick Reference: Common Errors

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| No valid credential sources | Missing/expired credentials | Check OIDC permissions, role ARN |
| Error acquiring state lock | Previous run didn't clean up | Wait or force-unlock |
| Provider hash mismatch | Lock file missing CI platform | Run `terraform providers lock` |
| Resource not found on refresh | Deleted outside Terraform | `terraform state rm` or refresh-only |
| Timeout during plan | Too many resources | Split state, increase parallelism |
| Rate limit exceeded | Too many API calls | Reduce parallelism, add retries |

## Summary

Debugging Terraform CI/CD pipeline issues:

1. Enable debug logging with `TF_LOG=DEBUG` and save logs as artifacts
2. Check authentication first - it is the most common failure point
3. Handle state locks gracefully with retry logic
4. Verify lock file has hashes for the CI platform
5. Build structured error reporting for faster triage
6. Keep a runbook of common errors and their fixes

The key to efficient debugging is good observability - capture logs, save artifacts, and report errors in a structured format. For monitoring your pipelines proactively, see [Terraform CI/CD pipeline monitoring](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pipeline-monitoring/view).

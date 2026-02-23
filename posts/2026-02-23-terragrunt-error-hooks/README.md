# How to Use Terragrunt Error Hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Error Hooks, Error Handling, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt error hooks to handle failures gracefully with automatic notifications, cleanup actions, retry logic, and diagnostic data collection.

---

When Terraform fails during a plan or apply, you usually want to do more than just see the error message. Maybe you need to send an alert, clean up partial resources, collect diagnostic data, or run a compensating action. Terragrunt's error hooks and the `run_on_error` flag on after_hooks let you automate these responses to failures.

## Understanding Error Handling in Terragrunt

Terragrunt has several mechanisms for error handling:

1. **after_hook with run_on_error**: Runs after Terraform commands, optionally on failures
2. **error_hook**: Dedicated hook that only runs when specific errors occur
3. **retryable_errors**: Automatic retry for known transient errors
4. **retry configuration**: Control retry count and interval

Let's cover each one in detail.

## after_hook with run_on_error

The simplest way to handle errors is the `run_on_error` flag on after_hooks:

```hcl
terraform {
  source = "../../modules/app"

  # This hook runs ONLY when terraform succeeds (default behavior)
  after_hook "success_notification" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Apply succeeded' | notify-team"]
    run_on_error = false    # Default
  }

  # This hook runs ONLY when terraform fails
  after_hook "failure_notification" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Apply FAILED for $(pwd)' | notify-team"]
    run_on_error = true
  }
}
```

Wait - that's not quite right. When `run_on_error = true`, the hook runs on both success and failure. To run a hook only on failure, you need a wrapper script:

```bash
#!/bin/bash
# scripts/on-error-only.sh
# This script checks if the previous command failed
# It's called by an after_hook with run_on_error=true

# The exit code is passed as an environment variable
if [ "${TG_CTX_TF_EXIT_CODE:-0}" != "0" ]; then
  echo "Terraform failed with exit code $TG_CTX_TF_EXIT_CODE"
  # Do your error handling here
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"Terraform apply failed in $(pwd)\"}"
fi
```

```hcl
terraform {
  after_hook "on_error" {
    commands     = ["apply"]
    execute      = ["bash", "scripts/on-error-only.sh"]
    run_on_error = true
  }
}
```

## The error_hook Block

Terragrunt also provides `error_hook` blocks that run when specific error patterns are matched:

```hcl
terraform {
  source = "../../modules/ecs"

  error_hook "access_denied" {
    commands = ["plan", "apply"]
    on_errors = [
      "AccessDenied",
      "UnauthorizedAccess"
    ]
    execute = ["bash", "-c", "echo 'Permission error detected. Check IAM roles.'"]
  }

  error_hook "rate_limit" {
    commands = ["apply"]
    on_errors = [
      "Throttling",
      "Rate exceeded"
    ]
    execute = ["bash", "-c", "echo 'Rate limited by AWS. Will retry automatically.'"]
  }
}
```

The `on_errors` field is a list of regex patterns that match against the Terraform error output.

## Automatic Retries for Transient Errors

Cloud provider APIs sometimes fail with transient errors - rate limiting, temporary network issues, or eventual consistency delays. Terragrunt can retry automatically:

```hcl
# root terragrunt.hcl - apply to all modules

retryable_errors = [
  # AWS rate limiting
  "(?s).*Error:.*Throttling.*",
  "(?s).*Error:.*Rate exceeded.*",
  "(?s).*Error:.*RequestLimitExceeded.*",

  # Network issues
  "(?s).*Error:.*connection reset by peer.*",
  "(?s).*Error:.*TLS handshake timeout.*",
  "(?s).*Error:.*timeout while waiting.*",

  # AWS eventual consistency
  "(?s).*Error creating.*NotFound.*",
  "(?s).*Error:.*InvalidParameterValue.*",
  "(?s).*Error:.*OperationNotPermitted.*try again.*",

  # Terraform state locking
  "(?s).*Error acquiring the state lock.*",
  "(?s).*Error locking state.*"
]

# Retry up to 3 times
retry_max_attempts = 3

# Wait 30 seconds between retries
retry_sleep_interval_sec = 30
```

## Combining Retries with Error Hooks

Use error hooks to add context when retries happen:

```hcl
retryable_errors = [
  "(?s).*Error:.*Throttling.*",
  "(?s).*Error:.*Rate exceeded.*"
]

retry_max_attempts       = 3
retry_sleep_interval_sec = 60

terraform {
  # Log when throttling occurs
  error_hook "throttle_warning" {
    commands  = ["apply"]
    on_errors = ["Throttling", "Rate exceeded"]
    execute   = [
      "bash", "-c",
      "echo '[WARN] AWS throttling detected at $(date). Terragrunt will retry.' >> /tmp/terragrunt-throttle.log"
    ]
  }
}
```

## Practical Example: Slack Notification on Failure

```hcl
terraform {
  source = "../../modules/production-app"

  after_hook "failure_alert" {
    commands     = ["apply", "destroy"]
    run_on_error = true
    execute      = [
      "bash", "-c",
      <<-SCRIPT
      # Only alert on actual failures
      if [ "$?" != "0" ] 2>/dev/null; then
        MODULE_PATH=$(basename $(pwd))
        TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        curl -s -X POST "${SLACK_WEBHOOK_URL}" \
          -H 'Content-Type: application/json' \
          -d "{
            \"blocks\": [{
              \"type\": \"section\",
              \"text\": {
                \"type\": \"mrkdwn\",
                \"text\": \"*Terraform Apply Failed*\nModule: \`$MODULE_PATH\`\nTime: $TIMESTAMP\nCI Job: ${CI_JOB_URL:-local}\"
              }
            }]
          }"
      fi
      SCRIPT
    ]
  }
}
```

## Practical Example: Collecting Diagnostics

When a failure occurs, collect diagnostic information:

```hcl
terraform {
  after_hook "collect_diagnostics" {
    commands     = ["apply"]
    run_on_error = true
    execute      = [
      "bash", "-c",
      <<-SCRIPT
      DIAG_DIR="/tmp/terraform-diagnostics/$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$DIAG_DIR"

      # Save Terraform state info
      terraform state list > "$DIAG_DIR/state-list.txt" 2>&1 || true

      # Save provider versions
      terraform version -json > "$DIAG_DIR/versions.json" 2>&1 || true

      # Save the current plan if it exists
      if [ -f tfplan ]; then
        terraform show -json tfplan > "$DIAG_DIR/plan.json" 2>&1 || true
      fi

      # Save environment info
      env | grep -E "^(AWS_|TF_|TERRAGRUNT_)" > "$DIAG_DIR/env-vars.txt" 2>&1 || true

      echo "Diagnostics saved to $DIAG_DIR"
      SCRIPT
    ]
  }
}
```

## Practical Example: State Rollback on Failed Apply

If an apply partially fails, you might want to record what state was applied for manual recovery:

```hcl
terraform {
  # Save state before apply for potential rollback reference
  before_hook "pre_apply_state_snapshot" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      "terraform state pull > /tmp/pre-apply-state-$(date +%s).json"
    ]
  }

  # On failure, note which resources were partially created
  after_hook "post_apply_failure_check" {
    commands     = ["apply"]
    run_on_error = true
    execute      = [
      "bash", "-c",
      <<-SCRIPT
      echo "Checking for partially applied resources..."
      CURRENT_RESOURCES=$(terraform state list 2>/dev/null | wc -l)
      PRE_APPLY=$(cat /tmp/pre-apply-state-*.json 2>/dev/null | jq '.resources | length')
      echo "Resources before apply: ${PRE_APPLY:-unknown}"
      echo "Resources after apply: ${CURRENT_RESOURCES}"
      SCRIPT
    ]
  }
}
```

## Error Hooks in CI/CD Pipelines

Integrate error hooks with your CI/CD pipeline's failure handling:

```hcl
terraform {
  after_hook "ci_failure_handler" {
    commands     = ["plan", "apply"]
    run_on_error = true
    execute      = [
      "bash", "-c",
      <<-SCRIPT
      # Create a failure artifact for CI
      if [ -n "$CI" ]; then
        mkdir -p /tmp/failure-artifacts
        echo "Module: $(pwd)" > /tmp/failure-artifacts/failure-context.txt
        echo "Command: $TERRAGRUNT_COMMAND" >> /tmp/failure-artifacts/failure-context.txt
        echo "Timestamp: $(date -u)" >> /tmp/failure-artifacts/failure-context.txt

        # If this is a GitHub Actions runner, set an output
        if [ -n "$GITHUB_OUTPUT" ]; then
          echo "failed=true" >> "$GITHUB_OUTPUT"
          echo "failed_module=$(basename $(pwd))" >> "$GITHUB_OUTPUT"
        fi
      fi
      SCRIPT
    ]
  }
}
```

## Global Error Handling in Root Config

Define error handling once in the root `terragrunt.hcl` to apply across all modules:

```hcl
# root terragrunt.hcl

# Retry transient errors automatically
retryable_errors = [
  "(?s).*Throttling.*",
  "(?s).*Rate exceeded.*",
  "(?s).*connection reset.*",
  "(?s).*TLS handshake timeout.*"
]
retry_max_attempts       = 3
retry_sleep_interval_sec = 30

terraform {
  # Global error notification
  after_hook "global_error_handler" {
    commands     = ["apply", "destroy"]
    run_on_error = true
    execute      = ["bash", "${get_repo_root()}/scripts/handle-error.sh"]
  }
}
```

```bash
#!/bin/bash
# scripts/handle-error.sh
# Called by the global error handler after any apply/destroy

MODULE_NAME=$(basename "$(pwd)")
ENVIRONMENT=$(basename "$(dirname "$(pwd)")")

echo "Error handler triggered for $ENVIRONMENT/$MODULE_NAME"

# Add your error handling logic here:
# - Send alerts
# - Create incident tickets
# - Upload logs
# - Trigger rollback procedures
```

## Testing Error Hooks

You can test error hooks by deliberately causing a failure:

```bash
# Create a module that will fail
mkdir -p /tmp/test-error-hook
cat > /tmp/test-error-hook/main.tf <<EOF
resource "null_resource" "fail" {
  provisioner "local-exec" {
    command = "exit 1"
  }
}
EOF

# Create a terragrunt.hcl with error hooks
cat > /tmp/test-error-hook/terragrunt.hcl <<EOF
terraform {
  after_hook "test_error" {
    commands     = ["apply"]
    run_on_error = true
    execute      = ["echo", "Error hook fired successfully"]
  }
}
EOF

# Run it
cd /tmp/test-error-hook
terragrunt apply -auto-approve
# The null_resource will fail, and the error hook should fire
```

## Summary

Error hooks in Terragrunt give you automated responses to infrastructure failures. The most practical uses are notifications (Slack, PagerDuty), diagnostic collection, and automatic retries for transient cloud API errors. Define retryable errors and global error handlers in your root `terragrunt.hcl`, and add module-specific handlers where critical infrastructure needs extra attention. For more on hooks in general, see our [Terragrunt hooks guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-hooks-before-after/view).

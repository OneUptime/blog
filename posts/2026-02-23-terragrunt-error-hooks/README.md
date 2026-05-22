# How to Use Terragrunt Error Hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Error Hooks, Error Handling, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt error hooks to handle failures gracefully with automatic notifications, cleanup actions, retry logic, and diagnostic data collection.

---

When Terraform fails during a plan or apply, you usually want to do more than just see the error message. Maybe you need to send an alert, clean up partial resources, collect diagnostic data, or run a compensating action. Terragrunt's error hooks, retry configuration, and the `run_on_error` flag on after_hooks let you automate these responses to failures.

## Understanding Error Handling in Terragrunt

Terragrunt has several mechanisms for error handling:

1. **after_hook with run_on_error**: Runs after Terraform commands, optionally on failures
2. **error_hook**: Dedicated hook that only runs when specific errors occur
3. **errors retry blocks**: Automatic retry for known transient errors
4. **retry configuration**: Control retry count and interval

Let's cover each one in detail.

## after_hook with run_on_error

The simplest way to run cleanup after a failed command is the `run_on_error` flag on after_hooks:

```hcl
terraform {
  source = "../../modules/app"

  # This hook runs after terraform succeeds (default behavior)
  after_hook "success_notification" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Apply succeeded' | notify-team"]
    run_on_error = false    # Default
  }

  # This hook runs after terraform finishes, even when terraform fails
  after_hook "cleanup" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "rm -f /tmp/terragrunt-apply-lock"]
    run_on_error = true
  }
}
```

When `run_on_error = true`, the hook runs whether the Terraform command succeeds or fails. To run a hook only on failure, use an `error_hook`:

```hcl
terraform {
  error_hook "on_error" {
    commands  = ["apply"]
    on_errors = [".*"]
    execute   = [
      "bash", "-c",
      "curl -X POST \"$SLACK_WEBHOOK\" -H 'Content-Type: application/json' -d \"{\\\"text\\\":\\\"Terraform apply failed in $(pwd)\\\"}\""
    ]
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

errors {
  retry "transient_errors" {
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
    max_attempts = 3

    # Wait 30 seconds between retries
    sleep_interval_sec = 30
  }
}
```

## Combining Retries with Error Hooks

Use error hooks to add context when matching retryable errors occur:

```hcl
errors {
  retry "aws_throttling" {
    retryable_errors = [
      "(?s).*Error:.*Throttling.*",
      "(?s).*Error:.*Rate exceeded.*"
    ]

    max_attempts       = 3
    sleep_interval_sec = 60
  }
}

terraform {
  # Log when throttling occurs
  error_hook "throttle_warning" {
    commands  = ["apply"]
    on_errors = ["Throttling", "Rate exceeded"]
    execute   = [
      "bash", "-c",
      "echo '[WARN] AWS throttling detected at $(date). Terragrunt is configured to retry this error.' >> /tmp/terragrunt-throttle.log"
    ]
  }
}
```

## Practical Example: Slack Notification on Failure

```hcl
terraform {
  source = "../../modules/production-app"

  error_hook "failure_alert" {
    commands  = ["apply", "destroy"]
    on_errors = [".*"]
    execute   = [
      "bash", "-c",
      <<-SCRIPT
      MODULE_PATH=$(basename "$(pwd)")
      TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      curl -s -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "{
          \"blocks\": [{
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*Terraform Apply Failed*\nModule: \`$MODULE_PATH\`\nCommand: $TG_CTX_COMMAND\nTime: $TIMESTAMP\nCI Job: ${CI_JOB_URL:-local}\"
            }
          }]
        }"
      SCRIPT
    ]
  }
}
```

## Practical Example: Collecting Diagnostics

When a failure occurs, collect diagnostic information:

```hcl
terraform {
  error_hook "collect_diagnostics" {
    commands  = ["apply"]
    on_errors = [".*"]
    execute   = [
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
  error_hook "post_apply_failure_check" {
    commands  = ["apply"]
    on_errors = [".*"]
    execute   = [
      "bash", "-c",
      <<-SCRIPT
      echo "Checking for partially applied resources..."
      CURRENT_RESOURCES=$(terraform state list 2>/dev/null | wc -l)
      PRE_APPLY_FILE=$(ls -t /tmp/pre-apply-state-*.json 2>/dev/null | head -n1)
      PRE_APPLY=$(jq '.resources | length' "$PRE_APPLY_FILE" 2>/dev/null || true)
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
  error_hook "ci_failure_handler" {
    commands  = ["plan", "apply"]
    on_errors = [".*"]
    execute   = [
      "bash", "-c",
      <<-SCRIPT
      # Create a failure artifact for CI
      if [ -n "$CI" ]; then
        mkdir -p /tmp/failure-artifacts
        echo "Module: $(pwd)" > /tmp/failure-artifacts/failure-context.txt
        echo "Command: $TG_CTX_COMMAND" >> /tmp/failure-artifacts/failure-context.txt
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

errors {
  retry "transient_errors" {
    retryable_errors = [
      "(?s).*Throttling.*",
      "(?s).*Rate exceeded.*",
      "(?s).*connection reset.*",
      "(?s).*TLS handshake timeout.*"
    ]

    max_attempts       = 3
    sleep_interval_sec = 30
  }
}

terraform {
  # Global error notification
  error_hook "global_error_handler" {
    commands  = ["apply", "destroy"]
    on_errors = [".*"]
    execute   = ["bash", "${get_repo_root()}/scripts/handle-error.sh"]
  }
}
```

```bash
#!/bin/bash
# scripts/handle-error.sh
# Called by the global error handler after a failed apply/destroy

MODULE_NAME=$(basename "$(pwd)")
ENVIRONMENT=$(basename "$(dirname "$(pwd)")")
COMMAND="${TG_CTX_COMMAND:-unknown}"

echo "Error handler triggered for $ENVIRONMENT/$MODULE_NAME during $COMMAND"

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
  error_hook "test_error" {
    commands  = ["apply"]
    on_errors = [".*"]
    execute   = ["echo", "Error hook fired successfully"]
  }
}
EOF

# Run it
cd /tmp/test-error-hook
terragrunt apply -auto-approve
# The null_resource will fail, and the error hook should fire
```

## Summary

Error hooks in Terragrunt give you automated responses to infrastructure failures. The most practical uses are notifications (Slack, PagerDuty), diagnostic collection, and automatic retries for transient cloud API errors. Define retry rules and global error handlers in your root `terragrunt.hcl`, and add module-specific handlers where critical infrastructure needs extra attention. For more on hooks in general, see our [Terragrunt hooks guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-hooks-before-after/view).

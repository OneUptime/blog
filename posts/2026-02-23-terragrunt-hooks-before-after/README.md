# How to Use Terragrunt Hooks (before_hook and after_hook)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Hooks, Automation, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt before_hook and after_hook to run custom commands before and after Terraform operations, with practical examples for validation, notifications, and cleanup.

---

Terragrunt hooks let you run arbitrary commands before or after Terraform executes. This is useful for things like running linters before a plan, sending Slack notifications after an apply, generating files that Terraform needs, or cleaning up temporary resources. Hooks are configured directly in your `terragrunt.hcl` and run in the context of the Terraform working directory.

## Basic Hook Syntax

Hooks are defined inside the `terraform` block:

```hcl
# terragrunt.hcl
terraform {
  source = "../../modules/vpc"

  # Runs before Terraform commands
  before_hook "before_plan" {
    commands = ["plan"]
    execute  = ["echo", "Starting plan for VPC module"]
  }

  # Runs after Terraform commands
  after_hook "after_apply" {
    commands = ["apply"]
    execute  = ["echo", "Apply completed successfully"]
  }
}
```

The `commands` list specifies which Terraform commands trigger the hook. The `execute` list is the command and its arguments, similar to how you'd pass them to `exec`.

## Hook Execution Order

When you run `terragrunt plan`, the execution order is:

1. All `before_hook` blocks matching the `plan` command (in order of definition)
2. `terraform plan`
3. All `after_hook` blocks matching the `plan` command (in order of definition)

```hcl
terraform {
  source = "../../modules/app"

  # These run in definition order
  before_hook "step_1" {
    commands = ["plan", "apply"]
    execute  = ["echo", "Step 1: Checking prerequisites"]
  }

  before_hook "step_2" {
    commands = ["plan", "apply"]
    execute  = ["echo", "Step 2: Generating configs"]
  }

  # Terraform runs here

  after_hook "step_3" {
    commands = ["plan", "apply"]
    execute  = ["echo", "Step 3: Cleanup"]
  }
}
```

## Practical Example: Running tflint Before Plan

One of the most common uses is running a linter before planning:

```hcl
terraform {
  source = "../../modules/vpc"

  before_hook "tflint" {
    commands = ["plan"]
    execute  = ["tflint", "--init"]
  }

  before_hook "tflint_run" {
    commands = ["plan"]
    execute  = ["tflint", "--format", "compact"]
  }
}
```

If `tflint` exits with a non-zero code, Terragrunt will stop and not run the plan. This is the default behavior - hooks that fail prevent the Terraform command from running.

## Practical Example: Terraform fmt Check

Enforce formatting before plan or apply:

```hcl
terraform {
  source = "../../modules/ecs"

  before_hook "fmt_check" {
    commands = ["plan", "apply"]
    execute  = ["terraform", "fmt", "-check", "-diff", "-recursive"]
  }
}
```

## Practical Example: Slack Notification After Apply

Send a notification when infrastructure changes are applied:

```hcl
terraform {
  source = "../../modules/production"

  after_hook "slack_notify" {
    commands     = ["apply"]
    execute      = [
      "bash", "-c",
      "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"Terraform apply completed for production\"}' $SLACK_WEBHOOK_URL"
    ]
    run_on_error = false    # Don't notify if apply failed
  }
}
```

The `run_on_error` flag controls whether the after_hook runs when Terraform exits with an error. The default is `false`, meaning after hooks only run on success.

## Practical Example: Generating Dynamic Files

Sometimes you need to generate files that Terraform will use:

```hcl
terraform {
  source = "../../modules/k8s"

  # Generate a values file from a template before applying
  before_hook "generate_values" {
    commands = ["plan", "apply"]
    execute  = [
      "bash", "-c",
      "envsubst < values.tmpl.yaml > values.yaml"
    ]
  }
}
```

## Using Working Directory

By default, hooks run in the Terragrunt working directory (where the downloaded Terraform source lives). You can change this:

```hcl
terraform {
  source = "../../modules/app"

  before_hook "run_tests" {
    commands       = ["apply"]
    execute        = ["go", "test", "./..."]
    working_dir    = "/path/to/test/directory"
  }
}
```

## Running Hooks on All Commands

Use the special `terragrunt-read-config` command to run hooks whenever Terragrunt reads the configuration, regardless of which Terraform command runs:

```hcl
terraform {
  source = "../../modules/vpc"

  # This runs before ANY Terraform command
  before_hook "always_run" {
    commands = ["terragrunt-read-config"]
    execute  = ["echo", "Terragrunt is processing this module"]
  }
}
```

For hooks that should trigger on multiple commands:

```hcl
terraform {
  source = "../../modules/app"

  before_hook "validate_inputs" {
    commands = ["plan", "apply", "destroy"]
    execute  = ["bash", "scripts/validate-inputs.sh"]
  }
}
```

## Hooks in Root Configuration

Define hooks in the root `terragrunt.hcl` to apply them to all modules:

```hcl
# root terragrunt.hcl
terraform {
  # These hooks apply to every child module that includes this root

  before_hook "check_credentials" {
    commands = ["plan", "apply", "destroy"]
    execute  = ["bash", "-c", "aws sts get-caller-identity > /dev/null"]
  }

  after_hook "log_completion" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      "echo \"$(date): Apply completed in $(pwd)\" >> /tmp/terragrunt-audit.log"
    ]
    run_on_error = true    # Log even on failure
  }
}
```

## Handling Hook Failures

By default, a failing before_hook prevents Terraform from running. You can change this behavior:

```hcl
terraform {
  source = "../../modules/app"

  # This hook failing will stop the plan
  before_hook "critical_check" {
    commands = ["plan"]
    execute  = ["bash", "scripts/mandatory-check.sh"]
  }

  # This is informational - don't block on failure
  before_hook "optional_check" {
    commands = ["plan"]
    execute  = ["bash", "scripts/optional-lint.sh"]
  }
}
```

Currently, Terragrunt doesn't have a built-in "continue on failure" flag for before_hooks. If you need a hook that shouldn't block execution, wrap it in a script that always exits 0:

```bash
#!/bin/bash
# scripts/optional-lint.sh
tflint --format compact || echo "Linting warnings found (non-blocking)"
exit 0
```

## Hooks with Environment Variables

Hooks inherit the environment variables from the Terragrunt process:

```hcl
terraform {
  source = "../../modules/app"

  before_hook "setup_env" {
    commands = ["plan", "apply"]
    execute  = [
      "bash", "-c",
      "echo \"Running in environment: $ENVIRONMENT, region: $AWS_REGION\""
    ]
  }
}
```

You can also use Terragrunt locals in hook commands through string interpolation:

```hcl
locals {
  environment = "production"
  module_name = "vpc"
}

terraform {
  source = "../../modules/vpc"

  after_hook "audit" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      "echo 'Applied ${local.module_name} in ${local.environment}' >> /var/log/terraform-audit.log"
    ]
  }
}
```

## Practical Example: Backup State Before Apply

A safety measure for critical modules:

```hcl
terraform {
  source = "../../modules/database"

  before_hook "backup_state" {
    commands = ["apply", "destroy"]
    execute  = [
      "bash", "-c",
      "terraform state pull > /tmp/state-backup-$(date +%Y%m%d-%H%M%S).json"
    ]
  }
}
```

## Practical Example: Run Terratest After Apply

Trigger integration tests after infrastructure is created:

```hcl
terraform {
  source = "../../modules/network"

  after_hook "integration_test" {
    commands     = ["apply"]
    execute      = ["go", "test", "-v", "-timeout", "30m", "./tests/"]
    working_dir  = "${get_terragrunt_dir()}/tests"
    run_on_error = false
  }
}
```

## Practical Example: Cost Estimation

Run a cost estimation tool before apply:

```hcl
terraform {
  source = "../../modules/compute"

  before_hook "cost_estimate" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      "terraform show -json tfplan | infracost diff --path /dev/stdin"
    ]
  }
}
```

## Debugging Hooks

If a hook isn't running or isn't doing what you expect:

```bash
# Enable debug logging to see hook execution
terragrunt plan --terragrunt-log-level debug

# The output will show lines like:
# DEBUG: Running hook: before_plan
# DEBUG: Hook command: [echo Starting plan]
# DEBUG: Hook working_dir: /path/to/working/dir
```

## Summary

Hooks are one of Terragrunt's most flexible features. They let you integrate any external tooling into your Terraform workflow without modifying your Terraform code. The most common uses are validation (linting, formatting), notifications (Slack, email), and safety measures (state backups, cost checks). For handling errors specifically in hooks, check out our dedicated [Terragrunt error hooks guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-error-hooks/view).

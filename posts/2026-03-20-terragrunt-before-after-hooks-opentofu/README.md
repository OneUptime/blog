# How to Handle Terragrunt Before and After Hooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Hook, Before_hook, After_hook, Automation

Description: Learn how to use Terragrunt before_hook and after_hook blocks to run shell commands before and after OpenTofu operations for validation, notification, and post-processing tasks.

## Introduction

Terragrunt hooks run arbitrary shell commands before or after any OpenTofu command. Use them to validate prerequisites, generate files, send notifications, clean up temporary resources, or integrate with external systems without modifying the OpenTofu modules themselves.

## Basic before_hook

```hcl
# terragrunt.hcl

terraform {
  source = "../../../modules/vpc"

  before_hook "validate_env" {
    commands = ["apply", "plan"]
    execute  = ["bash", "-c", "test -n \"$AWS_PROFILE\" || (echo 'AWS_PROFILE not set'; exit 1)"]
  }
}
```

## before_hook for Prerequisites

```hcl
terraform {
  source = "../../../modules/database"

  # Ensure the secrets exist in Parameter Store before applying
  before_hook "check_secrets" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      "aws ssm get-parameter --name /prod/database/password --query 'Parameter.Value' --output text > /dev/null"
    ]
  }

  # Generate a kubeconfig before running kubernetes-related operations
  before_hook "update_kubeconfig" {
    commands = ["apply", "plan"]
    execute  = [
      "aws", "eks", "update-kubeconfig",
      "--region", "us-east-1",
      "--name", "prod-cluster"
    ]
  }
}
```

## Hooks for Notifications

```hcl
terraform {
  source = "../../../modules/ecs-service"

  after_hook "notify_slack" {
    commands     = ["apply"]
    execute      = [
      "bash", "-c",
      "curl -s -X POST $SLACK_WEBHOOK_URL -d '{\"text\":\"Deploy complete: ${get_terragrunt_dir()}\"}'"
    ]
    run_on_error = false  # Only notify on success
  }

  error_hook "notify_on_failure" {
    commands     = ["apply"]
    execute      = [
      "bash", "-c",
      "curl -s -X POST $SLACK_WEBHOOK_URL -d '{\"text\":\"FAILED: ${get_terragrunt_dir()}\"}'"
    ]
    on_errors    = [".*"]  # Only run if apply failed
  }
}
```

## Hooks for File Generation and Cleanup

```hcl
terraform {
  source = "../../../modules/kubernetes-apps"

  # Generate a temporary values file from Vault before apply
  before_hook "fetch_secrets" {
    commands = ["apply", "plan"]
    execute  = [
      "bash", "-c",
      "vault kv get -format=json secret/prod/app | jq '.data.data' > /tmp/app-secrets.json"
    ]
  }

  # Clean up temporary secrets file after apply
  after_hook "cleanup_secrets" {
    commands     = ["apply", "plan"]
    execute      = ["rm", "-f", "/tmp/app-secrets.json"]
    run_on_error = true  # Always clean up
  }
}
```

## Hooks in Root Configuration

Define hooks in an included parent configuration so they apply to child modules. If child configurations also define a `terraform` block, include the parent with a deep merge so the hook blocks are combined:

```hcl
# root.hcl
terraform {
  # Print a message before tofu init runs
  before_hook "init_message" {
    commands = ["init"]
    execute  = ["echo", "Initializing OpenTofu..."]
  }

  # Log all apply and destroy operations for audit
  before_hook "audit_log" {
    commands = ["apply", "destroy"]
    execute  = [
      "bash", "-c",
      "echo \"$(date -u +%Y-%m-%dT%H:%M:%SZ) USER=$USER CMD=$TG_CTX_COMMAND MODULE=${path_relative_to_include()}\" >> /var/log/tofu-audit.log"
    ]
  }
}
```

Child `terragrunt.hcl` files can include the parent configuration:

```hcl
include "root" {
  path           = find_in_parent_folders("root.hcl")
  merge_strategy = "deep"
}
```

## error_hook for Error Handling

```hcl
terraform {
  source = "../../../modules/rds"

  # Run on error to capture state and diagnostics
  error_hook "capture_error" {
    commands  = ["apply"]
    execute   = [
      "bash", "-c",
      "tofu show -json 2>/dev/null | jq '.values' > /tmp/state-dump-$(date +%s).json; echo 'State dumped for debugging'"
    ]
    on_errors = [".*"]  # Match any error message
  }
}
```

## Hooks with Working Directory

```hcl
terraform {
  source = "../../../modules/helm-release"

  before_hook "helm_repo_update" {
    commands    = ["apply", "plan"]
    execute     = ["helm", "repo", "update"]
    working_dir = get_terragrunt_dir()
  }
}
```

## Conditional Hooks

```hcl
locals {
  is_prod = read_terragrunt_config(find_in_parent_folders("env.hcl")).locals.environment == "prod"
}

terraform {
  source = "../../../modules/database"

  # Only require approval confirmation in production
  before_hook "prod_confirmation" {
    commands = ["apply", "destroy"]
    execute  = [
      "bash", "-c",
      "read -p 'Applying to PRODUCTION. Type yes to confirm: ' c && [ \"$c\" = \"yes\" ]"
    ]
    if       = local.is_prod
  }
}
```

## Conclusion

Terragrunt hooks integrate seamlessly with OpenTofu's lifecycle without requiring changes to modules. Use `before_hook` for prerequisite validation and secret fetching, `after_hook` for notifications and cleanup, and `error_hook` for diagnostic capture. The `run_on_error = true` flag on cleanup hooks ensures temporary resources are always removed even when operations fail.

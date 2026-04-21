# How to Use tofu.applying for Plan vs Apply Differentiation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu.applying, Plan, Apply, Expression, Infrastructure as Code, DevOps

Description: A guide to using the tofu.applying built-in value to differentiate between plan and apply phases in OpenTofu expressions.

## Introduction

OpenTofu 1.11 and later versions provide a built-in value `tofu.applying` that evaluates to `true` while the apply phase is running and `false` in other phases such as plan and validate. This is about the apply phase, not just the `tofu apply` command: `tofu apply` first runs a planning phase where `tofu.applying` is `false`, then an apply phase where it is `true`.

`tofu.applying` is an ephemeral value. Any expression that includes it becomes ephemeral too, so it can only be used in contexts that accept ephemeral values, such as locals that flow into provisioners, provider configuration, ephemeral resources, child-module ephemeral outputs, resource connection blocks, and resource write-only attributes. It cannot be used directly in ordinary resource arguments or root module outputs.

## Basic tofu.applying Usage

```hcl
# tofu.applying is true during the apply phase, false during plan/validate

locals {
  phase_label = tofu.applying ? "apply" : "plan"
}

resource "terraform_data" "phase_example" {
  input = var.app_version

  # Provisioner blocks can use ephemeral values.
  provisioner "local-exec" {
    command = "echo 'Running during ${local.phase_label} phase'"
  }
}
```

## Ephemeral Values with tofu.applying

```hcl
# Use a plan-safe credential source during plan and the deployment
# credential source during apply. The result is still ephemeral.
ephemeral "aws_secretsmanager_secret_version" "api_key" {
  secret_id = tofu.applying ? "myapp/apply-api-key" : "myapp/plan-api-key"
}

locals {
  api_key = ephemeral.aws_secretsmanager_secret_version.api_key.secret_string
}

variable "api_key_version" {
  type = number
}

resource "aws_ssm_parameter" "api_key" {
  name             = "/myapp/api-key"
  type             = "SecureString"
  value_wo         = local.api_key
  value_wo_version = var.api_key_version
}
```

## Timestamp Handling

```hcl
# timestamp() changes every plan, causing perpetual diffs
# tofu.applying is ephemeral, so it cannot be used in normal resource input.
# Use plantimestamp() for a stable timestamp captured during planning.

resource "terraform_data" "deployment_record" {
  input = {
    version     = var.app_version
    environment = var.environment
    planned_at  = plantimestamp()
  }
}

output "deployment_info" {
  value = terraform_data.deployment_record.output
}
```

## Conditional Provisioner Arguments

```hcl
resource "terraform_data" "setup" {
  triggers_replace = var.app_version

  input = {
    version = var.app_version
  }

  provisioner "local-exec" {
    command = tofu.applying ? (
      "echo 'Deploying version ${var.app_version}'"
    ) : "true"
  }
}
```

## Notifications During Apply

```hcl
# Provisioners run during apply, not during plan. The false branch keeps
# the expression valid if evaluated outside the apply phase.
resource "terraform_data" "deploy_notification" {
  triggers_replace = var.app_version

  provisioner "local-exec" {
    command = tofu.applying ? (
      <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"text": "Deploying ${var.app_name} v${var.app_version}"}' \
        ${var.slack_webhook_url}
    EOT
    ) : "true"
  }
}
```

## Using with Ephemeral Resources

```hcl
ephemeral "tls_private_key" "app" {
  # Use a lighter key during planning and the deployment key during apply.
  # Ephemeral resource values must flow only into ephemeral contexts.
  algorithm   = tofu.applying ? "RSA" : "ECDSA"
  rsa_bits    = 4096
  ecdsa_curve = "P256"
}

resource "terraform_data" "install_key" {
  input = var.app_version

  provisioner "local-exec" {
    command = "./install-key.sh"
    environment = {
      PRIVATE_KEY = ephemeral.tls_private_key.app.private_key_pem
    }
  }
}
```

## Plan-Safe Outputs

```hcl
# Root outputs cannot directly expose tofu.applying or other ephemeral values.
# ephemeralasnull() strips ephemeral values before writing the output.

ephemeral "vault_generic_secret" "app_token" {
  path = "secret/myapp/token"
}

locals {
  app_token_preview = {
    token = tofu.applying ? ephemeral.vault_generic_secret.app_token.data["token"] : null
    note  = "ephemeral token value is replaced with null"
  }
}

output "app_token_preview" {
  value       = ephemeralasnull(local.app_token_preview)
  description = "Summary of app token status"
}
```

## Combining with Conditionals

```hcl
locals {
  # Build configuration that varies by phase
  operation_config = {
    phase     = tofu.applying ? "apply" : "plan"
    timestamp = tofu.applying ? timestamp() : null
    dry_run   = !tofu.applying

    # Fetch real values only during apply
    api_endpoint = tofu.applying ? (
      "https://api.${var.domain}/v1"
    ) : "https://api.example.com/v1"
  }
}

resource "terraform_data" "operation_log" {
  input = var.app_version

  provisioner "local-exec" {
    command = "echo \"$OPERATION_CONFIG\""
    environment = {
      OPERATION_CONFIG = jsonencode(local.operation_config)
    }
  }
}
```

## Debugging Phase Differences

```hcl
variable "phase_record_version" {
  type = number
}

# Normal resource arguments cannot use tofu.applying, but write-only
# arguments can accept ephemeral expressions.
resource "aws_ssm_parameter" "deployment_phase" {
  name             = "/myapp/last-operation-phase"
  type             = "String"
  value_wo         = tofu.applying ? "apply-${timestamp()}" : "plan-preview"
  value_wo_version = var.phase_record_version
}
```

## Conclusion

The `tofu.applying` built-in value enables phase-aware expressions in OpenTofu, but only in ephemeral contexts. It is useful when configuring ephemeral resources, provider settings, provisioners, connection blocks, and write-only attributes. Do not use it as a general-purpose switch inside ordinary resource arguments or root outputs; OpenTofu will reject those because ephemeral values cannot be stored in plan or state. For ordinary timestamp handling, use `plantimestamp()`, the Time provider, or lifecycle settings appropriate to the resource.

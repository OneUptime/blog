# How to Replace null_resource with terraform_data in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Migration

Description: Learn how to migrate from null_resource to the built-in terraform_data resource in OpenTofu, with side-by-side examples of equivalent configurations.

## Introduction

The `null_resource` from the `hashicorp/null` provider has been the standard way to run provisioners and trigger re-execution in Terraform/OpenTofu for years. Terraform 1.4 introduced `terraform_data`, and OpenTofu includes it as a built-in equivalent that requires no external provider. This guide provides a migration path with equivalent patterns for all common `null_resource` use cases.

## Provider Requirements Change

```hcl
# OLD: Requires hashicorp/null provider

terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# NEW: No provider required - terraform_data is built-in
# No additional provider blocks needed
```

## Basic Trigger Pattern

```hcl
# OLD: null_resource with triggers map
resource "null_resource" "restart_app" {
  triggers = {
    config_hash = md5(var.app_config)
  }

  provisioner "local-exec" {
    command = "systemctl restart myapp"
  }
}

# NEW: terraform_data with triggers_replace
resource "terraform_data" "restart_app" {
  triggers_replace = md5(var.app_config)

  provisioner "local-exec" {
    command = "systemctl restart myapp"
  }
}
```

## Multiple Triggers

```hcl
# OLD: null_resource with multiple triggers
resource "null_resource" "deploy" {
  triggers = {
    instance_id = aws_instance.app.id
    db_host     = aws_db_instance.main.address
    config_hash = filemd5("${path.module}/config.yaml")
  }

  provisioner "local-exec" {
    command = "deploy.sh"
    environment = {
      INSTANCE_ID = self.triggers.instance_id
      DB_HOST     = self.triggers.db_host
    }
  }
}

# NEW: terraform_data with triggers_replace and input/output
resource "terraform_data" "deploy" {
  input = {
    instance_id = aws_instance.app.id
    db_host     = aws_db_instance.main.address
  }

  triggers_replace = [
    aws_instance.app.id,
    aws_db_instance.main.address,
    filemd5("${path.module}/config.yaml")
  ]

  provisioner "local-exec" {
    command = "deploy.sh"
    environment = {
      INSTANCE_ID = self.output.instance_id
      DB_HOST     = self.output.db_host
    }
  }
}
```

## Accessing Trigger Values

With `null_resource`, triggers were accessible via `self.triggers.<key>`. With `terraform_data`, `triggers_replace` controls replacement, while `input`/`output` can store values you want to read back from the resource:

```hcl
# OLD: Access via self.triggers
resource "null_resource" "example" {
  triggers = {
    bucket = aws_s3_bucket.main.bucket
  }

  provisioner "local-exec" {
    command = "echo ${self.triggers.bucket}"  # Access via self.triggers.bucket
  }
}

# NEW: Access source directly, or store values in input/output
resource "terraform_data" "example" {
  input            = aws_s3_bucket.main.bucket
  triggers_replace = aws_s3_bucket.main.bucket

  provisioner "local-exec" {
    # Read the stored value back via self.output
    command = "echo ${self.output}"

    # Or reference the source resource directly (clearer)
    environment = {
      BUCKET = aws_s3_bucket.main.bucket
    }
  }
}
```

## Always-Run Pattern

```hcl
# OLD: null_resource that runs every apply
resource "null_resource" "always_run" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "echo 'Running at ${timestamp()}'"
  }
}

# NEW: terraform_data equivalent
resource "terraform_data" "always_run" {
  triggers_replace = timestamp()

  provisioner "local-exec" {
    command = "echo 'Running'"
  }
}
```

## Destroy Provisioner

```hcl
# OLD
resource "null_resource" "cleanup" {
  triggers = {
    instance_id = aws_instance.web.id
  }

  provisioner "local-exec" {
    when    = destroy
    command = "deregister.sh ${self.triggers.instance_id}"
  }
}

# NEW
resource "terraform_data" "cleanup" {
  input            = aws_instance.web.id
  triggers_replace = aws_instance.web.id

  provisioner "local-exec" {
    when    = destroy
    command = "deregister.sh ${self.output}"
  }
}
```

## Storing Data (New Capability)

`terraform_data` has a new `input`/`output` feature not available in `null_resource`:

```hcl
# Store computed values for use elsewhere
resource "terraform_data" "deployment_info" {
  input = {
    instance_id = aws_instance.web.id
    timestamp   = timestamp()
    version     = var.app_version
  }
}

# Use the stored values
output "deployment_info" {
  value = terraform_data.deployment_info.output
}
```

## Migration Checklist

1. Remove `hashicorp/null` from `required_providers` if `null_resource` was the only use
2. Replace `resource "null_resource"` with `resource "terraform_data"`
3. Replace `triggers = {}` with `triggers_replace = ...`
4. Update `self.triggers.<key>` references to use source resources directly, or `input`/`output` when the value must stay on the `terraform_data` resource
5. If you need to preserve state during the type migration, add a `moved` block on OpenTofu 1.10+
6. Run `tofu plan` to verify no unexpected changes

## State Migration

On OpenTofu 1.10+, use a `moved` block to migrate state from `null_resource` to `terraform_data`:

```hcl
moved {
  from = null_resource.example
  to   = terraform_data.example
}
```

## Conclusion

Migrating from `null_resource` to `terraform_data` is straightforward: replace the resource type, change `triggers` to `triggers_replace`, and update `self.triggers.*` references to use source resources directly or `input`/`output` when you need values on the `terraform_data` instance itself. The new `input`/`output` feature is a bonus that enables data storage patterns not possible with `null_resource`. Remove the `hashicorp/null` provider from your configuration once all `null_resource` instances are migrated.

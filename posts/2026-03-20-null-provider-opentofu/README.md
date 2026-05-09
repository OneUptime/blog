# How to Configure the Null Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Null Provider, Infrastructure as Code, IaC, Provisioner

Description: Learn how to configure the Null provider in OpenTofu for provisioners, local scripts, and resource dependencies.

## Introduction

This guide covers how to configure the Null provider in OpenTofu. The Null provider exposes a single resource, `null_resource`, which performs no work of its own. Its value comes from being a placeholder you can attach provisioners to, or a vehicle for `triggers` that force re-runs when inputs change.

## Prerequisites

- OpenTofu v1.6+
- Basic understanding of OpenTofu concepts
- A shell available locally (for `local-exec` examples)

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# The null provider takes no configuration arguments.
provider "null" {}
```

The `hashicorp/null` provider is resolved from the OpenTofu registry. There are no credentials or endpoints to configure - the provider itself is stateless.

## Step 2: Run a Local Script with a Provisioner

`null_resource` is most often used as a host for provisioners. Here it triggers a `local-exec` command at create time:

```hcl
resource "null_resource" "bootstrap" {
  provisioner "local-exec" {
    command = "echo Bootstrapping environment ${var.environment}"
  }
}

variable "environment" {
  description = "Target environment name"
  type        = string
  default     = "dev"
}
```

Provisioners on a `null_resource` run during `tofu apply` after the resource is created. If the resource is destroyed and recreated, they run again.

## Step 3: Use Triggers to Re-run on Input Changes

The `triggers` argument is a map of arbitrary strings. When any value in the map changes, OpenTofu replaces the `null_resource`, which re-runs its provisioners:

```hcl
resource "null_resource" "render_config" {
  triggers = {
    config_hash = filemd5("${path.module}/config.tpl")
    version     = var.app_version
  }

  provisioner "local-exec" {
    command = "render-config --version ${var.app_version}"
  }
}
```

Use `triggers` whenever you need a side effect to fire only when specific inputs change. Note that values in the map are coerced to strings.

## Step 4: Chain Dependencies and Remote Provisioners

A `null_resource` can also be used to group provisioners that depend on multiple other resources. Combined with `depends_on`, it provides a clean ordering hook:

```hcl
resource "null_resource" "post_deploy" {
  depends_on = [
    aws_instance.app,
    aws_db_instance.main,
  ]

  triggers = {
    instance_id = aws_instance.app.id
  }

  connection {
    type        = "ssh"
    host        = aws_instance.app.public_ip
    user        = "ubuntu"
    private_key = file(var.ssh_private_key_path)
  }

  provisioner "remote-exec" {
    inline = [
      "sudo systemctl restart app",
    ]
  }
}
```

## Step 5: Define Outputs

`null_resource` exposes an `id` attribute that changes each time the resource is replaced - useful for downstream references that need to react to a re-run:

```hcl
output "bootstrap_id" {
  description = "ID of the bootstrap null_resource (changes on replacement)"
  value       = null_resource.bootstrap.id
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download the null provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Provisioners Don't Re-run

Provisioners only run on create. If you need them to re-run, change a value in `triggers` so OpenTofu replaces the resource.

### Trigger Values Must Be Strings

The `triggers` map only accepts string values. Use `tostring()`, `jsonencode()`, or `filemd5()` to coerce other types.

### Consider `terraform_data` Instead

OpenTofu 1.6+ ships a built-in `terraform_data` resource that covers the same use cases as `null_resource` without requiring an external provider. Prefer it for new code unless you have a reason to keep the explicit `null` dependency.

## Conclusion

You have configured the Null provider in OpenTofu and used `null_resource` to run provisioners, react to input changes via `triggers`, and orchestrate ordering with `depends_on`. For new modules, evaluate whether the built-in `terraform_data` resource fits your needs before reaching for `null_resource`.

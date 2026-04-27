# How to Use the plantimestamp Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the plantimestamp function in OpenTofu to get a stable timestamp that is consistent throughout a single plan operation.

## Introduction

The `plantimestamp` function in OpenTofu returns the timestamp at which the current plan was started. Unlike `timestamp()`, which returns the current time and can vary between evaluations, `plantimestamp()` returns the same value throughout a single `tofu plan` or `tofu apply` execution. This makes it ideal for resource naming and tagging that should be consistent within a deployment.

## Syntax

```hcl
plantimestamp()
```

- Returns an RFC 3339 timestamp string
- The value is fixed for the entire duration of a single plan/apply execution
- Different from `timestamp()` which can vary

## Basic Examples

```hcl
output "plan_time" {
  value = plantimestamp()
  # Returns "2026-03-20T14:30:00Z" (fixed for this plan)
}

output "formatted_plan_time" {
  value = formatdate("YYYY-MM-DD hh:mm", plantimestamp())
}
```

## Practical Use Cases

### Consistent Deployment Timestamp Tags

```hcl
locals {
  deploy_time     = plantimestamp()
  deploy_date     = formatdate("YYYY-MM-DD", local.deploy_time)
  deploy_datetime = formatdate("YYYY-MM-DD hh:mm:ss", local.deploy_time)
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    Name        = "app-server"
    DeployedAt  = local.deploy_datetime
    DeployDate  = local.deploy_date
  }
}

resource "aws_instance" "worker" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"

  tags = {
    Name       = "worker"
    # Same timestamp as app server - consistent for this deployment
    DeployedAt = local.deploy_datetime
  }
}
```

### Versioned Deployment Artifact Keys

```hcl
locals {
  deploy_version = formatdate("YYYYMMDD-hhmmss", plantimestamp())
}

resource "aws_s3_object" "app_bundle" {
  bucket = aws_s3_bucket.deployments.id
  key    = "builds/${local.deploy_version}/app.zip"
  source = "${path.module}/dist/app.zip"
}

resource "aws_s3_object" "app_config" {
  bucket = aws_s3_bucket.deployments.id
  key    = "builds/${local.deploy_version}/config.json"
  content = jsonencode(var.app_config)
}
```

### Deployment Record

```hcl
locals {
  plan_ts = plantimestamp()
}

resource "aws_ssm_parameter" "last_deploy" {
  name  = "/app/last-deployment"
  type  = "String"
  value = jsonencode({
    timestamp   = local.plan_ts
    date        = formatdate("YYYY-MM-DD", local.plan_ts)
    environment = var.environment
    version     = var.app_version
  })
}
```

## Step-by-Step Usage

1. Call `plantimestamp()` in a `locals` block.
2. Format it with `formatdate()` as needed.
3. Use the formatted string in tags, names, or S3 keys.

Note: `plantimestamp()` is not available in the OpenTofu console. To inspect its value, expose it through an `output` and run `tofu plan`:

```bash
$ tofu plan
...
Changes to Outputs:
  + plan_time           = "2026-03-20T14:30:00Z"
  + formatted_plan_time = "20260320"
```

## plantimestamp vs timestamp

| Function | Value Changes | When to Use |
|----------|--------------|-------------|
| `plantimestamp()` | Once per plan/apply | Consistent deployment timestamps |
| `timestamp()` | On every evaluation | Debugging, non-reproducible scenarios |

For tagging and naming, always prefer `plantimestamp()`.

## Conclusion

The `plantimestamp` function solves the inconsistency problem of `timestamp()` in OpenTofu by providing a single, stable timestamp for an entire plan execution. Use it for deployment tracking tags, versioned artifact keys, and any other case where all resources in a deployment should share the same timestamp.

# How to Use the timestamp Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the timestamp function in OpenTofu to get the current UTC time for expiry calculations, tagging, and time-based resource names.

## Introduction

The `timestamp` function in OpenTofu returns the current UTC time in RFC 3339 format. It is evaluated each time it is called, which means it can differ between multiple evaluations during the same run. For a stable per-plan timestamp, use `plantimestamp()` instead.

## Syntax

```hcl
timestamp()
```

- Returns an RFC 3339 timestamp (e.g., `"2026-03-20T14:30:00Z"`)
- Evaluated at plan time
- Can change between evaluations

## Basic Examples

```hcl
output "current_time" {
  value = timestamp()
  # Returns current UTC time
}

output "formatted_now" {
  value = formatdate("YYYY-MM-DD", timestamp())
}
```

## Practical Use Cases

### Certificate Expiry Calculation

```hcl
locals {
  now             = timestamp()
  cert_valid_days = 365
  # 8760 hours = 365 days
  cert_expiry     = timeadd(local.now, "${local.cert_valid_days * 24}h")
  expiry_date     = formatdate("YYYY-MM-DD", local.cert_expiry)
}

resource "tls_self_signed_cert" "internal" {
  private_key_pem = tls_private_key.internal.private_key_pem

  subject {
    common_name  = "internal.example.com"
    organization = "My Company"
  }

  validity_period_hours = local.cert_valid_days * 24
  allowed_uses          = ["key_encipherment", "digital_signature", "server_auth"]
}

output "cert_expires" {
  value = local.expiry_date
}
```

### Tracking When Resources Were Planned

```hcl
resource "aws_instance" "debug" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name      = "debug-server"
    PlannedAt = timestamp()  # Note: changes on every plan
  }

  lifecycle {
    ignore_changes = [tags["PlannedAt"]]
  }
}
```

### Time-Based Conditionals

```hcl
locals {
  now          = timestamp()
  # Unix epoch from RFC 3339 isn't directly supported,
  # but you can use timecmp for comparisons
  is_after_cutoff = timecmp(local.now, "2026-06-01T00:00:00Z") >= 0
}

output "migration_required" {
  value = local.is_after_cutoff
}
```

### Null Resource Trigger

```hcl
resource "null_resource" "always_run" {
  triggers = {
    # Run on every apply (timestamp changes each time)
    run_time = timestamp()
  }

  provisioner "local-exec" {
    command = "echo 'Running at ${timestamp()}'"
  }
}
```

## Step-by-Step Usage

1. Call `timestamp()` in locals or directly in resource arguments.
2. Format with `formatdate()` as needed.
3. For stable per-deployment timestamps, use `plantimestamp()` instead.

```bash
tofu console

> timestamp()
"2026-03-20T14:30:00Z"
```

## timestamp vs plantimestamp

| | `timestamp()` | `plantimestamp()` |
|-|---------------|-------------------|
| Consistency | Changes each evaluation | Fixed per plan/apply |
| Use case | Always-run triggers | Deployment tagging |
| Recommended | Specific scenarios | Most tagging/naming |

## Conclusion

The `timestamp` function gives access to the current time in OpenTofu, useful for expiry calculations, time-based conditionals, and debugging. For most tagging and naming use cases, prefer `plantimestamp()` for consistency. Use `timestamp()` when you explicitly want the value to change on every evaluation.

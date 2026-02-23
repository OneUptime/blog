# How to Use the nonsensitive Function Safely in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Security, Sensitive Data, HCL, Infrastructure as Code

Description: Learn how to use Terraform's nonsensitive function to safely unwrap sensitive values when you need to use them in non-sensitive contexts, with proper security guidelines.

---

Terraform's sensitive value system is designed to protect secrets from being displayed in plan output and logs. But sometimes this protection gets in the way - you might derive a non-secret value from a sensitive input, or you might need to use a sensitive value in a context that does not support it. The `nonsensitive` function lets you explicitly remove the sensitive marking from a value. This post covers how to use it safely and when it is appropriate.

## What Does nonsensitive Do?

The `nonsensitive` function takes a value that has been marked as sensitive and returns the same value without the sensitive marking. After calling `nonsensitive`, the value will appear in plan output, logs, and state in plaintext.

```hcl
variable "database_password" {
  type      = string
  sensitive = true
}

# This will show as (sensitive value) in plan output
output "masked" {
  value     = var.database_password
  sensitive = true
}

# This will show the actual value in plan output - BE CAREFUL
output "unmasked" {
  value = nonsensitive(var.database_password)
}
```

## Syntax

```hcl
nonsensitive(value)
```

Takes a sensitive value, returns the same value with the sensitive marking removed.

## When Is nonsensitive Safe to Use?

The function itself comes with a warning: if you use it on genuinely secret data, that data will be exposed. Here are the legitimate use cases:

### 1. Derived Values That Are Not Actually Secret

When you derive a non-secret value from a sensitive input:

```hcl
variable "api_key" {
  type      = string
  sensitive = true
}

# The length of the API key is not secret
output "api_key_length" {
  value = nonsensitive(length(var.api_key))
}

# Whether the API key is set is not secret
output "api_key_configured" {
  value = nonsensitive(var.api_key != "")
}

# A hash prefix for identification (not reversible) can be safe
output "api_key_prefix" {
  value = nonsensitive(substr(sha256(var.api_key), 0, 8))
}
```

### 2. Sensitive Propagation Breaking Logic

Terraform propagates sensitivity through expressions. Sometimes a value becomes sensitive even though it contains no secret data:

```hcl
variable "db_config" {
  type = object({
    host     = string
    port     = number
    password = string
  })
  sensitive = true  # The whole object is sensitive because of the password
}

# The host and port are not secret, but they are marked sensitive
# because the parent object is sensitive
output "db_host" {
  # Safe: the hostname is not a secret
  value = nonsensitive(var.db_config.host)
}

output "db_port" {
  # Safe: the port number is not a secret
  value = nonsensitive(var.db_config.port)
}

# Do NOT do this - the password IS secret
# output "db_password" {
#   value = nonsensitive(var.db_config.password)
# }
```

### 3. Values That Become Sensitive Through Operations

When an operation with a sensitive value produces a result that is not actually secret:

```hcl
variable "secret_key" {
  type      = string
  sensitive = true
}

locals {
  # This list contains non-secret values, but it becomes sensitive
  # because we used a sensitive value in the condition
  environment = var.secret_key != "" ? "production" : "development"
}

# Safe: the environment name itself is not secret
output "environment" {
  value = nonsensitive(local.environment)
}
```

## When nonsensitive Is NOT Safe

Never use `nonsensitive` on:

- Passwords, API keys, or tokens that should remain secret
- Private keys or certificates
- Database connection strings that include credentials
- Any value that could be used to gain unauthorized access

```hcl
# BAD EXAMPLES - DO NOT DO THIS

# Exposing a password
output "bad_password" {
  value = nonsensitive(var.db_password)  # NEVER!
}

# Exposing an API key
output "bad_api_key" {
  value = nonsensitive(var.api_key)  # NEVER!
}

# Exposing a private key
output "bad_key" {
  value = nonsensitive(tls_private_key.example.private_key_pem)  # NEVER!
}
```

## Practical Examples

### Working with Sensitive Module Outputs

When a module marks its outputs as sensitive but downstream consumers need non-secret parts:

```hcl
module "database" {
  source = "./modules/database"
  # ... configuration ...
}

# The module output includes both secret and non-secret information
# module.database.connection_info is marked sensitive

# Extract the non-secret parts
output "db_endpoint" {
  value = nonsensitive(module.database.connection_info.endpoint)
}

output "db_port" {
  value = nonsensitive(module.database.connection_info.port)
}

# Keep the secret parts sensitive
output "db_connection_string" {
  value     = module.database.connection_info.connection_string
  sensitive = true
}
```

### Debugging Sensitive Values During Development

During development, you might temporarily need to see sensitive values. Use `nonsensitive` with care and remove it before committing:

```hcl
# DEVELOPMENT ONLY - remove before production
output "debug_config" {
  value = nonsensitive(local.full_config)
  # TODO: Remove this output before merging to main
}
```

A better approach is to use `terraform output -json` which shows sensitive values without modifying code.

### Conditional Resource Creation Based on Sensitive Values

When you need to conditionally create resources based on whether a secret is provided:

```hcl
variable "monitoring_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

# The count value cannot be sensitive, so we need nonsensitive
resource "aws_cloudwatch_metric_alarm" "monitoring" {
  # Safe: we are only checking if the key exists, not exposing it
  count = nonsensitive(var.monitoring_api_key != "" ? 1 : 0)

  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}
```

### Using Sensitive Values in for_each Keys

`for_each` keys cannot be sensitive. If you have a map with sensitive values but non-sensitive keys:

```hcl
variable "service_configs" {
  type = map(object({
    port     = number
    api_key  = string
  }))
  sensitive = true
}

# Extract just the keys (service names) which are not secret
locals {
  service_names = nonsensitive(keys(var.service_configs))
}

resource "aws_security_group_rule" "services" {
  for_each = toset(local.service_names)

  type              = "ingress"
  from_port         = nonsensitive(var.service_configs[each.key].port)
  to_port           = nonsensitive(var.service_configs[each.key].port)
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.main.id
}
```

## Best Practices

1. **Ask yourself: is this value actually secret?** If yes, do not use `nonsensitive`.

2. **Document why you are using nonsensitive.** Add a comment explaining why the value is safe to expose.

3. **Prefer extracting non-sensitive parts** rather than removing sensitivity from the whole object.

4. **Never use nonsensitive in production outputs** for actual secrets, even temporarily.

5. **Use code review** to catch inappropriate use of `nonsensitive`.

```hcl
# Good: documented and justified
output "db_region" {
  # Safe to expose: region is public infrastructure info, not a secret.
  # The source is sensitive only because it shares a variable with the password.
  value = nonsensitive(var.db_config.region)
}
```

## Summary

The `nonsensitive` function is a necessary escape hatch from Terraform's sensitivity system. It exists because Terraform's sensitivity tracking is conservative - it marks derived values as sensitive even when they do not contain actual secrets. When used properly, `nonsensitive` lets you work around these false positives without compromising security. The key is to only use it on values that genuinely are not secret, and to document your reasoning when you do. For checking whether a value is sensitive, see the [issensitive function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-issensitive-function-in-terraform/view).

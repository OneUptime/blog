# How to Fix Terraform Sensitive Value in Non-Sensitive Context

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Security

Description: Fix Terraform errors when sensitive values are used in non-sensitive contexts, including outputs, for_each keys, and resource arguments.

---

Terraform's sensitive value feature helps prevent secrets from leaking into logs and console output. When you mark a variable or output as sensitive, Terraform redacts its value in plan and apply output. But this protection comes with restrictions. Using a sensitive value in a context that requires non-sensitive data triggers an error. This article explains when and why this happens and how to work around it.

## The Error

The most common form of this error looks like:

```
Error: Output refers to sensitive values

  on outputs.tf line 1:
   1: output "connection_string" {

To reduce the risk of accidentally exporting sensitive data that was
intended to be only internal, Terraform requires that you mark this
output value as sensitive.
```

Or:

```
Error: Invalid for_each argument

  on main.tf line 3, in resource "aws_iam_user" "users":
   3:   for_each = var.user_passwords

Sensitive values, or values derived from sensitive values, cannot be used
as for_each arguments. If used, the sensitive value could be exposed in
the resource address.
```

## Understanding Sensitive Values

A value becomes sensitive through several paths:

```hcl
# Explicitly marked as sensitive
variable "db_password" {
  type      = string
  sensitive = true
}

# Output from a sensitive resource attribute
resource "random_password" "db" {
  length = 16
}
# random_password.db.result is inherently sensitive

# Derived from a sensitive value
locals {
  connection_string = "postgres://admin:${var.db_password}@db.example.com/mydb"
  # This is now sensitive because it includes var.db_password
}
```

Once a value is marked sensitive, that sensitivity propagates through any expression that uses it.

## Fix 1: Mark Outputs as Sensitive

The simplest fix. If your output depends on sensitive values, mark the output as sensitive too:

```hcl
# This fails
output "connection_string" {
  value = "postgres://admin:${var.db_password}@db.example.com/mydb"
}

# This works
output "connection_string" {
  value     = "postgres://admin:${var.db_password}@db.example.com/mydb"
  sensitive = true
}
```

This is the correct approach when the output genuinely contains sensitive data.

## Fix 2: Use nonsensitive() Function

When you know a value derived from sensitive data is actually safe to expose, use the `nonsensitive()` function:

```hcl
variable "db_config" {
  type = object({
    host     = string
    port     = number
    password = string
  })
  sensitive = true
}

# The entire object is sensitive, but host and port are fine to expose
output "db_host" {
  value = nonsensitive(var.db_config.host)
}

output "db_port" {
  value = nonsensitive(var.db_config.port)
}

# Keep the password sensitive
output "db_password" {
  value     = var.db_config.password
  sensitive = true
}
```

Be careful with `nonsensitive()`. Only use it when you are confident the value does not contain secrets. Misuse defeats the purpose of the sensitivity system.

## Fix 3: for_each with Sensitive Values

You cannot use sensitive values as `for_each` keys because the keys appear in resource addresses, which are visible in plans and state:

```hcl
variable "user_configs" {
  type = map(object({
    password = string
    role     = string
  }))
  sensitive = true
}

# This fails - the map keys would be exposed in resource addresses
resource "aws_iam_user" "users" {
  for_each = var.user_configs
  name     = each.key
}
```

The fix depends on what part is actually sensitive. If only the password values are sensitive but the keys (usernames) are not, restructure your variables:

```hcl
variable "usernames" {
  type = list(string)
  # Not sensitive - these are just usernames
}

variable "user_passwords" {
  type      = map(string)
  sensitive = true
  # Sensitive - keyed by username, values are passwords
}

resource "aws_iam_user" "users" {
  for_each = toset(var.usernames)
  name     = each.key
}

resource "aws_iam_user_login_profile" "users" {
  for_each = toset(var.usernames)
  user     = each.key
  # Use the password from the sensitive map
  password_reset_required = false
}
```

If you truly need to use a sensitive value in `for_each` and you are sure the keys are safe, use `nonsensitive()`:

```hcl
resource "aws_iam_user" "users" {
  for_each = nonsensitive(var.user_configs)
  name     = each.key
}
```

## Fix 4: Sensitive Values in Count

Similar to `for_each`, using a sensitive value for `count` is not allowed because the count affects the resource address:

```hcl
variable "instance_count" {
  type      = number
  sensitive = true
}

# This fails
resource "aws_instance" "web" {
  count = var.instance_count
  # ...
}

# Fix - if the count itself is not actually sensitive
resource "aws_instance" "web" {
  count = nonsensitive(var.instance_count)
  # ...
}
```

Ask yourself: is the number of instances really a secret? If not, remove the `sensitive = true` from the variable definition.

## Fix 5: Sensitive Values in Provisioners

Provisioners that log their commands can expose sensitive values:

```hcl
resource "aws_instance" "web" {
  # ...

  provisioner "remote-exec" {
    inline = [
      # This might show the password in logs
      "echo '${var.db_password}' > /etc/app/db_password",
    ]
  }
}
```

Instead, use a more secure method to pass secrets:

```hcl
resource "aws_instance" "web" {
  # Pass via user_data (encrypted at rest in EC2)
  user_data = base64encode(jsonencode({
    db_password = var.db_password
  }))
}
```

Or use a secrets manager:

```hcl
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# Instance retrieves the secret at runtime, not through Terraform
```

## Fix 6: Sensitive Values in Dynamic Blocks

Dynamic blocks that iterate over sensitive collections trigger the same restriction:

```hcl
variable "ingress_rules" {
  type = list(object({
    port     = number
    cidr     = string
    api_key  = string
  }))
  sensitive = true
}

# This fails because the dynamic block iterates over sensitive data
resource "aws_security_group" "main" {
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      cidr_blocks = [ingress.value.cidr]
    }
  }
}
```

Split the sensitive and non-sensitive parts:

```hcl
variable "ingress_rules" {
  type = list(object({
    port = number
    cidr = string
  }))
  # Not sensitive - ports and CIDRs are not secrets
}

variable "api_keys" {
  type      = map(string)
  sensitive = true
  # Only the actual secrets are marked sensitive
}
```

## Fix 7: Sensitive Values in Conditions

Using sensitive values in conditional expressions that affect resource creation causes problems:

```hcl
variable "enable_feature" {
  type      = bool
  sensitive = true
}

# This fails
resource "aws_instance" "feature" {
  count = var.enable_feature ? 1 : 0
}

# Fix - if the boolean is not truly sensitive
resource "aws_instance" "feature" {
  count = nonsensitive(var.enable_feature) ? 1 : 0
}
```

## Fix 8: Debugging Sensitive Value Propagation

Sometimes it is not obvious why a value is sensitive. Terraform's sensitivity propagation can be tracked through the dependency chain:

```hcl
# Start: sensitive variable
variable "secret" {
  type      = string
  sensitive = true
}

# Step 1: Local derived from sensitive value - also sensitive
locals {
  config = "prefix-${var.secret}-suffix"
}

# Step 2: Another local using the first - still sensitive
locals {
  full_config = "server: ${local.config}"
}

# Step 3: This output fails because full_config is sensitive
output "config" {
  value = local.full_config
}
```

To find where sensitivity originated, trace back through the expression chain. Each value that incorporates a sensitive value becomes sensitive itself.

Use `terraform console` to test:

```bash
terraform console
> var.secret
(sensitive value)
> nonsensitive(var.secret)
"my-secret-value"
```

## When to Use sensitive = true

Not everything needs to be sensitive. Use it for:

- Passwords and API keys
- Private keys and certificates
- Database connection strings with credentials
- Tokens and secrets

Do not use it for:

- Resource names and tags
- CIDR blocks and IP ranges
- Instance types and counts
- Region and availability zone names

Over-marking values as sensitive creates friction without security benefits.

## Conclusion

Sensitive value errors in Terraform are a safety mechanism, not a bug. They prevent accidental exposure of secrets in plans, logs, and state addresses. The fix is usually one of three things: mark the consuming output as sensitive, use `nonsensitive()` when the derived value is safe to expose, or restructure your variables to separate sensitive data from non-sensitive metadata. The key is understanding that sensitivity propagates through expressions, and Terraform enforces restrictions anywhere a sensitive value would become visible.

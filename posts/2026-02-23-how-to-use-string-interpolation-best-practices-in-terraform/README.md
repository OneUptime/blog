# How to Use String Interpolation Best Practices in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, String Interpolation, HCL, Best Practices, Infrastructure as Code

Description: Master string interpolation in Terraform with best practices covering readability, performance, security, and common pitfalls to avoid in your HCL code.

---

String interpolation is one of the first things you learn in Terraform, and one of the things most people never think about optimizing. You write `"${var.name}"` everywhere and move on. But there are real readability, maintainability, and correctness concerns with how you use interpolation. This post covers the best practices that make your Terraform code cleaner and less error-prone.

## The Basics of String Interpolation

In Terraform, string interpolation uses the `${}` syntax inside double-quoted strings:

```hcl
# Simple variable reference
resource "aws_instance" "web" {
  tags = {
    Name = "web-${var.environment}"
  }
}

# Expression inside interpolation
locals {
  greeting = "There are ${length(var.servers)} servers"
}

# Nested expressions
output "endpoint" {
  value = "https://${var.subdomain}.${var.domain}:${var.port}/api"
}
```

## Best Practice 1: Do Not Wrap Single References

The most common mistake is wrapping a single variable or attribute reference in interpolation when it is not needed:

```hcl
# Bad - unnecessary interpolation
resource "aws_instance" "web" {
  ami           = "${var.ami_id}"
  instance_type = "${var.instance_type}"
  subnet_id     = "${aws_subnet.main.id}"
}

# Good - direct reference, no quotes needed
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.main.id
}
```

This is not just style. Unnecessary interpolation can hide type information and make your code harder to read. When you write `"${var.count}"`, it converts the number to a string. When you write `var.count`, Terraform keeps the original type.

The only time you need `"${}"` for a single value is when you explicitly want to convert a non-string value to a string.

## Best Practice 2: Use format() for Complex Strings

When you have more than two or three interpolations in a string, switch to `format()`:

```hcl
# Hard to read with many interpolations
locals {
  bad_url = "https://${var.subdomain}.${var.domain}:${var.port}/${var.api_version}/${var.path}"
}

# Cleaner with format()
locals {
  good_url = format(
    "https://%s.%s:%d/%s/%s",
    var.subdomain,
    var.domain,
    var.port,
    var.api_version,
    var.path
  )
}
```

The `format()` approach is easier to read because you can see the template structure at a glance, and the arguments are listed separately. It also gives you access to format specifiers like `%04d` for zero padding.

## Best Practice 3: Use Locals for Intermediate Values

Do not build complex strings inline. Break them into locals:

```hcl
# Hard to follow inline
resource "aws_iam_role" "lambda" {
  name = "${var.project}-${var.environment}-${var.function_name}-role-${var.region}"
}

# Better with locals
locals {
  prefix    = "${var.project}-${var.environment}"
  role_name = "${local.prefix}-${var.function_name}-role-${var.region}"
}

resource "aws_iam_role" "lambda" {
  name = local.role_name
}
```

This has two benefits: it makes the resource block easier to read, and the prefix local can be reused across multiple resources.

## Best Practice 4: Be Careful with Types

String interpolation always produces a string, which can cause issues with numeric and boolean values:

```hcl
variable "port" {
  type    = number
  default = 8080
}

# This converts port to a string
locals {
  port_string = "${var.port}"  # "8080" (string)
}

# This keeps port as a number
locals {
  port_number = var.port  # 8080 (number)
}

# When you actually need the conversion, be explicit
locals {
  port_label = "Port: ${var.port}"  # This is fine - you want a string
}
```

## Best Practice 5: Avoid Interpolation in Conditional Expressions

Ternary expressions inside interpolation get hard to read fast:

```hcl
# Confusing
locals {
  bad = "https://${var.environment == "production" ? "api" : "api-${var.environment}"}.example.com"
}

# Clearer
locals {
  subdomain = var.environment == "production" ? "api" : "api-${var.environment}"
  good      = "https://${local.subdomain}.example.com"
}
```

## Best Practice 6: Use Heredocs for Multi-Line Strings

When a string spans multiple lines, use heredoc syntax instead of string concatenation or interpolation with `\n`:

```hcl
# Bad - embedded newlines
locals {
  bad_policy = "{\"Version\": \"2012-10-17\",\n\"Statement\": [{\"Effect\": \"Allow\",\n\"Action\": \"s3:GetObject\",\n\"Resource\": \"${aws_s3_bucket.data.arn}/*\"}]}"
}

# Good - heredoc with interpolation
locals {
  good_policy = <<-EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "s3:GetObject",
          "Resource": "${aws_s3_bucket.data.arn}/*"
        }
      ]
    }
  EOF
}

# Better - use jsonencode instead of hand-crafted JSON
locals {
  best_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.data.arn}/*"
    }]
  })
}
```

## Best Practice 7: Escape Dollar Signs When Needed

In templates and scripts, you need to escape literal dollar signs so Terraform does not try to interpolate them:

```hcl
# In a templatefile, use $$ to produce a literal $
# templates/script.sh.tpl
# $$HOME produces $HOME in the output
# $$(date) produces $(date) in the output

# In regular Terraform strings, $ only needs escaping before {
locals {
  # This is fine - $ not followed by { is literal
  price = "$100"

  # This needs escaping - ${ starts interpolation
  template_literal = "Use $${var.name} for interpolation"
  # Result: "Use ${var.name} for interpolation"
}
```

## Best Practice 8: Use Directive Syntax for Conditional Content

For conditional inclusion of string content, use the `%{ }` directive syntax:

```hcl
locals {
  # Using ternary - works but can be ugly
  greeting = "Hello ${var.name != "" ? var.name : "stranger"}"

  # Using directive syntax in a heredoc - cleaner for complex cases
  config = <<-EOF
    host = ${var.db_host}
    port = ${var.db_port}
    %{ if var.db_ssl }
    ssl = true
    ssl_ca = /etc/ssl/ca.pem
    %{ endif }
    %{ if var.db_pool_size > 0 }
    pool_size = ${var.db_pool_size}
    %{ endif }
  EOF
}
```

## Best Practice 9: Be Mindful of Sensitive Values

Interpolating sensitive values into strings can inadvertently expose them:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

# This loses the sensitive marking and may show up in logs
locals {
  # WARNING: connection_string will NOT be marked as sensitive
  connection_string = "postgresql://admin:${var.db_password}@db.example.com/mydb"
}

# Better: mark the result as sensitive too
output "connection_string" {
  value     = "postgresql://admin:${var.db_password}@db.example.com/mydb"
  sensitive = true
}
```

## Best Practice 10: Consistent Quoting Style

Pick a consistent style and stick with it across your project:

```hcl
# Style 1: Interpolation only when mixing with literal text
resource "aws_instance" "web" {
  ami           = var.ami_id                    # Direct reference
  instance_type = var.instance_type              # Direct reference
  tags = {
    Name = "web-${var.environment}"              # Interpolation needed
    Env  = var.environment                       # Direct reference
  }
}
```

## Best Practice 11: Use join() Instead of Repeated Interpolation

When building a string from a list, prefer `join` over manual concatenation:

```hcl
# Fragile and hard to maintain
locals {
  bad_path = "/${var.org}/${var.team}/${var.project}/${var.service}"
}

# Robust and easy to extend
locals {
  path_parts = [var.org, var.team, var.project, var.service]
  good_path  = "/${join("/", local.path_parts)}"
}
```

## Best Practice 12: Document Non-Obvious Interpolations

When an interpolation involves a complex expression, add a comment:

```hcl
locals {
  # Extract the region from the AZ by removing the last character
  region = substr(var.availability_zone, 0, length(var.availability_zone) - 1)

  # Build the VPC endpoint DNS name following AWS conventions
  vpce_dns = "${aws_vpc_endpoint.s3.id}-${local.region}.vpce.amazonaws.com"
}
```

## Summary

String interpolation in Terraform is simple in concept but benefits from disciplined usage. The core rules are: do not interpolate single references, use `format()` for complex strings, break intermediate values into locals, be explicit about type conversions, and keep security in mind with sensitive values. These practices keep your Terraform code readable and maintainable as your infrastructure grows.

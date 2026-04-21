# How to Use String Interpolation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, String Interpolation, Expression, Infrastructure as Code, DevOps

Description: A guide to using string interpolation in OpenTofu HCL configurations to embed dynamic values within string literals.

## Introduction

String interpolation in OpenTofu allows you to embed expressions within string literals using the `${}` syntax. This lets you create dynamic strings that incorporate variable values, resource attributes, function results, and other expression types. String interpolation is one of the most frequently used features in HCL configuration.

## Basic String Interpolation

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "app_name" {
  type    = string
  default = "myapp"
}

resource "aws_s3_bucket" "app" {
  # Interpolate variables into a string
  bucket = "${var.app_name}-${var.environment}-data"
  # Result: "myapp-dev-data"
}
```

## Interpolating Resource Attributes

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = {
    Name = "public-subnet-in-${aws_vpc.main.id}"
  }
}
```

## Interpolating Function Results

```hcl
variable "prefix" {
  type    = string
  default = "MyApp"
}

locals {
  lower_prefix = lower(var.prefix)
  upper_prefix = upper(var.prefix)
}

resource "aws_iam_role" "app" {
  # Interpolate function results
  name = "${local.lower_prefix}-execution-role"
  # Result: "myapp-execution-role"
}

resource "aws_s3_bucket" "logs" {
  # Use lower and replace to build a lowercase bucket-name prefix
  bucket = "${replace(lower(var.prefix), "/[^a-z0-9-]/", "-")}-logs-${var.environment}"
}
```

## Multi-Level Interpolation

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "eu-west-1"]
}

locals {
  # Nested interpolation
  bucket_names = [
    for region in var.regions :
    "${var.app_name}-${region}-${var.environment}"
  ]
}
```

## Interpolation with Arithmetic

```hcl
variable "port_base" {
  type    = number
  default = 8000
}

resource "aws_security_group_rule" "app_ports" {
  count = 3

  type              = "ingress"
  from_port         = var.port_base + count.index
  to_port           = var.port_base + count.index
  protocol          = "tcp"
  security_group_id = aws_security_group.app.id
  cidr_blocks       = ["0.0.0.0/0"]

  description = "Allow port ${var.port_base + count.index}"
}
```

## Interpolation in Multiline Strings

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    # Interpolation works in heredoc strings too
    export APP_VERSION="${var.app_version}"
    export APP_ENV="${var.environment}"
    export DB_HOST="${aws_db_instance.main.address}"
    export DB_PORT="${aws_db_instance.main.port}"

    systemctl start myapp
  EOF
}
```

## Template Strings with Complex Expressions

```hcl
variable "tags" {
  type = map(string)
  default = {
    Owner = "platform-team"
    Cost  = "engineering"
  }
}

locals {
  # Conditional interpolation
  environment_label = var.environment == "prod" ? "Production" : "Non-Production"

  # Complex expression in string
  tag_string = join(", ", [
    for k, v in var.tags : "${k}=${v}"
  ])
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = merge(var.tags, {
    Name = "${var.app_name}-${var.environment}-server"
    Env  = local.environment_label
  })
}
```

## Escaping Interpolation Sequences

```hcl
resource "aws_iam_role_policy" "app" {
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["ec2:*"]
      # Use $${ to include a literal ${ sequence in the string
      # (needed when mixing OpenTofu interpolation with other template languages)
      Resource = "*"
    }]
  })
}

# Example with literal shell and template syntax:

locals {
  shell_script     = "echo $HOME"     # A plain $ does not need escaping
  template_literal = "echo $${HOME}"  # $${ becomes ${ in the output
}
```

## String Interpolation vs jsonencode

```hcl
# For JSON content, prefer jsonencode over string interpolation
# String interpolation is error-prone with special characters

# BAD: String interpolation for JSON (escaping issues)
# locals {
#   bad_json = "{\"key\": \"${var.value}\"}"
# }

# GOOD: jsonencode handles escaping automatically
locals {
  good_json = jsonencode({
    key = var.value
  })
}
```

## Conclusion

String interpolation using `${}` is fundamental to OpenTofu configurations, enabling dynamic resource naming, tag generation, and script templating. It works in regular strings, heredoc strings, and anywhere a string value is expected in HCL. For complex multi-line content, combine interpolation with heredoc syntax. When generating JSON content, prefer `jsonencode()` over string interpolation to avoid escaping issues with special characters. Use `$${` to include a literal `${` sequence when the string itself uses interpolation syntax for other purposes.

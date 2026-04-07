# How to Use String Functions in OpenTofu: chomp, lower, upper, title

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, String

Description: Learn how to use chomp, lower, upper, and title string functions in OpenTofu to manipulate text in your infrastructure configurations.

OpenTofu provides several functions for basic string case and whitespace manipulation. These functions are essential for normalizing user input, generating consistent resource names, and formatting strings for APIs.

## chomp()

The `chomp()` function removes trailing newline characters from a string:

```hcl
> chomp("hello\n")
"hello"

> chomp("hello\r\n")
"hello"

> chomp("hello")
"hello"
```

Useful when reading files or variables that may have trailing newlines:

```hcl
locals {
  script_content = chomp(file("${path.module}/scripts/init.sh"))
}
```

## lower()

Converts all characters to lowercase:

```hcl
> lower("HELLO WORLD")
"hello world"

> lower("MyBucketName")
"mybucketname"
```

Use it to normalize resource names to meet AWS/GCP naming requirements:

```hcl
locals {
  bucket_name = lower("${var.project}-${var.environment}-logs")
  # "myproject-prod-logs" - always lowercase
}

resource "aws_s3_bucket" "logs" {
  bucket = local.bucket_name
}
```

## upper()

Converts all characters to uppercase:

```hcl
> upper("hello world")
"HELLO WORLD"
```

```hcl
locals {
  env_tag = upper(var.environment)
  # "PROD" for tagging conventions that require uppercase
}
```

## title()

Converts the first letter of each word to uppercase:

```hcl
> title("hello world")
"Hello World"

> title("my database name")
"My Database Name"
```

```hcl
variable "team_name" {
  default = "platform engineering"
}

locals {
  display_name = title(var.team_name)
  # "Platform Engineering"
}

resource "aws_iam_group" "team" {
  name = replace(lower(var.team_name), " ", "-")
  # "platform-engineering"
}

resource "aws_iam_role" "team" {
  name = replace(lower(var.team_name), " ", "-")

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    DisplayName = local.display_name
    # "Platform Engineering"
  }
}
```

## Combining These Functions

```hcl
variable "resource_name" {
  description = "Name for the resource (any case)"
  type        = string
}

locals {
  # Normalize: lowercase, no spaces, no special chars
  safe_name = lower(replace(var.resource_name, " ", "-"))
}

resource "aws_ecr_repository" "app" {
  name = local.safe_name
}

output "normalized_name" {
  value = local.safe_name
}
```

## Conclusion

`chomp`, `lower`, `upper`, and `title` are foundational string functions for normalizing text in OpenTofu. Use `lower()` for most resource naming (cloud providers prefer lowercase), `upper()` for environment tags and constants, `title()` for display names, and `chomp()` when dealing with file content.

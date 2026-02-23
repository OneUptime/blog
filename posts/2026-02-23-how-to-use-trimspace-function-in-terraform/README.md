# How to Use the trimspace Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the trimspace function in Terraform to remove leading and trailing whitespace from strings, with practical examples for input validation and data cleanup.

---

Extra whitespace in configuration values is a surprisingly common source of bugs. An invisible space at the end of an API key, a tab character before a hostname, or a newline after a password can cause authentication failures, DNS resolution errors, and other hard-to-debug issues. The `trimspace` function strips all leading and trailing whitespace from a string.

## What Does trimspace Do?

The `trimspace` function removes spaces, tabs, newlines, and other whitespace characters from both the beginning and end of a string. Characters in the middle of the string are left untouched.

```hcl
# Basic syntax
trimspace(string)
```

It handles all Unicode whitespace characters, not just ASCII spaces.

## Basic Examples

```hcl
# Remove leading and trailing spaces
> trimspace("  hello  ")
"hello"

# Remove tabs
> trimspace("\thello\t")
"hello"

# Remove newlines
> trimspace("\nhello\n")
"hello"

# Remove mixed whitespace
> trimspace("  \t\n  hello  \n\t  ")
"hello"

# Interior whitespace is preserved
> trimspace("  hello   world  ")
"hello   world"

# Already clean - no change
> trimspace("hello")
"hello"

# Empty string
> trimspace("")
""
```

## Reading Files Safely

When you read files with the `file` function, they often contain trailing whitespace or newlines. Always clean them up.

```hcl
locals {
  # Read and clean a version file
  version = trimspace(file("${path.module}/VERSION"))

  # Read and clean an API key
  api_key = trimspace(file("${path.module}/secrets/api-key.txt"))

  # Read and clean a certificate fingerprint
  cert_fingerprint = trimspace(file("${path.module}/cert-fingerprint.txt"))
}

resource "aws_ssm_parameter" "version" {
  name  = "/myapp/version"
  type  = "String"
  value = local.version
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/myapp/api-key"
  type  = "SecureString"
  value = local.api_key
}
```

Without `trimspace`, a trailing newline in `VERSION` might cause your application to display "1.2.3\n" instead of "1.2.3".

## Input Variable Cleanup

Normalize user-provided variable values to avoid whitespace issues.

```hcl
variable "database_host" {
  description = "Database hostname"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "database_user" {
  description = "Database username"
  type        = string
}

locals {
  # Clean all database connection parameters
  db_host = trimspace(var.database_host)
  db_name = trimspace(var.database_name)
  db_user = trimspace(var.database_user)

  # Build the connection string with clean values
  connection_string = "postgresql://${local.db_user}@${local.db_host}:5432/${local.db_name}"
}
```

## Variable Validation

Check that variables do not contain leading or trailing whitespace.

```hcl
variable "hostname" {
  description = "Server hostname"
  type        = string

  validation {
    condition     = var.hostname == trimspace(var.hostname)
    error_message = "Hostname must not contain leading or trailing whitespace."
  }
}

variable "api_key" {
  description = "API key for the service"
  type        = string
  sensitive   = true

  validation {
    condition     = var.api_key == trimspace(var.api_key)
    error_message = "API key must not contain leading or trailing whitespace. Check for accidental spaces or newlines."
  }
}
```

This catches common copy-paste errors where whitespace gets included accidentally.

## Processing External Data

When reading from data sources or external commands, whitespace cleanup is often necessary.

```hcl
data "external" "git_commit" {
  program = ["bash", "-c", "echo '{\"commit\": \"'$(git rev-parse HEAD)'\"}'"]
}

locals {
  # External data might include trailing newlines
  git_commit = trimspace(data.external.git_commit.result["commit"])
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    GitCommit = local.git_commit
  }
}
```

## Cleaning Map Values in Bulk

Apply `trimspace` across all values in a map.

```hcl
variable "environment_vars" {
  type = map(string)
  default = {
    API_URL   = "  https://api.example.com  "
    DB_HOST   = " db.internal.example.com "
    CACHE_URL = "\tredis://cache.internal\t"
    LOG_LEVEL = " info\n"
  }
}

locals {
  clean_env_vars = {
    for key, value in var.environment_vars :
    trimspace(key) => trimspace(value)
  }
  # {
  #   API_URL   = "https://api.example.com"
  #   DB_HOST   = "db.internal.example.com"
  #   CACHE_URL = "redis://cache.internal"
  #   LOG_LEVEL = "info"
  # }
}
```

## Working with Heredoc Strings

Heredoc strings in Terraform can introduce unwanted whitespace. Use `trimspace` to clean them up.

```hcl
locals {
  # The indented heredoc (<<-) strips leading indentation
  # but may still have leading/trailing newlines
  message = trimspace(<<-EOT
    This is a multi-line
    configuration value
    that should be clean.
  EOT
  )
  # Result: "This is a multi-line\nconfiguration value\nthat should be clean."
}
```

## Processing CSV Input

When parsing comma-separated values, individual entries often have extra spaces.

```hcl
variable "ip_allowlist" {
  description = "Comma-separated list of allowed IP addresses"
  type        = string
  default     = "10.0.1.1 , 10.0.2.1 , 10.0.3.1 , 10.0.4.1"
}

locals {
  # Split and trim each IP address
  allowed_ips = [
    for ip in split(",", var.ip_allowlist) :
    trimspace(ip)
  ]
  # Result: ["10.0.1.1", "10.0.2.1", "10.0.3.1", "10.0.4.1"]
}

resource "aws_security_group_rule" "allow_ips" {
  count             = length(local.allowed_ips)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["${local.allowed_ips[count.index]}/32"]
  security_group_id = aws_security_group.app.id
}
```

## trimspace vs chomp vs trim

Each function handles different types of cleanup.

```hcl
locals {
  test_string = "  hello world  \n"

  # trimspace: removes ALL whitespace from both ends
  trimspaced = trimspace(local.test_string)
  # "hello world"

  # chomp: removes only trailing newlines
  chomped = chomp(local.test_string)
  # "  hello world  "

  # trim: removes specific characters from both ends
  trimmed = trim(local.test_string, " ")
  # "hello world  \n" (only removes spaces, not the newline)
}
```

Use `trimspace` as your general-purpose whitespace cleanup. Use [chomp](https://oneuptime.com/blog/post/2026-02-23-how-to-use-chomp-function-in-terraform/view) when you specifically want to keep spaces but remove newlines. Use [trim](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trim-function-in-terraform/view) when you need to remove specific characters.

## Combining with Other String Functions

Build clean processing pipelines.

```hcl
locals {
  raw_name = "  My Application Name  \n"

  # Clean, lowercase, and slugify
  slug = replace(lower(trimspace(local.raw_name)), " ", "-")
  # Result: "my-application-name"
}
```

## Real-World Pattern: Terraform Cloud Variables

When Terraform Cloud workspace variables are set via the UI, users sometimes accidentally include whitespace.

```hcl
variable "tfc_workspace_name" {
  description = "Terraform Cloud workspace name"
  type        = string
}

locals {
  workspace = trimspace(var.tfc_workspace_name)
}

data "tfe_workspace" "current" {
  name         = local.workspace
  organization = "my-org"
}
```

## Summary

The `trimspace` function should be one of your most frequently used string functions in Terraform. Apply it whenever you read files, accept user input, process external data, or work with heredoc strings. Whitespace bugs are invisible and frustrating to debug, so proactively trimming your strings prevents a whole category of issues. It is a small function with a big impact on configuration reliability.

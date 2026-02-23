# How to Use the chomp Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the chomp function in Terraform to remove trailing newline characters from strings, with practical examples and real-world use cases.

---

If you have ever loaded a file into a Terraform variable and ended up with a mysterious trailing newline breaking your configuration, the `chomp` function is exactly what you need. It strips trailing newline characters from the end of a string, giving you clean values to work with.

## What Does chomp Do?

The `chomp` function removes newline characters (`\n`) and carriage return plus newline sequences (`\r\n`) from the end of a string. It only removes these characters from the end - never from the beginning or middle. This behavior mirrors the `chomp` function found in languages like Perl and Ruby.

```hcl
# Basic syntax
chomp(string)
```

The function accepts a single string argument and returns the string with trailing newlines removed.

## Basic Examples

Let us start with some straightforward examples you can try in the Terraform console.

```hcl
# Remove a single trailing newline
> chomp("hello\n")
"hello"

# Remove a trailing carriage return + newline (Windows-style)
> chomp("hello\r\n")
"hello"

# Multiple trailing newlines are all removed
> chomp("hello\n\n\n")
"hello"

# No trailing newline - string is returned unchanged
> chomp("hello")
"hello"

# Newlines in the middle are preserved
> chomp("hello\nworld\n")
"hello\nworld"

# Empty string stays empty
> chomp("")
""
```

Notice that `chomp` only touches trailing newlines. Any newlines appearing within the body of the string remain untouched.

## Reading Files with chomp

The most common use case for `chomp` is when reading external files. Many text editors add a trailing newline at the end of files, and this can cause issues in your Terraform configurations.

```hcl
# Suppose you have a file called "api_key.txt" that contains:
# sk-abc123def456
# (followed by a newline character)

locals {
  # Without chomp, this might include a trailing newline
  raw_api_key = file("${path.module}/api_key.txt")

  # With chomp, the newline is stripped
  api_key = chomp(file("${path.module}/api_key.txt"))
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/myapp/api-key"
  type  = "SecureString"
  # Use the chomped version to avoid storing the newline
  value = local.api_key
}
```

Without `chomp`, you might store `"sk-abc123def456\n"` in your SSM parameter, which would cause authentication failures when your application reads that value.

## Using chomp with Heredoc Strings

Terraform heredoc syntax often introduces trailing newlines that you need to clean up.

```hcl
locals {
  # This heredoc will have a trailing newline
  greeting_raw = <<-EOT
    Hello, World!
  EOT

  # chomp removes it
  greeting = chomp(<<-EOT
    Hello, World!
  EOT
  )
}

output "greeting" {
  value = local.greeting
  # Output: "Hello, World!" (no trailing newline)
}
```

This is particularly useful when constructing multi-line configuration blocks that will be passed to other resources.

## Combining chomp with Other Functions

The `chomp` function works well in combination with other string manipulation functions.

```hcl
locals {
  # Read a file, chomp the trailing newline, then convert to lowercase
  normalized_env = lower(chomp(file("${path.module}/environment.txt")))

  # Read a version file and trim all whitespace
  # chomp handles newlines, trimspace handles any remaining whitespace
  version = trimspace(chomp(file("${path.module}/VERSION")))
}

# Use the clean value in resource configuration
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.micro"

  tags = {
    Environment = local.normalized_env
    Version     = local.version
  }
}
```

## Real-World Use Case: SSH Keys

When loading SSH public keys from files, trailing newlines can cause problems with cloud provider APIs.

```hcl
variable "ssh_key_path" {
  description = "Path to the SSH public key file"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  # chomp ensures no trailing newline in the key material
  public_key = chomp(file(var.ssh_key_path))
}
```

Some cloud provider APIs will reject SSH keys that contain trailing newlines, making `chomp` essential here.

## Real-World Use Case: Reading Certificates

Certificate files often come with trailing newlines, and passing those into resources can cause validation errors.

```hcl
locals {
  # Read and clean certificate files
  tls_cert = chomp(file("${path.module}/certs/server.crt"))
  tls_key  = chomp(file("${path.module}/certs/server.key"))
}

resource "aws_iam_server_certificate" "app" {
  name             = "app-cert"
  certificate_body = local.tls_cert
  private_key      = local.tls_key
}
```

## chomp vs trimspace

A common question is when to use `chomp` versus `trimspace`. Here is the difference:

```hcl
locals {
  test_string = "  hello  \n"

  # chomp only removes trailing newlines
  chomped = chomp(local.test_string)
  # Result: "  hello  "

  # trimspace removes all leading and trailing whitespace
  trimmed = trimspace(local.test_string)
  # Result: "hello"
}
```

Use `chomp` when you want to preserve leading whitespace and trailing spaces but only remove newlines at the end. Use `trimspace` when you want to strip all whitespace from both ends.

## Using chomp in Validation Blocks

You can use `chomp` inside variable validation to ensure input values are clean.

```hcl
variable "project_name" {
  description = "Name of the project"
  type        = string

  validation {
    condition     = chomp(var.project_name) == var.project_name
    error_message = "Project name must not contain trailing newline characters."
  }
}
```

This prevents users from accidentally passing values with trailing newlines through `.tfvars` files or environment variables.

## When chomp Has No Effect

It is worth noting that `chomp` does nothing in these situations:

```hcl
# No trailing newline present
> chomp("already clean")
"already clean"

# Leading newlines are untouched
> chomp("\nhello")
"\nhello"

# Trailing spaces are untouched (only newlines are removed)
> chomp("hello   ")
"hello   "

# Trailing tabs are untouched
> chomp("hello\t")
"hello\t"
```

If you need to remove other types of whitespace, look at `trim`, `trimspace`, `trimprefix`, or `trimsuffix` instead.

## Summary

The `chomp` function is a small but important tool in your Terraform toolkit. Use it whenever you read external files, work with heredoc strings, or process any string data that might have trailing newlines. It prevents subtle bugs that arise from invisible characters sneaking into your configuration values.

For related string manipulation techniques, check out our posts on [trimspace](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimspace-function-in-terraform/view) and [trim](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trim-function-in-terraform/view) functions.

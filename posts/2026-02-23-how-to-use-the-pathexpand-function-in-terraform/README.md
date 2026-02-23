# How to Use the pathexpand Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, File Paths, HCL

Description: Learn how to use Terraform's pathexpand function to resolve tilde-based home directory paths into absolute filesystem paths in your configurations.

---

When writing Terraform configurations, you often need to reference files on the local filesystem. SSH keys, certificates, configuration files - they all live somewhere on disk, and many of them reside in home directories. The `pathexpand` function helps you handle the common `~` (tilde) notation that Unix-like systems use to represent home directories.

## What Does pathexpand Do?

The `pathexpand` function takes a filesystem path string and expands any leading tilde (`~`) character to the current user's home directory. If the path does not begin with a tilde, `pathexpand` returns the path unchanged.

```hcl
# Expands ~ to the home directory
# On a Linux system where the user is "deploy", this returns "/home/deploy/.ssh/id_rsa"
output "ssh_key_path" {
  value = pathexpand("~/.ssh/id_rsa")
}
```

This is particularly useful because Terraform itself does not automatically interpret the tilde character in file paths. If you pass `~/.ssh/id_rsa` directly to a resource or function like `file()`, Terraform will look for a literal directory named `~` rather than expanding it to your home directory.

## Basic Syntax

The syntax is straightforward:

```hcl
pathexpand(path)
```

Where `path` is a string containing a filesystem path. The function returns a string with the tilde expanded.

## Practical Examples

### Reading an SSH Key

One of the most common use cases is reading SSH keys for provisioners or cloud resources:

```hcl
# Read the user's public SSH key for use in cloud instances
resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  # pathexpand resolves ~ before file() reads the key
  public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
}
```

Without `pathexpand`, the `file()` function would fail because it cannot resolve the tilde on its own.

### Setting Up Provider Configurations

Some providers need paths to credential files stored in home directories:

```hcl
# Use pathexpand to locate kubeconfig in the user's home directory
provider "kubernetes" {
  config_path = pathexpand("~/.kube/config")
}
```

### Working with Local Files

You might want to reference configuration files that live relative to the home directory:

```hcl
# Read a custom configuration file from the home directory
locals {
  # Expand the path first, then read the file contents
  app_config = yamldecode(file(pathexpand("~/.myapp/config.yaml")))
}
```

### Using Variables with pathexpand

You can combine `pathexpand` with variables for flexibility:

```hcl
variable "ssh_key_path" {
  description = "Path to the SSH private key"
  type        = string
  default     = "~/.ssh/id_rsa"
}

# The variable might contain a tilde, so we expand it
resource "null_resource" "provisioner" {
  connection {
    type        = "ssh"
    host        = aws_instance.web.public_ip
    user        = "ubuntu"
    private_key = file(pathexpand(var.ssh_key_path))
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected successfully'"]
  }
}
```

This approach lets users provide either a tilde-prefixed path or an absolute path in their variable definitions. The `pathexpand` function handles both gracefully.

## Combining pathexpand with abspath

Sometimes you want both tilde expansion and an absolute path. You can chain `pathexpand` with `abspath`:

```hcl
# First expand the tilde, then resolve to an absolute path
locals {
  # This handles both ~ expansion and relative path resolution
  config_file = abspath(pathexpand("~/projects/config.json"))
}
```

This combination covers all possible path formats a user might provide.

## Behavior on Different Operating Systems

The `pathexpand` function works on all platforms Terraform supports, but the expanded path naturally differs:

- On Linux: `~` expands to something like `/home/username`
- On macOS: `~` expands to something like `/Users/username`
- On Windows: `~` expands to something like `C:\Users\username`

Keep this in mind when writing configurations that need to be portable across platforms.

## Edge Cases to Watch For

### Paths Without a Tilde

If the path does not start with `~`, the function returns it as-is:

```hcl
# Returns "/etc/ssl/certs/ca.pem" unchanged
output "cert_path" {
  value = pathexpand("/etc/ssl/certs/ca.pem")
}
```

### Other User Home Directories

The `~username` syntax (referencing another user's home directory) is also supported on Unix-like systems:

```hcl
# Expands to the home directory of the "deploy" user
# For example: /home/deploy/.ssh/authorized_keys
output "deploy_keys" {
  value = pathexpand("~deploy/.ssh/authorized_keys")
}
```

### Empty Strings

Passing an empty string returns an empty string. There is no error, but it is not particularly useful either.

## When to Use pathexpand

Use `pathexpand` when:

- You are reading local files that might be in a user's home directory
- You accept file path inputs from variables that users might provide with tilde notation
- You are configuring providers that need local credential paths
- You are working with SSH keys, kubeconfig files, or similar user-specific files

Avoid relying on `pathexpand` in production modules that will run in CI/CD pipelines where the home directory may not contain the expected files. In those cases, use absolute paths or environment variables instead.

## A Complete Example

Here is a complete working example that uses `pathexpand` to set up an EC2 instance with SSH access:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

variable "key_path" {
  description = "Path to your SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

# Upload the SSH public key to AWS
resource "aws_key_pair" "main" {
  key_name   = "terraform-key"
  public_key = file(pathexpand(var.key_path))
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.main.key_name

  tags = {
    Name = "web-server"
  }
}

# Output the expanded path for reference
output "expanded_key_path" {
  value = pathexpand(var.key_path)
}
```

## Summary

The `pathexpand` function is a small but essential utility in Terraform. It bridges the gap between how users typically reference files in their home directories (using `~`) and how Terraform needs to resolve those paths (as absolute paths). Whenever you work with local files in Terraform configurations, keep `pathexpand` in your toolkit to handle tilde-based paths cleanly and reliably.

For related path handling, check out our post on [how to use the abspath function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-abspath-function-in-terraform/view).

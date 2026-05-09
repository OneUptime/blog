# How to Use the pathexpand Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the pathexpand function in OpenTofu to expand tilde (~) in file paths for reading user home directory files like SSH keys.

## Introduction

The `pathexpand` function in OpenTofu expands the tilde (`~`) in a filesystem path to the current user's home directory. This enables the use of `~/.ssh/id_rsa.pub`-style paths in your configurations, making them portable across users and systems.

## Syntax

```hcl
pathexpand(path)
```

- Replaces a leading `~` segment with the current user's home directory (typically the value of `$HOME`)
- Returns the path unchanged if it doesn't start with `~`
- Operates on the string only - it does not access the filesystem

## Basic Examples

```hcl
output "expanded_home" {
  value = pathexpand("~")
  # Returns "/home/myuser" or "/Users/myuser" on macOS
}

output "expanded_ssh_key" {
  value = pathexpand("~/.ssh/id_rsa.pub")
  # Returns "/home/myuser/.ssh/id_rsa.pub"
}

output "not_tilde" {
  value = pathexpand("/etc/hosts")
  # Returns "/etc/hosts" (unchanged)
}
```

## Practical Use Cases

### Reading the User's SSH Public Key

```hcl
variable "ssh_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}

locals {
  expanded_key_path = pathexpand(var.ssh_key_path)
}

resource "aws_key_pair" "developer" {
  key_name   = "developer-key"
  public_key = file(local.expanded_key_path)
}
```

### Cross-Platform Config File Reading

```hcl
locals {
  kube_config_path = pathexpand("~/.kube/config")
}

provider "kubernetes" {
  config_path = local.kube_config_path
}
```

### AWS Credentials File

```hcl
locals {
  aws_config_path = pathexpand("~/.aws/credentials")
  aws_config_exists = fileexists(local.aws_config_path)
}
```

### Optional Local Certificate File

```hcl
variable "cert_path" {
  type    = string
  default = "~/.local/share/certs/ca.crt"
}

locals {
  expanded_cert = pathexpand(var.cert_path)
  cert_exists   = fileexists(local.expanded_cert)
  cert_content  = local.cert_exists ? file(local.expanded_cert) : null
}
```

### Home Directory Scripts

```hcl
variable "setup_script" {
  type    = string
  default = "~/scripts/setup.sh"
}

resource "null_resource" "run_setup" {
  provisioner "local-exec" {
    command = pathexpand(var.setup_script)
  }
}
```

## Step-by-Step Usage

1. Identify paths that may use `~` for the home directory.
2. Apply `pathexpand(path)` before using in `file()` or `fileexists()`.
3. Test in `tofu console`:

```bash
tofu console

> pathexpand("~/Desktop")
"/Users/myuser/Desktop"
> pathexpand("/absolute/path")
"/absolute/path"
```

## Combining with fileexists

```hcl
locals {
  key_path   = pathexpand("~/.ssh/id_ed25519.pub")
  key_exists = fileexists(local.key_path)
}

resource "aws_key_pair" "main" {
  count      = local.key_exists ? 1 : 0
  key_name   = "my-key"
  public_key = file(local.key_path)
}
```

## Conclusion

The `pathexpand` function makes OpenTofu configurations portable across different users and systems by resolving `~` references in file paths. Use it whenever variables or defaults might contain `~`-prefixed paths, particularly for SSH keys, kubeconfig files, and user-specific scripts.

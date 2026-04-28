# How to Use the bcrypt Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the bcrypt function in OpenTofu to hash passwords securely for user account provisioning and initial credential setup.

## Introduction

The `bcrypt` function in OpenTofu computes a bcrypt hash of a given string. bcrypt is a password hashing algorithm designed to be computationally expensive, making it resistant to brute-force attacks. Use it when provisioning user accounts that require hashed passwords in your infrastructure.

## Syntax

```hcl
bcrypt(string, cost)
```

- **string** - the password or string to hash
- **cost** - optional cost factor (default is 10; range 4-31)
- Returns a bcrypt hash string

**Important:** bcrypt generates a different hash each time (even for the same input) due to random salt generation. This means the resource will show a diff on every `tofu plan`. Use with caution in sensitive resources.

## Basic Examples

```hcl
output "hashed_password" {
  sensitive = true
  value     = bcrypt("mysecretpassword")
  # Returns something like: $2a$10$...
}

output "high_cost_hash" {
  sensitive = true
  value = bcrypt("mysecretpassword", 12)
}
```

## Practical Use Cases

### Linux User Password in Cloud-Init

```hcl
variable "admin_password" {
  type      = string
  sensitive = true
}

locals {
  # bcrypt hash for Linux shadow file
  hashed_password = bcrypt(var.admin_password)

  cloud_init = templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
    hashed_password = local.hashed_password
    username        = var.admin_username
  })
}

resource "aws_instance" "jumpbox" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  user_data     = base64encode(local.cloud_init)

  tags = {
    Name = "jumpbox"
  }
}
```

Cloud-init template:
```yaml
# cloud-init.yaml.tpl

#cloud-config
users:
  - name: ${username}
    lock_passwd: false
    passwd: ${hashed_password}
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    shell: /bin/bash
```

### Initial Database Password Hash

```hcl
variable "db_root_password" {
  type      = string
  sensitive = true
}

locals {
  hashed_db_password = bcrypt(var.db_root_password, 12)
}

resource "aws_ssm_parameter" "db_password_hash" {
  name      = "/app/db/password-hash"
  type      = "SecureString"
  value     = local.hashed_db_password
  sensitive = true
}
```

### HTPasswd for Basic Auth

```hcl
variable "nginx_password" {
  type      = string
  sensitive = true
}

variable "nginx_username" {
  type    = string
  default = "admin"
}

locals {
  # Generate htpasswd-format entry
  htpasswd_entry  = "${var.nginx_username}:${bcrypt(var.nginx_password)}"
}

resource "kubernetes_secret" "nginx_auth" {
  metadata {
    name      = "nginx-basic-auth"
    namespace = "default"
  }

  data = {
    auth = local.htpasswd_entry
  }
}
```

## Step-by-Step Usage

1. Identify passwords that need bcrypt hashing.
2. Use `bcrypt(password)` or `bcrypt(password, cost)`.
3. Store the hash (not the plaintext) in your configuration.
4. Be aware the hash changes on each `plan` - consider storing in a separate resource or using `ignore_changes`.

```bash
tofu console

> bcrypt("test", 4)  # Fast, low cost for testing
"$2a$04$..."
```

## Handling Plan Diffs

Since bcrypt uses random salts, the hash changes on every run - even when the input string is unchanged. Wrapping a stable input (like `random_password`) in `bcrypt()` does not help, because the salt is regenerated on every call. The practical workaround is to apply `lifecycle.ignore_changes` to the attribute that holds the hash, so the resource is not updated on subsequent plans:

```hcl
resource "random_password" "app_password" {
  length  = 16
  special = true
}

resource "kubernetes_secret" "app_credentials" {
  metadata {
    name = "app-credentials"
  }

  data = {
    password_hash = bcrypt(random_password.app_password.result)
  }

  lifecycle {
    ignore_changes = [data]
  }
}
```

## Security Considerations

- Higher cost = slower hash = more brute-force resistant (cost 12+ recommended for production)
- The default cost of 10 is acceptable for most use cases
- Never log or output bcrypt hashes without `sensitive = true`

## Conclusion

The `bcrypt` function in OpenTofu provides production-quality password hashing for user account provisioning. Use it when you need to embed hashed passwords in cloud-init scripts, create initial database user accounts, or configure basic authentication for services. Always mark outputs containing bcrypt hashes as `sensitive`.

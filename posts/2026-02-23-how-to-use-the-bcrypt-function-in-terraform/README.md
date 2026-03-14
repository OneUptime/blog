# How to Use the bcrypt Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Security, Password Hashing, Bcrypt, Infrastructure as Code

Description: Learn how to use Terraform's bcrypt function to securely hash passwords for use in infrastructure provisioning and user account configuration.

---

When provisioning infrastructure, you sometimes need to set up user accounts with passwords - for databases, operating systems, or application services. Storing plaintext passwords in Terraform state or configurations is a serious security risk. The `bcrypt` function lets you hash passwords securely, so you can store and transmit hashed values instead of plaintext.

## What Does the bcrypt Function Do?

The `bcrypt` function computes a bcrypt hash of a given string (typically a password). Bcrypt is a password-hashing algorithm specifically designed to be slow and computationally expensive, making brute-force attacks impractical.

```hcl
# Hash a password using bcrypt
output "hashed_password" {
  value     = bcrypt("my-secret-password")
  sensitive = true
  # Result: something like "$2a$10$R5N9..." (60 characters)
}
```

## Syntax

```hcl
bcrypt(string, cost)
```

- `string` - The plaintext string to hash
- `cost` (optional) - The bcrypt cost factor, which controls how computationally expensive the hash is. Defaults to 10. Higher values are slower but more secure.

## Why bcrypt Instead of SHA-256 or MD5?

Regular hash functions like SHA-256 and MD5 are designed to be fast. That is great for change detection but terrible for password hashing, because attackers can try billions of guesses per second.

Bcrypt is intentionally slow. A cost factor of 10 means the algorithm performs 2^10 (1,024) iterations of its internal function. Increasing the cost by 1 doubles the time required:

```hcl
# Cost 10 (default) - about 100ms per hash
output "default_cost" {
  value     = bcrypt("password123", 10)
  sensitive = true
}

# Cost 12 - about 400ms per hash (4x slower than cost 10)
output "higher_cost" {
  value     = bcrypt("password123", 12)
  sensitive = true
}
```

## Important Behavior: Non-Deterministic Output

Unlike every other hash function in Terraform, bcrypt is non-deterministic. Each call produces a different hash because bcrypt includes a random salt. This means:

1. Running `terraform plan` will always show the bcrypt output as changed
2. You should use `ignore_changes` in lifecycle blocks for resources that use bcrypt
3. The state file will contain the hash, not the plaintext

```hcl
# Each call produces a different hash
output "hash_1" {
  value     = bcrypt("same-password")
  sensitive = true
  # e.g., "$2a$10$R5N9GhLqW..."
}

output "hash_2" {
  value     = bcrypt("same-password")
  sensitive = true
  # e.g., "$2a$10$Kf8mPx3Jn..." (different from hash_1!)
}
```

## Practical Examples

### Setting Up Linux User Passwords

When provisioning servers that need user accounts with passwords:

```hcl
variable "admin_password" {
  description = "Admin user password"
  type        = string
  sensitive   = true
}

resource "aws_instance" "server" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    # Create an admin user with a bcrypt-hashed password
    useradd -m admin
    echo "admin:${bcrypt(var.admin_password)}" | chpasswd -e
  EOF

  # Prevent Terraform from recreating the instance on every plan
  # because bcrypt generates a new hash each time
  lifecycle {
    ignore_changes = [user_data]
  }

  tags = {
    Name = "app-server"
  }
}
```

### Database User Provisioning

Some database systems accept bcrypt-hashed passwords:

```hcl
variable "db_users" {
  description = "Database users and their passwords"
  type = map(object({
    password = string
    role     = string
  }))
  sensitive = true
}

locals {
  # Pre-hash all passwords
  hashed_users = {
    for name, user in var.db_users : name => {
      password_hash = bcrypt(user.password)
      role          = user.role
    }
  }
}

# Generate a SQL script to create users
resource "local_file" "create_users" {
  filename = "${path.module}/generated/create_users.sql"
  content = join("\n", [
    for name, user in local.hashed_users :
    "CREATE USER '${name}' WITH PASSWORD '${user.password_hash}' ROLE '${user.role}';"
  ])

  # Sensitive because it contains hashed passwords
  file_permission = "0600"

  lifecycle {
    ignore_changes = [content]
  }
}
```

### Application Configuration with Hashed Secrets

When your application expects bcrypt-hashed values in its configuration:

```hcl
variable "api_key" {
  description = "API key for the application"
  type        = string
  sensitive   = true
}

locals {
  # Hash the API key for storage in the application config
  app_config = jsonencode({
    server = {
      port = 8080
      host = "0.0.0.0"
    }
    auth = {
      # Store a hashed version of the API key
      api_key_hash = bcrypt(var.api_key)
      cost_factor  = 10
    }
  })
}

resource "aws_ssm_parameter" "app_config" {
  name  = "/${var.environment}/app-config"
  type  = "SecureString"
  value = local.app_config

  lifecycle {
    # The bcrypt hash changes every apply, so ignore content changes
    ignore_changes = [value]
  }
}
```

### Using with the ignore_changes Lifecycle

Since bcrypt is non-deterministic, you almost always need `ignore_changes`:

```hcl
resource "null_resource" "setup" {
  triggers = {
    # Do NOT use bcrypt in triggers - it changes every time
    # Instead, use a deterministic hash for change detection
    password_indicator = sha256(var.admin_password)
  }

  provisioner "local-exec" {
    # Use bcrypt only in the actual command, not in triggers
    command = "setup-user --password-hash '${bcrypt(var.admin_password)}'"
  }
}
```

## Cost Factor Guidelines

The cost factor should be high enough to make brute-force attacks impractical, but low enough to not slow down your Terraform runs excessively:

```hcl
locals {
  # Rough timing guidelines (varies by hardware):
  # Cost 8  - ~25ms (minimum recommended)
  # Cost 10 - ~100ms (default, good for most cases)
  # Cost 12 - ~400ms (good for high-security passwords)
  # Cost 14 - ~1.6s (slow but very secure)
  # Cost 16 - ~6.4s (very slow, only for extreme security needs)

  # For Terraform use cases, 10-12 is usually appropriate
  hashed = bcrypt(var.password, 12)
}
```

## Handling State File Security

When you use bcrypt in Terraform, the hash ends up in the state file. While this is much better than storing plaintext, you should still protect your state:

1. Use remote state with encryption (S3 with SSE, Azure Storage with encryption)
2. Enable state locking to prevent corruption
3. Restrict access to the state file with IAM policies or RBAC

```hcl
# Example: secure remote state configuration
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true  # Enable server-side encryption
    dynamodb_table = "terraform-locks"  # Enable state locking
  }
}
```

## Summary

The `bcrypt` function fills an important niche in Terraform: secure password hashing. Unlike `md5`, `sha1`, or `sha256`, bcrypt is specifically designed for passwords with its built-in salt and adjustable cost factor. The trade-off is that it is non-deterministic, requiring `ignore_changes` lifecycle rules in most cases. Use it whenever you need to provision passwords in your infrastructure, and always mark the inputs and outputs as sensitive. For regular content hashing needs, stick with [sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha256-function-in-terraform/view) or [md5](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-md5-function-in-terraform/view).

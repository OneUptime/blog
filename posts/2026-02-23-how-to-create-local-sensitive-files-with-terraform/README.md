# How to Create Local Sensitive Files with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Local Provider, Sensitive Files, Security, Infrastructure as Code

Description: Learn how to create local sensitive files with Terraform using local_sensitive_file for secrets, private keys, credentials, and other confidential data with restricted permissions.

---

When working with infrastructure as code, you often need to write sensitive data to the local filesystem. Private keys, database credentials, API tokens, and configuration files containing secrets all need to be handled carefully. The local_sensitive_file resource in Terraform creates files with restricted permissions by default and marks the content as sensitive, preventing it from appearing in plan output or logs.

In this guide, we will cover creating sensitive files with Terraform, understanding the security differences between local_file and local_sensitive_file, and implementing patterns for securely managing credentials on disk.

## Understanding local_sensitive_file vs local_file

The key differences between local_sensitive_file and local_file are permission defaults and output handling. The sensitive file resource defaults to 0700 directory permissions and 0600 file permissions, meaning only the file owner can read or write the file. Additionally, the content is marked as sensitive in Terraform, so it will not appear in terraform plan or terraform apply output.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Creating a Sensitive Credentials File

```hcl
# credentials.tf - Write credentials with restricted permissions
resource "local_sensitive_file" "db_credentials" {
  filename = "${path.module}/secrets/db-credentials.env"
  content  = <<-EOT
    DB_HOST=${var.db_host}
    DB_PORT=5432
    DB_USERNAME=${var.db_username}
    DB_PASSWORD=${var.db_password}
    DB_NAME=appdb
    DB_SSL_MODE=require
  EOT

  # Explicit permissions (these are defaults for sensitive files)
  file_permission      = "0600"
  directory_permission = "0700"
}

variable "db_host" {
  type    = string
  default = "db.internal.example.com"
}

variable "db_username" {
  type    = string
  default = "admin"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "placeholder"
}
```

## Writing Private Keys

```hcl
# private-keys.tf - Write TLS private keys securely
resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name = "server.${var.environment}.example.com"
  }

  validity_period_hours = 8760

  allowed_uses = ["key_encipherment", "digital_signature", "server_auth"]
}

# Write the private key with restrictive permissions
resource "local_sensitive_file" "private_key" {
  filename        = "${path.module}/secrets/server.key"
  content         = tls_private_key.server.private_key_pem
  file_permission = "0600"
}

# The certificate is not sensitive - write with local_file
resource "local_file" "certificate" {
  filename        = "${path.module}/secrets/server.crt"
  content         = tls_self_signed_cert.server.cert_pem
  file_permission = "0644"
}
```

## Creating SSH Key Files

```hcl
# ssh-keys.tf - Write SSH keys to the filesystem
resource "tls_private_key" "ssh" {
  algorithm = "ED25519"
}

resource "local_sensitive_file" "ssh_private_key" {
  filename        = "${path.module}/secrets/id_ed25519"
  content         = tls_private_key.ssh.private_key_openssh
  file_permission = "0600"
}

resource "local_file" "ssh_public_key" {
  filename        = "${path.module}/secrets/id_ed25519.pub"
  content         = tls_private_key.ssh.public_key_openssh
  file_permission = "0644"
}
```

## Writing Kubeconfig Files

```hcl
# kubeconfig.tf - Sensitive Kubernetes configuration
resource "local_sensitive_file" "kubeconfig" {
  filename        = "${path.module}/secrets/kubeconfig"
  file_permission = "0600"

  content = yamlencode({
    apiVersion      = "v1"
    kind            = "Config"
    current-context = "${var.environment}-context"
    clusters = [{
      name = "${var.environment}-cluster"
      cluster = {
        server                     = var.k8s_endpoint
        certificate-authority-data = var.k8s_ca_cert
      }
    }]
    contexts = [{
      name = "${var.environment}-context"
      context = {
        cluster = "${var.environment}-cluster"
        user    = "admin"
      }
    }]
    users = [{
      name = "admin"
      user = {
        token = var.k8s_token
      }
    }]
  })
}

variable "k8s_endpoint" {
  type    = string
  default = "https://k8s.example.com"
}

variable "k8s_ca_cert" {
  type    = string
  default = "base64cert"
}

variable "k8s_token" {
  type      = string
  sensitive = true
  default   = "token"
}
```

## Writing Application Secret Files

```hcl
# app-secrets.tf - Application-specific secret files
variable "api_keys" {
  type      = map(string)
  sensitive = true
  default = {
    stripe    = "sk_test_placeholder"
    sendgrid  = "SG.placeholder"
    twilio    = "placeholder_token"
  }
}

resource "local_sensitive_file" "api_secrets" {
  filename = "${path.module}/secrets/api-keys.json"

  content = jsonencode({
    for name, key in var.api_keys : name => key
  })

  file_permission = "0600"
}
```

## Writing Multiple Sensitive Files

```hcl
# multi-secrets.tf - Generate sensitive files for multiple services
variable "service_secrets" {
  type = map(object({
    db_password   = string
    api_key       = string
    jwt_secret    = string
  }))
  sensitive = true
  default = {
    "api" = {
      db_password = "api-db-pass"
      api_key     = "api-key-123"
      jwt_secret  = "jwt-secret-abc"
    }
    "worker" = {
      db_password = "worker-db-pass"
      api_key     = "worker-key-456"
      jwt_secret  = "jwt-secret-def"
    }
  }
}

resource "local_sensitive_file" "service_secrets" {
  for_each = var.service_secrets

  filename = "${path.module}/secrets/${each.key}.env"
  content = join("\n", [
    "DB_PASSWORD=${each.value.db_password}",
    "API_KEY=${each.value.api_key}",
    "JWT_SECRET=${each.value.jwt_secret}",
  ])

  file_permission = "0600"
}
```

## Writing Binary Content

```hcl
# binary.tf - Write base64-encoded content
resource "local_sensitive_file" "binary_secret" {
  filename       = "${path.module}/secrets/keystore.p12"
  content_base64 = var.keystore_base64
  file_permission = "0600"
}

variable "keystore_base64" {
  type      = string
  sensitive = true
  default   = "cGxhY2Vob2xkZXI="  # base64 encoded "placeholder"
}
```

## Security Best Practices

When working with sensitive files in Terraform, always add the secrets directory to your .gitignore to prevent accidental commits. Encrypt your Terraform state since sensitive file content is stored there. Use short-lived credentials when possible and combine with time_rotating for automatic rotation.

```hcl
# gitignore.tf - Generate a .gitignore for the secrets directory
resource "local_file" "gitignore" {
  filename = "${path.module}/secrets/.gitignore"
  content  = "# Ignore all files in this directory\n*\n!.gitignore\n"
}
```

## Conclusion

The local_sensitive_file resource is essential for securely writing credentials, keys, and other sensitive data to the filesystem as part of your Terraform workflow. Its default restrictive permissions (0600 for files, 0700 for directories) and sensitive content handling provide a baseline of security. Always combine this with encrypted Terraform state, .gitignore rules, and short-lived credentials for a comprehensive security posture. For non-sensitive file operations, see our guide on [creating local files](https://oneuptime.com/blog/post/2026-02-23-how-to-create-local-files-with-terraform/view).

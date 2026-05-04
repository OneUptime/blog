# How to Configure Tls Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Tls provider in OpenTofu to manage Tls resources as code.

## Introduction

The Tls provider for OpenTofu enables managing Tls resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The TLS provider runs entirely locally and does not require any credentials, API keys, or remote endpoints. The provider block can be empty (or omitted entirely):

```hcl
provider "tls" {}
```

## Example Resource

Generate a private key and a self-signed certificate:

```hcl
resource "tls_private_key" "main" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "main" {
  private_key_pem = tls_private_key.main.private_key_pem

  subject {
    common_name  = "${var.name}.${var.environment}.example.com"
    organization = "ACME, Inc"
  }

  validity_period_hours = 8760

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "certificate_pem" {
  value     = tls_self_signed_cert.main.cert_pem
  sensitive = true
}

output "private_key_pem" {
  value     = tls_private_key.main.private_key_pem
  sensitive = true
}
```

## Best Practices

- Treat generated private keys as secrets — they are stored in plaintext in OpenTofu state, so use a remote backend with encryption and strict access controls
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Tls resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.

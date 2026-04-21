# How to Configure the TLS Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, TLS, SSL, Infrastructure as Code, IaC, Certificate

Description: Learn how to configure the TLS provider in OpenTofu to generate self-signed certificates, CSRs, and private keys.

## Introduction

This guide covers How to Configure the TLS Provider in OpenTofu using OpenTofu with practical examples and important security considerations.

## Prerequisites

- OpenTofu v1.6+
- A secured state backend if generated private keys are stored in state
- Basic understanding of OpenTofu concepts and TLS certificates

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "tls" {}
```

## Step 2: Set Up Certificate Inputs

```bash
# Use environment variables to set OpenTofu input variables
export TF_VAR_common_name="app.internal.example.com"
export TF_VAR_dns_names='["app.internal.example.com","localhost"]'
export TF_VAR_organization="Example Internal"
```

```hcl
variable "common_name" {
  description = "Primary DNS name for the certificate subject"
  type        = string
}

variable "organization" {
  description = "Organization name to include in the certificate subject"
  type        = string
}

variable "dns_names" {
  description = "DNS subject alternative names for the certificate"
  type        = list(string)
}
```

## Step 3: Create Basic Resources

```hcl
resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name  = var.common_name
    organization = var.organization
  }

  dns_names             = var.dns_names
  validity_period_hours = 8760
  early_renewal_hours   = 720

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name  = "${var.organization} Root CA"
    organization = var.organization
  }

  is_ca_certificate     = true
  validity_period_hours = 87600

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]
}

resource "tls_cert_request" "server" {
  private_key_pem = tls_private_key.server.private_key_pem
  dns_names       = var.dns_names

  subject {
    common_name  = var.common_name
    organization = var.organization
  }
}

resource "tls_locally_signed_cert" "server" {
  cert_request_pem   = tls_cert_request.server.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760
  early_renewal_hours   = 720

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Step 5: Define Outputs

```hcl
output "self_signed_certificate_pem" {
  description = "The generated self-signed certificate in PEM format"
  value       = tls_self_signed_cert.server.cert_pem
}

output "locally_signed_certificate_pem" {
  description = "The certificate signed by the local CA in PEM format"
  value       = tls_locally_signed_cert.server.cert_pem
}

output "certificate_request_pem" {
  description = "The generated certificate signing request in PEM format"
  value       = tls_cert_request.server.cert_request_pem
}

output "server_private_key_pem" {
  description = "The generated private key in PEM format"
  value       = tls_private_key.server.private_key_pem
  sensitive   = true
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### State File Exposure
Generated private keys are stored in OpenTofu state. Use encrypted remote state with strict access controls, or generate production private keys outside OpenTofu.

### Certificate Trust Warnings
Self-signed and locally signed certificates are not trusted by browsers or clients unless the certificate or local CA is added to the client's trust store.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the TLS provider in OpenTofu. This provider enables you to generate private keys, CSRs, and certificates as code, ensuring consistency and enabling GitOps workflows. Protect OpenTofu state carefully because generated private keys are stored there.

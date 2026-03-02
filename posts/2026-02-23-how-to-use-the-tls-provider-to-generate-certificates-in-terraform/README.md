# How to Use the TLS Provider to Generate Certificates in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TLS, Certificate, Security, Infrastructure as Code, PKI

Description: Learn how to use the Terraform TLS provider to generate private keys, self-signed certificates, CSRs, and locally-signed certificates for your infrastructure.

---

The TLS provider in Terraform enables you to generate cryptographic keys and certificates directly within your infrastructure code. This is invaluable for development environments, internal services, and bootstrapping PKI infrastructure. Instead of generating certificates externally and importing them, you can create them as part of your Terraform workflow, ensuring they are always available when the resources that need them are deployed.

In this guide, we will explore the TLS provider comprehensively. We will cover generating RSA and ECDSA private keys, creating self-signed certificates, generating certificate signing requests, and building a simple certificate authority chain.

## Installing the TLS Provider

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Generating Private Keys

The TLS provider supports both RSA and ECDSA key algorithms:

```hcl
# private-keys.tf - Generate cryptographic keys
# RSA key with 2048-bit strength (common for web servers)
resource "tls_private_key" "rsa_2048" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# RSA key with 4096-bit strength (higher security)
resource "tls_private_key" "rsa_4096" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# ECDSA key with P256 curve (modern, efficient)
resource "tls_private_key" "ecdsa_p256" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

# ECDSA key with P384 curve
resource "tls_private_key" "ecdsa_p384" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P384"
}

# ED25519 key (newest, most efficient)
resource "tls_private_key" "ed25519" {
  algorithm = "ED25519"
}
```

## Creating a Self-Signed CA Certificate

Build a certificate authority that can sign other certificates:

```hcl
# ca.tf - Create a self-signed Certificate Authority
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name         = "Internal CA - ${var.environment}"
    organization        = "Example Corp"
    organizational_unit = "Infrastructure"
    country             = "US"
    province            = "California"
    locality            = "San Francisco"
  }

  # CA certificate valid for 10 years
  validity_period_hours = 87600

  # This certificate can sign other certificates
  is_ca_certificate = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
    "digital_signature",
  ]
}

# Store the CA certificate
resource "aws_ssm_parameter" "ca_cert" {
  name  = "/${var.environment}/tls/ca-certificate"
  type  = "SecureString"
  value = tls_self_signed_cert.ca.cert_pem
}
```

## Creating Server Certificates Signed by the CA

```hcl
# server-cert.tf - Server certificate signed by internal CA
resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name  = "api.${var.domain}"
    organization = "Example Corp"
  }

  # Subject Alternative Names for the certificate
  dns_names = [
    "api.${var.domain}",
    "api.${var.environment}.${var.domain}",
    "*.api.${var.domain}",
    "localhost"
  ]

  ip_addresses = ["127.0.0.1"]
}

# Sign the server certificate with our CA
resource "tls_locally_signed_cert" "server" {
  cert_request_pem   = tls_cert_request.server.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  # Server certificate valid for 1 year
  validity_period_hours = 8760

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Creating a Self-Signed Certificate for Simple Use Cases

```hcl
# self-signed.tf - Quick self-signed certificate
resource "tls_private_key" "simple" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "simple" {
  private_key_pem = tls_private_key.simple.private_key_pem

  subject {
    common_name  = "dev.${var.domain}"
    organization = "Example Corp"
  }

  dns_names = ["dev.${var.domain}", "*.dev.${var.domain}"]

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Uploading Certificates to AWS

```hcl
# aws-upload.tf - Upload certificates to ACM and IAM
# Upload to ACM for use with ALB, CloudFront, etc.
resource "aws_acm_certificate" "server" {
  private_key       = tls_private_key.server.private_key_pem
  certificate_body  = tls_locally_signed_cert.server.cert_pem
  certificate_chain = tls_self_signed_cert.ca.cert_pem

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
    Domain      = "api.${var.domain}"
  }
}

# Store in Secrets Manager for application use
resource "aws_secretsmanager_secret" "tls" {
  name = "${var.environment}/tls/server"
}

resource "aws_secretsmanager_secret_version" "tls" {
  secret_id = aws_secretsmanager_secret.tls.id

  secret_string = jsonencode({
    private_key  = tls_private_key.server.private_key_pem
    certificate  = tls_locally_signed_cert.server.cert_pem
    ca_cert      = tls_self_signed_cert.ca.cert_pem
  })
}
```

## Generating SSH Keys

The TLS provider can also generate SSH key pairs:

```hcl
# ssh-keys.tf - Generate SSH keys for EC2
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key-${var.environment}"
  public_key = tls_private_key.ssh.public_key_openssh
}

# Store the private key in Secrets Manager
resource "aws_secretsmanager_secret" "ssh_key" {
  name = "${var.environment}/ssh/deploy-key"
}

resource "aws_secretsmanager_secret_version" "ssh_key" {
  secret_id     = aws_secretsmanager_secret.ssh_key.id
  secret_string = tls_private_key.ssh.private_key_pem
}

output "ssh_public_key" {
  value = tls_private_key.ssh.public_key_openssh
}
```

## Outputs

```hcl
# outputs.tf - Export certificate information
output "ca_cert_pem" {
  description = "CA certificate in PEM format"
  value       = tls_self_signed_cert.ca.cert_pem
  sensitive   = true
}

output "server_cert_validity" {
  description = "Server certificate validity period"
  value = {
    not_before = tls_locally_signed_cert.server.validity_start_time
    not_after  = tls_locally_signed_cert.server.validity_end_time
  }
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.server.arn
}
```

## Conclusion

The TLS provider is a powerful tool for managing certificates within your Terraform infrastructure. From generating private keys to building full CA chains, it handles the entire certificate lifecycle as code. This approach is especially valuable for development and staging environments where you need certificates quickly without going through a formal PKI process. For deeper dives, see our guides on [self-signed certificates](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-self-signed-certificates-with-terraform/view), [private keys](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-private-keys-with-terraform/view), and [certificate signing requests](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-certificate-signing-requests-with-terraform/view).

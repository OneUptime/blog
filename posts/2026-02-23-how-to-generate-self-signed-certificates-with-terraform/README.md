# How to Generate Self-Signed Certificates with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TLS, Self-Signed Certificates, Security, Infrastructure as Code

Description: Learn how to generate self-signed TLS certificates with Terraform for development environments, internal services, and testing using the tls_self_signed_cert resource.

---

Self-signed certificates are certificates that are signed by their own private key rather than by a trusted certificate authority. While they should not be used for public-facing production services, they are essential for development environments, internal service-to-service communication, testing TLS configurations, and bootstrapping infrastructure before proper certificates are obtained.

In this guide, we will cover generating self-signed certificates with Terraform using the tls_self_signed_cert resource. We will create certificates for various purposes, configure subject details and SANs, and integrate them with AWS services.

## Understanding Self-Signed Certificates

A self-signed certificate acts as both the issuer and the subject. Browsers and clients will show trust warnings because the certificate is not signed by a recognized certificate authority. However, for internal infrastructure, you can distribute the certificate as a trusted root to avoid these warnings.

## Provider Setup

```hcl
# main.tf
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
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "development"
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Creating a Basic Self-Signed Certificate

```hcl
# basic-cert.tf - Generate a private key and self-signed certificate
resource "tls_private_key" "basic" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "basic" {
  private_key_pem = tls_private_key.basic.private_key_pem

  subject {
    common_name  = "app.${var.domain}"
    organization = "Example Corp"
  }

  # Certificate valid for 365 days
  validity_period_hours = 8760

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

output "certificate_pem" {
  value     = tls_self_signed_cert.basic.cert_pem
  sensitive = true
}

output "certificate_validity" {
  value = {
    not_before = tls_self_signed_cert.basic.validity_start_time
    not_after  = tls_self_signed_cert.basic.validity_end_time
  }
}
```

## Certificate with Subject Alternative Names

Modern browsers require SAN entries, not just the Common Name:

```hcl
# san-cert.tf - Certificate with multiple domains and IPs
resource "tls_private_key" "multi_domain" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "multi_domain" {
  private_key_pem = tls_private_key.multi_domain.private_key_pem

  subject {
    common_name         = "api.${var.domain}"
    organization        = "Example Corp"
    organizational_unit = "Engineering"
    country             = "US"
    province            = "California"
    locality            = "San Francisco"
  }

  # Multiple DNS names covered by this certificate
  dns_names = [
    "api.${var.domain}",
    "api.${var.environment}.${var.domain}",
    "*.api.${var.domain}",
    "admin.${var.domain}",
    "localhost",
  ]

  # IP addresses for direct access
  ip_addresses = [
    "127.0.0.1",
    "10.0.0.1",
  ]

  validity_period_hours = 8760

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
    "client_auth",
  ]
}
```

## Creating a Self-Signed CA Certificate

```hcl
# ca-cert.tf - Self-signed CA for internal PKI
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name         = "Internal CA"
    organization        = "Example Corp"
    organizational_unit = "Security"
  }

  # CA certificate valid for 10 years
  validity_period_hours = 87600

  # Mark as CA certificate
  is_ca_certificate = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
    "digital_signature",
  ]
}
```

## Generating Certificates for Multiple Services

```hcl
# multi-service.tf - Certificates for multiple microservices
variable "services" {
  type = map(object({
    dns_names    = list(string)
    allowed_uses = list(string)
  }))
  default = {
    "api-gateway" = {
      dns_names    = ["api.example.com", "gateway.example.com"]
      allowed_uses = ["key_encipherment", "digital_signature", "server_auth"]
    }
    "grpc-service" = {
      dns_names    = ["grpc.internal.example.com"]
      allowed_uses = ["key_encipherment", "digital_signature", "server_auth", "client_auth"]
    }
    "webhook-receiver" = {
      dns_names    = ["webhooks.example.com"]
      allowed_uses = ["key_encipherment", "digital_signature", "server_auth"]
    }
  }
}

resource "tls_private_key" "service" {
  for_each  = var.services
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "service" {
  for_each = var.services

  private_key_pem = tls_private_key.service[each.key].private_key_pem

  subject {
    common_name  = each.value.dns_names[0]
    organization = "Example Corp"
  }

  dns_names             = each.value.dns_names
  validity_period_hours = 8760
  allowed_uses          = each.value.allowed_uses
}

# Upload each certificate to ACM
resource "aws_acm_certificate" "service" {
  for_each = var.services

  private_key      = tls_private_key.service[each.key].private_key_pem
  certificate_body = tls_self_signed_cert.service[each.key].cert_pem

  tags = {
    Service     = each.key
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Using ECDSA Keys for Self-Signed Certificates

```hcl
# ecdsa-cert.tf - Modern ECDSA-based certificate
resource "tls_private_key" "ecdsa" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_self_signed_cert" "ecdsa" {
  private_key_pem = tls_private_key.ecdsa.private_key_pem

  subject {
    common_name  = "modern.${var.domain}"
    organization = "Example Corp"
  }

  dns_names = ["modern.${var.domain}"]

  validity_period_hours = 8760

  allowed_uses = [
    "digital_signature",
    "server_auth",
  ]
}
```

## Storing Certificates Securely

```hcl
# storage.tf - Store certificates in AWS
resource "aws_secretsmanager_secret" "tls_bundle" {
  for_each = var.services
  name     = "${var.environment}/tls/${each.key}"
}

resource "aws_secretsmanager_secret_version" "tls_bundle" {
  for_each  = var.services
  secret_id = aws_secretsmanager_secret.tls_bundle[each.key].id

  secret_string = jsonencode({
    private_key = tls_private_key.service[each.key].private_key_pem
    certificate = tls_self_signed_cert.service[each.key].cert_pem
  })
}

output "certificate_arns" {
  description = "ACM certificate ARNs for each service"
  value       = { for k, v in aws_acm_certificate.service : k => v.arn }
}
```

## Conclusion

Self-signed certificates generated with Terraform provide a quick, automated way to secure internal communications and development environments. The tls_self_signed_cert resource handles all the complexity of certificate generation, letting you focus on configuring the right subjects, SANs, and key usages for your needs. For production environments, consider using [certificate signing requests](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-certificate-signing-requests-with-terraform/view) with a proper CA, and review our [TLS provider overview](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tls-provider-to-generate-certificates-in-terraform/view) for the complete picture.

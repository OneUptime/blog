# How to Generate Certificate Signing Requests with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TLS, CSR, Certificate Signing Request, Security, Infrastructure as Code

Description: Learn how to generate certificate signing requests (CSRs) with Terraform using the tls_cert_request resource for CA-signed certificates and internal PKI workflows.

---

A Certificate Signing Request (CSR) is a message sent to a Certificate Authority (CA) to request a digital certificate. It contains the public key and identity information for the certificate subject. The tls_cert_request resource in Terraform generates CSRs that you can submit to any CA, whether it is a public CA like Let's Encrypt, an internal enterprise CA, or a Terraform-managed CA using tls_locally_signed_cert.

In this guide, we will cover creating CSRs with Terraform for various use cases including web server certificates, client authentication certificates, and certificates with multiple Subject Alternative Names.

## Understanding Certificate Signing Requests

A CSR contains three main components: the public key (generated from your private key), the subject information (organization name, common name, country), and optional extensions like Subject Alternative Names. The CA uses this information to create a signed certificate that binds the public key to the stated identity.

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
  default = "production"
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Creating a Basic CSR

```hcl
# basic-csr.tf - Generate a private key and CSR
resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name         = "api.${var.domain}"
    organization        = "Example Corp"
    organizational_unit = "Engineering"
    country             = "US"
    province            = "California"
    locality            = "San Francisco"
  }
}

output "csr_pem" {
  description = "CSR in PEM format - submit to your CA"
  value       = tls_cert_request.server.cert_request_pem
}
```

## CSR with Subject Alternative Names

Modern certificates require SANs for all hostnames and IPs:

```hcl
# san-csr.tf - CSR with multiple DNS names and IP addresses
resource "tls_private_key" "multi_san" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "multi_san" {
  private_key_pem = tls_private_key.multi_san.private_key_pem

  subject {
    common_name  = "api.${var.domain}"
    organization = "Example Corp"
  }

  dns_names = [
    "api.${var.domain}",
    "api-v2.${var.domain}",
    "*.api.${var.domain}",
    "internal-api.${var.domain}",
  ]

  ip_addresses = [
    "10.0.1.100",
    "10.0.2.100",
    "127.0.0.1",
  ]

  uris = [
    "spiffe://cluster.local/ns/default/sa/api-service",
  ]
}
```

## Signing CSRs with a Terraform-Managed CA

```hcl
# ca-signing.tf - Create a CA and sign the CSR
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name  = "Internal CA"
    organization = "Example Corp"
  }

  validity_period_hours = 87600  # 10 years
  is_ca_certificate     = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]
}

# Sign the server CSR with the CA
resource "tls_locally_signed_cert" "server" {
  cert_request_pem   = tls_cert_request.server.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

output "signed_certificate" {
  value     = tls_locally_signed_cert.server.cert_pem
  sensitive = true
}
```

## Generating CSRs for Multiple Services

```hcl
# multi-csr.tf - CSRs for multiple microservices
variable "services" {
  type = map(object({
    dns_names   = list(string)
    client_auth = bool
  }))
  default = {
    "api-gateway" = {
      dns_names   = ["api.example.com", "gateway.example.com"]
      client_auth = false
    }
    "user-service" = {
      dns_names   = ["users.internal.example.com"]
      client_auth = true
    }
    "payment-service" = {
      dns_names   = ["payments.internal.example.com"]
      client_auth = true
    }
  }
}

resource "tls_private_key" "service" {
  for_each  = var.services
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "service" {
  for_each        = var.services
  private_key_pem = tls_private_key.service[each.key].private_key_pem

  subject {
    common_name  = each.value.dns_names[0]
    organization = "Example Corp"
  }

  dns_names = each.value.dns_names
}

# Sign all CSRs with the CA
resource "tls_locally_signed_cert" "service" {
  for_each = var.services

  cert_request_pem   = tls_cert_request.service[each.key].cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760

  allowed_uses = concat(
    ["key_encipherment", "digital_signature", "server_auth"],
    each.value.client_auth ? ["client_auth"] : []
  )
}

# Upload to ACM
resource "aws_acm_certificate" "service" {
  for_each = var.services

  private_key       = tls_private_key.service[each.key].private_key_pem
  certificate_body  = tls_locally_signed_cert.service[each.key].cert_pem
  certificate_chain = tls_self_signed_cert.ca.cert_pem

  lifecycle {
    create_before_destroy = true
  }
}

output "certificate_arns" {
  value = { for k, v in aws_acm_certificate.service : k => v.arn }
}
```

## Client Authentication CSR

```hcl
# client-csr.tf - CSR for mutual TLS client authentication
resource "tls_private_key" "client" {
  algorithm = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_cert_request" "client" {
  private_key_pem = tls_private_key.client.private_key_pem

  subject {
    common_name  = "service-client-${var.environment}"
    organization = "Example Corp"
  }

  # SPIFFE ID for service mesh identity
  uris = [
    "spiffe://cluster.local/ns/${var.environment}/sa/app-client"
  ]
}

resource "tls_locally_signed_cert" "client" {
  cert_request_pem   = tls_cert_request.client.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 720  # 30 days for client certs

  allowed_uses = [
    "digital_signature",
    "client_auth",
  ]
}
```

## Storing CSRs for External CA Submission

```hcl
# store-csr.tf - Store CSR for manual CA submission
resource "aws_ssm_parameter" "csr" {
  name  = "/${var.environment}/tls/pending-csr"
  type  = "String"
  value = tls_cert_request.server.cert_request_pem

  description = "Pending CSR for api.${var.domain} - submit to CA for signing"
}

resource "aws_secretsmanager_secret" "private_key" {
  name = "${var.environment}/tls/api-private-key"
}

resource "aws_secretsmanager_secret_version" "private_key" {
  secret_id     = aws_secretsmanager_secret.private_key.id
  secret_string = tls_private_key.server.private_key_pem
}
```

## Conclusion

Certificate Signing Requests are the bridge between your private keys and signed certificates from a Certificate Authority. By generating CSRs with Terraform, you streamline the certificate issuance process and keep everything in your infrastructure-as-code workflow. Whether you sign certificates with a Terraform-managed internal CA or submit CSRs to an external CA, the tls_cert_request resource provides the flexibility you need. For the complete TLS workflow, see our guides on [private keys](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-private-keys-with-terraform/view) and [the TLS provider](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tls-provider-to-generate-certificates-in-terraform/view).

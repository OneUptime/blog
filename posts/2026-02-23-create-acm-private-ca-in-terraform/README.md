# How to Create ACM Private CA in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ACM, Private CA, PKI, Security, Infrastructure as Code

Description: Learn how to create AWS Certificate Manager Private Certificate Authority with root and subordinate CAs, certificate issuance, and sharing using Terraform.

---

AWS Certificate Manager Private Certificate Authority (ACM Private CA) lets you create a private certificate authority hierarchy without the operational burden of running your own PKI infrastructure. You can issue private certificates for internal services, mutual TLS, IoT devices, and any other use case where public certificates are not appropriate. Managing your CA hierarchy through Terraform ensures it is reproducible, auditable, and version-controlled.

This guide covers creating root and subordinate CAs, issuing certificates, configuring certificate revocation, and sharing CAs across accounts.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- Understanding of PKI concepts (root CA, subordinate CA, certificate chains)
- A plan for your CA hierarchy before you start

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Root CA

The root CA sits at the top of your certificate chain. It signs subordinate CAs, which in turn issue end-entity certificates.

```hcl
# Root Certificate Authority
resource "aws_acmpca_certificate_authority" "root" {
  type = "ROOT"

  certificate_authority_configuration {
    key_algorithm     = "RSA_4096"
    signing_algorithm = "SHA512WITHRSA"

    subject {
      common_name         = "My Organization Root CA"
      organization        = "My Organization"
      organizational_unit = "Security"
      country             = "US"
      state               = "California"
      locality            = "San Francisco"
    }
  }

  # Revocation configuration with CRL
  revocation_configuration {
    crl_configuration {
      enabled            = true
      expiration_in_days = 7
      s3_bucket_name     = aws_s3_bucket.crl.id
      s3_object_acl      = "BUCKET_OWNER_FULL_CONTROL"
    }
  }

  # Use SHORT_LIVED for development/testing CAs
  usage_mode = "GENERAL_PURPOSE"

  # How long to wait before permanently deleting the CA
  permanent_deletion_time_in_days = 30

  tags = {
    Purpose = "root-ca"
    Level   = "root"
  }
}

# S3 bucket for Certificate Revocation Lists
resource "aws_s3_bucket" "crl" {
  bucket = "my-org-pca-crl-bucket"
}

resource "aws_s3_bucket_policy" "crl" {
  bucket = aws_s3_bucket.crl.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowACMPCAAccess"
        Effect = "Allow"
        Principal = {
          Service = "acm-pca.amazonaws.com"
        }
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation",
        ]
        Resource = [
          aws_s3_bucket.crl.arn,
          "${aws_s3_bucket.crl.arn}/*",
        ]
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

## Installing the Root CA Certificate

A root CA needs a self-signed certificate. You generate and install this as a separate step.

```hcl
# Generate the root CA certificate (self-signed)
resource "aws_acmpca_certificate" "root" {
  certificate_authority_arn   = aws_acmpca_certificate_authority.root.arn
  certificate_signing_request = aws_acmpca_certificate_authority.root.certificate_signing_request
  signing_algorithm           = "SHA512WITHRSA"

  template_arn = "arn:aws:acm-pca:::template/RootCACertificate/V1"

  validity {
    type  = "YEARS"
    value = 10
  }
}

# Install the root certificate on the CA
resource "aws_acmpca_certificate_authority_certificate" "root" {
  certificate_authority_arn = aws_acmpca_certificate_authority.root.arn
  certificate              = aws_acmpca_certificate.root.certificate
  certificate_chain        = aws_acmpca_certificate.root.certificate_chain
}
```

## Creating a Subordinate CA

Subordinate CAs are signed by the root CA and issue end-entity certificates. This is the recommended practice - never issue end-entity certificates directly from the root CA.

```hcl
# Subordinate CA for internal services
resource "aws_acmpca_certificate_authority" "subordinate" {
  type = "SUBORDINATE"

  certificate_authority_configuration {
    key_algorithm     = "RSA_2048"
    signing_algorithm = "SHA256WITHRSA"

    subject {
      common_name         = "My Organization Internal Services CA"
      organization        = "My Organization"
      organizational_unit = "Engineering"
      country             = "US"
      state               = "California"
    }
  }

  revocation_configuration {
    crl_configuration {
      enabled            = true
      expiration_in_days = 7
      s3_bucket_name     = aws_s3_bucket.crl.id
      s3_object_acl      = "BUCKET_OWNER_FULL_CONTROL"
    }
  }

  permanent_deletion_time_in_days = 30

  tags = {
    Purpose = "internal-services-ca"
    Level   = "subordinate"
  }
}

# Sign the subordinate CA certificate with the root CA
resource "aws_acmpca_certificate" "subordinate" {
  certificate_authority_arn   = aws_acmpca_certificate_authority.root.arn
  certificate_signing_request = aws_acmpca_certificate_authority.subordinate.certificate_signing_request
  signing_algorithm           = "SHA512WITHRSA"

  template_arn = "arn:aws:acm-pca:::template/SubordinateCACertificate_PathLen0/V1"

  validity {
    type  = "YEARS"
    value = 5
  }
}

# Install the subordinate certificate
resource "aws_acmpca_certificate_authority_certificate" "subordinate" {
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn
  certificate              = aws_acmpca_certificate.subordinate.certificate
  certificate_chain        = aws_acmpca_certificate.subordinate.certificate_chain
}
```

## Issuing End-Entity Certificates

With the CA hierarchy in place, you can issue certificates for your services.

```hcl
# Issue a private certificate for an internal service using ACM
resource "aws_acm_certificate" "internal_api" {
  domain_name               = "api.internal.mycompany.com"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn

  subject_alternative_names = [
    "api-v2.internal.mycompany.com",
    "api.staging.internal.mycompany.com",
  ]

  tags = {
    Service     = "internal-api"
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Issue a certificate for mutual TLS
resource "aws_acm_certificate" "mtls_client" {
  domain_name               = "client.internal.mycompany.com"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn

  tags = {
    Service = "mtls-client"
    Purpose = "mutual-tls"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Issue a wildcard certificate for internal services
resource "aws_acm_certificate" "wildcard_internal" {
  domain_name               = "*.internal.mycompany.com"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn

  tags = {
    Service = "internal-wildcard"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Short-Lived CA for Development

For development and testing, create a CA with short-lived certificates to avoid certificate management overhead.

```hcl
# Short-lived CA for development
resource "aws_acmpca_certificate_authority" "dev" {
  type = "SUBORDINATE"

  certificate_authority_configuration {
    key_algorithm     = "EC_prime256v1"
    signing_algorithm = "SHA256WITHECDSA"

    subject {
      common_name         = "Dev Environment CA"
      organization        = "My Organization"
      organizational_unit = "Development"
    }
  }

  # SHORT_LIVED mode does not require CRLs
  usage_mode = "SHORT_LIVED_CERTIFICATE"

  revocation_configuration {
    crl_configuration {
      enabled = false
    }
  }

  permanent_deletion_time_in_days = 7

  tags = {
    Purpose     = "dev-ca"
    Environment = "development"
  }
}

# Sign the dev CA with the root
resource "aws_acmpca_certificate" "dev" {
  certificate_authority_arn   = aws_acmpca_certificate_authority.root.arn
  certificate_signing_request = aws_acmpca_certificate_authority.dev.certificate_signing_request
  signing_algorithm           = "SHA512WITHRSA"

  template_arn = "arn:aws:acm-pca:::template/SubordinateCACertificate_PathLen0/V1"

  validity {
    type  = "YEARS"
    value = 2
  }
}

resource "aws_acmpca_certificate_authority_certificate" "dev" {
  certificate_authority_arn = aws_acmpca_certificate_authority.dev.arn
  certificate              = aws_acmpca_certificate.dev.certificate
  certificate_chain        = aws_acmpca_certificate.dev.certificate_chain
}
```

## Sharing CAs Across Accounts with RAM

Use AWS Resource Access Manager to share your private CA with other accounts in the organization.

```hcl
# Share the subordinate CA with other accounts via RAM
resource "aws_ram_resource_share" "ca_share" {
  name                      = "private-ca-share"
  allow_external_principals = false # Only within the organization

  tags = {
    Purpose = "share-private-ca"
  }
}

# Associate the CA with the RAM share
resource "aws_ram_resource_association" "ca" {
  resource_arn       = aws_acmpca_certificate_authority.subordinate.arn
  resource_share_arn = aws_ram_resource_share.ca_share.arn
}

# Share with specific accounts
resource "aws_ram_principal_association" "workload_account" {
  principal          = "111111111111" # Target account ID
  resource_share_arn = aws_ram_resource_share.ca_share.arn
}

# Or share with the entire organization
resource "aws_ram_principal_association" "organization" {
  principal          = "arn:aws:organizations::${data.aws_caller_identity.current.account_id}:organization/${var.org_id}"
  resource_share_arn = aws_ram_resource_share.ca_share.arn
}
```

## CA Policy

Control who can issue certificates from your CA using a resource-based policy.

```hcl
# Policy that allows specific accounts to issue certificates
resource "aws_acmpca_policy" "subordinate" {
  resource_arn = aws_acmpca_certificate_authority.subordinate.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowACMIssuance"
        Effect = "Allow"
        Principal = {
          Service = "acm.amazonaws.com"
        }
        Action = [
          "acm-pca:IssueCertificate",
          "acm-pca:GetCertificate",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = [
              data.aws_caller_identity.current.account_id,
              "111111111111",
              "222222222222",
            ]
          }
        }
      },
      {
        Sid    = "AllowACMRenewal"
        Effect = "Allow"
        Principal = {
          Service = "acm.amazonaws.com"
        }
        Action   = "acm-pca:IssueCertificate"
        Resource = "*"
        Condition = {
          StringLike = {
            "acm-pca:TemplateArn" = "arn:aws:acm-pca:::template/EndEntityCertificate/V1"
          }
        }
      }
    ]
  })
}
```

## Using Private Certificates with ALB

Attach private certificates to internal Application Load Balancers.

```hcl
# Internal ALB with private certificate
resource "aws_lb" "internal_api" {
  name               = "internal-api"
  internal           = true
  load_balancer_type = "application"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.internal_alb.id]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.internal_api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.internal_api.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
```

## Outputs

```hcl
output "root_ca_arn" {
  value       = aws_acmpca_certificate_authority.root.arn
  description = "Root CA ARN"
}

output "subordinate_ca_arn" {
  value       = aws_acmpca_certificate_authority.subordinate.arn
  description = "Subordinate CA ARN for issuing certificates"
}

output "internal_api_cert_arn" {
  value       = aws_acm_certificate.internal_api.arn
  description = "Internal API certificate ARN"
}

output "crl_bucket" {
  value       = aws_s3_bucket.crl.id
  description = "S3 bucket containing Certificate Revocation Lists"
}
```

## Best Practices

1. **Never issue end-entity certificates from the root CA.** Always create subordinate CAs and issue certificates from those. This limits the blast radius if a subordinate CA is compromised.

2. **Use RSA_4096 for root CAs.** Root CA certificates last a long time. Use the strongest key algorithm to ensure they remain secure throughout their lifetime.

3. **Enable CRL distribution.** Certificate Revocation Lists are essential for revoking compromised certificates. Always configure an S3 bucket for CRL publishing.

4. **Use SHORT_LIVED_CERTIFICATE mode for dev/test.** Short-lived certificates (7 days or less) do not need CRLs and reduce the risk of certificate misuse.

5. **Share CAs through RAM.** Rather than creating a CA in every account, share a centralized CA hierarchy using Resource Access Manager.

6. **Set appropriate validity periods.** Root CAs should be valid for 10+ years, subordinate CAs for 3-5 years, and end-entity certificates for 1 year or less.

## Conclusion

ACM Private CA with Terraform gives you a fully managed PKI infrastructure that you can define, version control, and deploy consistently. From root CAs to subordinate CAs to end-entity certificates, the entire hierarchy is captured in code. Whether you are securing internal APIs with private TLS, implementing mutual TLS for service-to-service authentication, or issuing certificates for IoT devices, Private CA handles the certificate lifecycle while Terraform keeps the configuration reproducible.

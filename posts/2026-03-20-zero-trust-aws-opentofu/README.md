# How to Implement Zero Trust Network with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Zero Trust, Security, OpenTofu, IAM, VPN, Verified Access

Description: Learn how to implement Zero Trust Network Architecture on AWS using OpenTofu with AWS Verified Access, identity-based policies, and micro-segmentation.

## Overview

Zero Trust on AWS assumes no implicit trust based on network location. Every access request must be authenticated and authorized. OpenTofu configures AWS Verified Access, fine-grained IAM policies, and network micro-segmentation to enforce zero trust principles.

## Step 1: AWS Verified Access for Application Access

```hcl
# main.tf - AWS Verified Access replaces VPN with identity-based access

resource "aws_verifiedaccess_instance" "zero_trust" {
  description = "Zero Trust access instance"
}

resource "aws_verifiedaccess_trust_provider" "oidc" {
  trust_provider_type      = "user"
  user_trust_provider_type = "oidc"
  policy_reference_name    = "oidc"
  description              = "OIDC user trust provider"

  oidc_options {
    scope                  = "openid email profile"
    issuer                 = "https://oidc.example.com"
    authorization_endpoint = "https://oidc.example.com/oauth2/authorize"
    token_endpoint         = "https://oidc.example.com/oauth2/token"
    user_info_endpoint     = "https://oidc.example.com/userinfo"
    client_id              = var.oidc_client_id
    client_secret          = var.oidc_client_secret
  }
}

# Verified Access Group with Cedar policy
resource "aws_verifiedaccess_group" "engineering" {
  verifiedaccess_instance_id = aws_verifiedaccess_instance.zero_trust.id

  policy_document = <<-EOT
    permit(principal, action, resource)
    when {
      context.oidc.groups.contains("engineering")
      || context.oidc.groups.contains("platform")
    };
  EOT
}

# Verified Access Endpoint for internal application
resource "aws_verifiedaccess_endpoint" "internal_app" {
  application_domain       = "internal-app.example.com"
  attachment_type          = "vpc"
  domain_certificate_arn   = aws_acm_certificate.internal.arn
  endpoint_domain_prefix   = "internal-app"
  endpoint_type            = "load-balancer"
  verified_access_group_id = aws_verifiedaccess_group.engineering.id

  load_balancer_options {
    load_balancer_arn = aws_lb.internal_app.arn
    port              = 443
    protocol          = "https"
    subnet_ids        = module.vpc.private_subnets
  }
}
```

## Step 2: Least-Privilege IAM with Conditions

```hcl
# Deny all unless specific conditions are met
resource "aws_iam_policy" "zero_trust_conditions" {
  name = "zero-trust-conditions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::sensitive-data/*"
        Condition = {
          StringEquals = {
            "aws:PrincipalTag/department" = "finance"
          }
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          StringLike = {
            "aws:SourceVpc" = module.vpc.vpc_id
          }
        }
      }
    ]
  })
}
```

## Step 3: Security Groups for Micro-Segmentation

```hcl
# Deny-all default, allow only explicit ingress
resource "aws_security_group" "app" {
  name        = "app-zero-trust"
  vpc_id      = module.vpc.vpc_id
  description = "Zero trust app security group"

  # No ingress rules - deny all by default
  # Explicit rules added separately
}

# Only allow traffic from ALB
resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}

# Database only accessible from app tier
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
```

## Step 4: CloudTrail for Access Logging

```hcl
# Log all API calls for audit trail
resource "aws_cloudtrail" "zero_trust_audit" {
  name                          = "zero-trust-audit"
  s3_bucket_name                = aws_s3_bucket.audit_logs.bucket
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  advanced_event_selector {
    name = "Log all events"

    field_selector {
      field  = "eventCategory"
      equals = ["Data"]
    }
  }
}
```

## Summary

Zero Trust on AWS built with OpenTofu uses AWS Verified Access to provide identity-based access to internal applications without a VPN. IAM policies with conditions verify MFA, source VPC, and attribute-based claims before granting access. Security groups implement micro-segmentation by referencing other security groups rather than IP ranges, ensuring that if a service's IP changes, access controls update automatically.

# How to Design a Certificate Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, ACM, TLS, AWS, Module, Certificate

Description: Learn how to design a reusable ACM certificate module for OpenTofu that handles certificate request, DNS validation, and automatic renewal configuration.

## Introduction

TLS certificate management with ACM involves requesting a certificate, creating DNS validation records, waiting for validation, and then passing the certificate ARN to your load balancer or, for CloudFront, to a distribution that uses a certificate requested in `us-east-1`. A certificate module encapsulates the request and validation lifecycle and outputs the ARN for downstream resources.

## variables.tf

```hcl
variable "domain_name"               { type = string }
variable "subject_alternative_names" { type = list(string); default = [] }
variable "route53_zone_id"           { type = string }
variable "validation_method" {
  type    = string
  default = "DNS"

  validation {
    condition     = var.validation_method == "DNS"
    error_message = "This module only supports DNS validation because it manages Route 53 validation records."
  }
}
variable "environment"               { type = string }

variable "wait_for_validation" {
  description = "Wait for certificate to be issued before module completes"
  type        = bool
  default     = true
}

variable "tags" { type = map(string); default = {} }
```

## main.tf

```hcl
locals {
  tags = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)

  validation_records = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.resource_record_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
}

# Request the ACM certificate

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = var.validation_method

  tags = merge(local.tags, { Name = var.domain_name })

  lifecycle {
    # Create a new cert before destroying the old one when replacement is required
    create_before_destroy = true
  }
}

# Create Route53 DNS validation records for each unique validation record
resource "aws_route53_record" "validation" {
  # Wildcard and apex domains can share the same ACM validation CNAME.
  for_each = local.validation_records

  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Wait for ACM to validate the certificate via DNS
resource "aws_acm_certificate_validation" "main" {
  count           = var.wait_for_validation ? 1 : 0
  certificate_arn = aws_acm_certificate.main.arn
  validation_record_fqdns = [
    for record in aws_route53_record.validation : record.fqdn
  ]
}
```

## outputs.tf

```hcl
output "certificate_arn" {
  # Return validated ARN if waiting for validation, otherwise the raw ARN
  value = var.wait_for_validation ? (
    aws_acm_certificate_validation.main[0].certificate_arn
  ) : (
    aws_acm_certificate.main.arn
  )
}

output "domain_name"         { value = aws_acm_certificate.main.domain_name }
output "status"              { value = aws_acm_certificate.main.status }
output "validation_record_fqdns" {
  value = [for r in aws_route53_record.validation : r.fqdn]
}
```

## Example Usage

```hcl
module "cert" {
  source          = "./modules/certificate"
  domain_name     = "example.com"
  subject_alternative_names = ["www.example.com", "api.example.com"]
  route53_zone_id = module.dns.zone_id
  environment     = var.environment
}

# Use the certificate in a load balancer listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = module.cert.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Conclusion

The certificate module handles the ACM request and DNS validation workflow and outputs an ARN for downstream resources. The `create_before_destroy` lifecycle rule is important because it lets OpenTofu create a replacement certificate before removing the old one. The `wait_for_validation` flag lets you skip blocking in CI pipelines that only request the certificate and create validation records, but resources that attach the certificate still need the certificate to reach `ISSUED`.

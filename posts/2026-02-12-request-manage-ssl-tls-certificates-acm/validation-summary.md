# Validation Summary: How to Request and Manage SSL/TLS Certificates with ACM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- AWS CLI
- Amazon Route 53
- Terraform AWS Provider
- Amazon CloudWatch
- Amazon CloudFront
- SSL/TLS certificates

## Sources Consulted
- AWS Certificate Manager public certificates: https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- Renewal for domains validated by DNS: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- AWS Certificate Manager email validation: https://docs.aws.amazon.com/acm/latest/userguide/email-validation.html
- AWS Certificate Manager CloudWatch metrics: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- Services integrated with ACM: https://docs.aws.amazon.com/acm/latest/userguide/acm-services.html
- CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CLI request-certificate command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS Private CA pricing: https://aws.amazon.com/private-ca/pricing/
- Terraform aws_acm_certificate_validation resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation

## Issues Found
- Updated the opening description and ACM basics to avoid implying all ACM certificates are free. AWS now distinguishes standard public certificates for integrated services from exportable public certificates, which have separate pricing.
- Corrected the statement that ACM certificates cannot be downloaded. Standard ACM public certificates are not downloadable, but AWS now supports exportable public certificates when requested with export enabled.
- Clarified AWS Private CA pricing. The $400/month charge applies to each general-purpose private CA and does not include certificate issuance and OCSP usage charges.
- Clarified DNS-based automatic renewal requirements. ACM requires the certificate to be in use by an AWS service and the required DNS CNAME records to remain publicly resolvable.
- Updated public certificate renewal timing from 60 days to 45 days before expiration for current 198-day public ACM certificates.
- Updated key algorithm coverage to include ECDSA P-384 in addition to RSA 2048 and ECDSA P-256.
- Tightened the DNS validation timing statement to match AWS documentation that a new certificate can remain pending for up to 30 minutes after records are created.

## Review Notes
The AWS CLI command shapes, Route 53 change batch structure, Terraform ACM validation pattern, CloudWatch `DaysToExpiry` alarm dimensions, wildcard behavior, CloudFront `us-east-1` requirement, and email validation addresses are technically correct as written. The local environment does not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws --help` output.

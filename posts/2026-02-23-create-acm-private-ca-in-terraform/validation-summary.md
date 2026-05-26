# Validation Summary: How to Create ACM Private CA in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Certificate Manager
- AWS Private Certificate Authority
- AWS Resource Access Manager
- Amazon S3 certificate revocation list publishing
- Application Load Balancer TLS listeners

## Sources Consulted
- AWS Private CA API Reference: PutPolicy - https://docs.aws.amazon.com/privateca/latest/APIReference/API_PutPolicy.html
- AWS Private CA User Guide: Resource-based policies - https://docs.aws.amazon.com/privateca/latest/userguide/pca-rbp.html
- AWS Private CA User Guide: Understand AWS Private CA CA modes - https://docs.aws.amazon.com/privateca/latest/userguide/short-lived-certificates.html
- AWS Private CA API Reference: CrlConfiguration - https://docs.aws.amazon.com/privateca/latest/APIReference/API_CrlConfiguration.html
- AWS Private CA User Guide: Set up a CRL for AWS Private CA - https://docs.aws.amazon.com/privateca/latest/userguide/crl-planning.html
- AWS Certificate Manager User Guide: Private certificates in ACM - https://docs.aws.amazon.com/en_us/acm/latest/userguide/private-certificates.title.html
- AWS Certificate Manager API Reference: RequestCertificate - https://docs.aws.amazon.com/acm/latest/APIReference/API_RequestCertificate.html
- Terraform AWS Provider: aws_acmpca_certificate_authority, aws_acmpca_certificate_authority_certificate, aws_acmpca_certificate, aws_acmpca_policy, aws_acmpca_permission, aws_acm_certificate, aws_ram_resource_share, aws_ram_resource_association, aws_ram_principal_association

## Issues Found
- The short-lived CA section implied ACM could be part of the same workflow and signed the short-lived subordinate CA for two years. AWS documents that short-lived CAs issue certificates with a maximum validity of seven days, must be the last CA in the hierarchy, and cannot be used by ACM to issue certificates. Updated the text to call out the ACM limitation and changed the example CA certificate validity to 7 days.
- The CA policy example used the ACM service principal inside an `aws_acmpca_policy` resource and used `Resource = "*"`. AWS Private CA resource-based policies are for granting access to AWS accounts or AWS Organizations principals, while same-account ACM automatic renewal uses an ACM PCA permission. Replaced the example with `aws_acmpca_permission` for same-account ACM renewal and a resource-based policy using AWS account principals and the CA ARN.
- The cross-account policy action set was incomplete for ACM users that need to inspect and use a shared CA. Updated it to include the documented read actions plus `IssueCertificate` constrained by the `acm-pca:TemplateArn` condition.
- The RAM organization sharing snippet referenced `var.org_id` without declaring it. Added a minimal variable declaration so the snippet is self-contained.
- Tightened the `usage_mode` comment in the root CA example so it uses the exact AWS/Terraform enum name `SHORT_LIVED_CERTIFICATE`.

## Review Notes
The Terraform CLI was not installed in the review environment, so I could not run `terraform validate`. The review was performed against AWS documentation and the current Terraform AWS Provider resource documentation. The examples still use the AWS commercial partition in template ARNs; future hardening could introduce `data.aws_partition.current` for GovCloud or China partition portability.

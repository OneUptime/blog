# Validation Summary: How to Use AWS Private CA for Internal Certificate Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Private Certificate Authority
- AWS Certificate Manager
- AWS CLI
- Amazon API Gateway mutual TLS
- Amazon S3 trust stores and CRL storage
- Terraform AWS provider
- OpenSSL
- TLS and X.509 certificates

## Sources Consulted
- AWS CLI `create-certificate-authority` documentation: https://docs.aws.amazon.com/cli/latest/reference/acm-pca/create-certificate-authority.html
- AWS Private CA certificate installation documentation: https://docs.aws.amazon.com/privateca/latest/userguide/PCACertInstall.html
- AWS Private CA template definitions and template ARN documentation: https://docs.aws.amazon.com/privateca/latest/userguide/template-definitions.html
- AWS Private CA end-entity certificate issuance documentation: https://docs.aws.amazon.com/privateca/latest/userguide/PcaIssueCert.html
- AWS Private CA API/CLI command list: https://docs.aws.amazon.com/cli/latest/reference/acm-pca/index.html
- AWS Private CA `CreatePermission` documentation: https://docs.aws.amazon.com/privateca/latest/APIReference/API_CreatePermission.html
- AWS Certificate Manager private certificate documentation: https://docs.aws.amazon.com/acm/latest/userguide/private-certificates.html
- Amazon API Gateway mutual TLS documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-mutual-tls.html
- AWS Private CA CRL documentation: https://docs.aws.amazon.com/privateca/latest/userguide/crl-planning.html
- AWS Private CA short-lived certificate mode documentation: https://docs.aws.amazon.com/privateca/latest/userguide/short-lived-certificates.html
- AWS Private CA pricing: https://aws.amazon.com/private-ca/pricing/
- Terraform AWS provider `aws_acmpca_certificate_authority_certificate` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate_authority_certificate
- Terraform AWS provider `aws_acmpca_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_permission

## Issues Found
- The root CA activation flow issued a certificate but did not capture the returned certificate ARN, then used a placeholder ARN in the retrieval command. Updated the command to write `CertificateArn` to `root-ca-cert-arn.txt` and reuse it with `get-certificate`.
- The subordinate CA signing flow wrote `get-certificate` output to JSON but later imported `sub-ca-cert.pem`, which was never created. Updated the command to extract the PEM certificate into `sub-ca-cert.pem`.
- Direct end-entity and client certificate examples issued certificates without capturing the returned certificate ARN. Updated the examples to store the ARN in text files and reuse it when retrieving certificates.
- The ACM private certificate example did not grant ACM permissions on the private CA. Added `aws acm-pca create-permission` with `IssueCertificate`, `GetCertificate`, and `ListPermissions`.
- The Terraform example created root and subordinate CAs but did not activate them, so the subordinate CA and ACM certificate would not be usable as shown. Added `aws_acmpca_certificate`, `aws_acmpca_certificate_authority_certificate`, `aws_acmpca_permission`, and a dependency for the ACM certificate.
- The monitoring section used `aws acm-pca list-certificates`, which is not an AWS Private CA CLI command. Replaced it with `aws acm list-certificates --includes certificateTypes=PRIVATE` for ACM-managed private certificates.
- The hierarchy explanation said the AWS-created root CA stays offline. Adjusted wording to say the root CA is restricted and used rarely, which is accurate for a root hosted by AWS Private CA.
- The public CA explanation used `api.internal.company` as a private name example, which could be a registrable public DNS name. Changed it to an unregistered internal name example, `api.internal`.
- The short-lived CA pricing note implied short-lived mode is generally cheaper. Updated it to clarify that it is cheaper for some short-duration workloads, limited to certificates valid for seven days or less, and cannot be used by ACM to issue certificates.

## Review Notes
The guide is technically relevant and useful after correction. Some examples still use placeholder ARNs, bucket names, and account IDs, so readers must substitute real values and configure IAM/S3 bucket policies before running them.

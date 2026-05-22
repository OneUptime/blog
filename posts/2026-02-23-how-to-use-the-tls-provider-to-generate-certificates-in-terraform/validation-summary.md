# Validation Summary: How to Use the TLS Provider to Generate Certificates in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp TLS provider
- AWS provider for Terraform
- AWS Certificate Manager
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS EC2 key pairs
- TLS certificates, private keys, CSRs, and PKI

## Sources Consulted
- HashiCorp Terraform Registry: TLS provider overview - https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- HashiCorp Terraform Registry: tls_private_key - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp Terraform Registry: tls_self_signed_cert - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- HashiCorp Terraform Registry: tls_cert_request - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/cert_request
- HashiCorp Terraform Registry: tls_locally_signed_cert - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/locally_signed_cert
- HashiCorp Terraform Registry: aws_acm_certificate - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- HashiCorp Terraform Registry: aws_ssm_parameter - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS Certificate Manager documentation: Import certificates - https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html
- Amazon CloudFront documentation: SSL/TLS certificate requirements - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html

## Issues Found
- The private key examples used an environment default of `production`, but the TLS provider documentation warns that generated private keys are stored unencrypted in Terraform state and are not recommended for production deployments. Changed the default to `development` and added a concise state-storage warning.
- The private key section said the TLS provider supports "both RSA and ECDSA" while the examples also used ED25519. Updated the claim to list RSA, ECDSA, and ED25519.
- The AWS upload snippet was labeled as uploading to "ACM and IAM", but the code uploads to ACM and Secrets Manager. Corrected the comment.
- The ACM upload comment mentioned CloudFront without noting its ACM region requirement. Added the `us-east-1` caveat for CloudFront.
- The conclusion said the TLS provider handles the "entire certificate lifecycle as code", which overstates the provider because certificate revocation and production key lifecycle concerns remain outside these examples. Reworded it to "certificate generation workflows as code."

## Review Notes
The Terraform resource names, arguments, key usage values, certificate request fields, ACM import fields, SSM parameter fields, Secrets Manager fields, and EC2 key pair public key usage match the official provider documentation. Imported ACM certificates are not eligible for ACM managed renewal; future revisions could mention that operational caveat when discussing ACM uploads.

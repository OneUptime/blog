# Validation Summary: How to Build a Certificate Management Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Certificate Manager (ACM)
- AWS Private Certificate Authority (AWS Private CA / ACM PCA)
- Amazon Route 53 DNS validation
- Amazon S3 CRL distribution
- AWS Lambda
- Amazon EventBridge / CloudWatch Events
- Amazon CloudWatch metrics and alarms
- TLS certificate management

## Sources Consulted
- Terraform AWS provider documentation for `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider documentation for `aws_acmpca_certificate_authority`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate_authority
- Terraform AWS provider documentation for `aws_acmpca_certificate_authority_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate_authority_certificate
- AWS Certificate Manager DNS validation documentation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager managed renewal documentation: https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- AWS Certificate Manager CloudWatch metrics documentation: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS Certificate Manager private certificate request documentation: https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-private.html
- AWS Certificate Manager conditions for using AWS Private CA documentation: https://docs.aws.amazon.com/acm/latest/userguide/ca-access.html
- AWS Private CA `CreatePermission` API documentation: https://docs.aws.amazon.com/privateca/latest/APIReference/API_CreatePermission.html
- AWS Private CA CRL planning documentation: https://docs.aws.amazon.com/privateca/latest/userguide/crl-planning.html
- Amazon S3 Object Ownership documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- Amazon CloudFront certificate region requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Terraform AWS provider documentation for `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule

## Issues Found
- The Private CA example created a root CA but did not associate a self-signed root CA certificate. AWS Private CA leaves a newly created CA in `PENDING_CERTIFICATE` until a CA certificate is associated, so the root CA could not issue the subordinate CA certificate as written. Added `aws_acmpca_certificate.root` and `aws_acmpca_certificate_authority_certificate.root`.
- The subordinate CA certificate could be attempted before the root CA was active. Added an explicit dependency on the root CA certificate association.
- The private certificate example did not grant ACM permission to issue and renew private certificates from the subordinate CA. Added `aws_acmpca_permission` for the ACM service principal with `IssueCertificate`, `GetCertificate`, and `ListPermissions`, and made the example certificate depend on it.
- The root CA with CRL configuration could be created before the CRL bucket policy was attached. Added an explicit dependency on the S3 bucket policy.
- The public CRL bucket policy could be attached before the bucket-level public access block settings were updated to allow public policies. Added an explicit dependency on `aws_s3_bucket_public_access_block.crl`.
- The CRL S3 bucket policy mixed bucket-level and object-level S3 actions in a single statement. Split the policy into bucket access and object write statements so each action applies to the correct ARN type.
- The CRL comment stated that CRLs need to be publicly readable. Adjusted it to clarify that this applies to the direct-S3 example; AWS also documents private S3 buckets fronted by CloudFront as an option.

## Review Notes
- The Terraform snippets remain illustrative and assume the surrounding variables, provider aliases, IAM role, Lambda package, SNS topic, and module outputs exist.
- The hard-coded commercial AWS partition in ACM PCA template ARNs works for standard AWS regions. A production multi-partition module should use `data.aws_partition.current.partition`.

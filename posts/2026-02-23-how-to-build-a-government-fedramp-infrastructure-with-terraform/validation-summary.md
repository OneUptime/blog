# Validation Summary: How to Build a Government (FedRAMP) Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS GovCloud (US)
- AWS KMS
- AWS VPC, VPC endpoints, network ACLs, and VPC Flow Logs
- AWS CloudTrail
- Amazon S3 Object Lock and server-side encryption
- AWS Config managed rules
- Amazon GuardDuty
- AWS Security Hub
- Amazon EventBridge
- AWS Lambda
- Amazon SNS
- FedRAMP and NIST SP 800-53 controls

## Sources Consulted
- FedRAMP: Understanding Baselines and Impact Levels, https://www.fedramp.gov/understanding-baselines-and-impact-levels/
- FedRAMP Rev. 5 Transition Overview, https://www.fedramp.gov/resources/documents/Rev-5-Transition-Overview-Presentation.pdf
- NIST SP 800-53 Rev. 5, https://csrc.nist.gov/Pubs/sp/800/53/r5/upd1/Final
- AWS GovCloud (US) FAQs, https://aws.amazon.com/govcloud-us/faqs/
- AWS GovCloud (US) service endpoints, https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/using-govcloud-endpoints.html
- AWS SDKs and Tools: Dual-stack and FIPS endpoints, https://docs.aws.amazon.com/sdkref/latest/guide/feature-endpoints.html
- HashiCorp AWS provider configuration, https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS KMS key spec reference, https://docs.aws.amazon.com/kms/latest/developerguide/asymmetric-key-specs.html
- AWS KMS data protection, https://docs.aws.amazon.com/kms/latest/developerguide/data-protection.html
- Terraform AWS provider: aws_kms_key, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform AWS provider: aws_cloudtrail, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail DataResource API, https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- Amazon S3 Object Lock configuration, https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Terraform AWS provider: aws_s3_bucket and aws_s3_bucket_versioning, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS Config managed rules list, https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html
- AWS Config root-account-mfa-enabled managed rule, https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html
- AWS GovCloud root user guidance, https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-account-root-user.html
- AWS Security Hub NIST SP 800-53 Rev. 5 standard, https://docs.aws.amazon.com/securityhub/latest/userguide/standards-reference-nist-800-53.html

## Issues Found
- The introduction overstated FedRAMP applicability by saying selling to the federal government always requires FedRAMP. Changed it to cloud services typically requiring FedRAMP authorization.
- The post implied GovCloud is typically required for FedRAMP High. Updated this to say GovCloud is often chosen or contractually required, while FedRAMP authorization can also use eligible commercial AWS regions and services.
- The post used FIPS 140-2-specific wording throughout. Updated the language to FIPS-validated cryptography and noted the FIPS 140-3 transition while preserving the practical point.
- The Terraform AWS provider examples did not enable FIPS endpoint resolution even though the guide claimed FIPS endpoint use. Added `use_fips_endpoint = true` to the GovCloud providers.
- The KMS snippet used older `customer_master_key_spec` terminology. Updated it to `key_spec = "SYMMETRIC_DEFAULT"` and corrected the FIPS/KMS comment.
- The VPC Flow Logs retention comment claimed a hard one-year FedRAMP Moderate minimum. Reworded it to align with AU-11 and the system SSP retention requirements.
- The S3 Object Lock example configured retention without enabling Object Lock at bucket creation or explicitly enabling versioning in Terraform. Added `object_lock_enabled = true`, an `aws_s3_bucket_versioning` resource, and a dependency for the Object Lock configuration.
- The AWS Config root MFA managed rule is not supported in AWS GovCloud (US), and GovCloud root users do not support MFA. Removed the unsupported rule and replaced it with a comment directing root access handling to account policy and monitoring.
- The conclusion overstated Terraform as codifying every control and becoming part of the SSP. Adjusted this to say Terraform codifies many infrastructure-related controls and can provide supporting SSP evidence.

## Review Notes
The Terraform snippets remain illustrative and reference surrounding resources, IAM roles, variables, and bucket policies that are not fully defined in the post. A production FedRAMP package would still need a complete SSP, control implementation statements, customer responsibility mapping, agency/3PAO review, log bucket policies for CloudTrail delivery, organization/account guardrails, vulnerability management, incident response procedures, and evidence beyond Terraform resources.

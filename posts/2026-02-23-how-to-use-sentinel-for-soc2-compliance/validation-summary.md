# Validation Summary: How to Use Sentinel for SOC2 Compliance

## Status
validated

## Post Type
Tutorial / compliance implementation guide

## Technologies Covered
- HashiCorp Sentinel
- HCP Terraform / Terraform Enterprise policy enforcement
- Terraform `tfplan/v2` and `tfrun` Sentinel imports
- AWS Terraform provider resources for IAM, CloudTrail, RDS, EBS, S3 encryption, security groups
- SOC 2 Trust Services Criteria

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel imports documentation: https://developer.hashicorp.com/sentinel/docs/language/imports
- HashiCorp Sentinel `json` import documentation: https://developer.hashicorp.com/sentinel/docs/imports/json
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- HashiCorp Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- Terraform AWS provider `aws_cloudtrail` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AICPA 2017 Trust Services Criteria with revised points of focus 2022: https://www.aicpa.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022

## Issues Found
- The Sentinel code blocks were labeled as `python`. Changed them to `sentinel` so the examples are accurately identified.
- The IAM policy example used `types.type_of` without importing the Sentinel `types` import. Added `import "types"` so the policy can evaluate the type checks.
- The CC7 logging example defined VPC and flow log filters but never used them, while the comment claimed the policy required both CloudTrail and VPC Flow Logs. Removed the unused filters and narrowed the text/comment to CloudTrail logging, which is what the policy actually enforces.
- The A1 availability example assigned `main` inside conditional branches. Reworked it so the production check populates violations conditionally and defines `main` once at package scope.
- The C1 confidentiality text claimed encryption at rest and in transit, but the policy only checked encryption-at-rest fields. Narrowed the wording to encryption at rest.
- The S3 encryption example filtered `aws_s3_bucket` resources but did not actually evaluate any S3 encryption settings. Updated it to inspect `aws_s3_bucket_server_side_encryption_configuration`, the current AWS provider resource for bucket default encryption configuration.

## Review Notes
Sentinel CLI was not installed in the local environment, so validation was performed by reading the examples against the official Sentinel language/import documentation rather than executing the policies. The examples remain illustrative controls; production policy sets should add tests with representative Terraform plans and may need additional handling for unknown values in planned resources.

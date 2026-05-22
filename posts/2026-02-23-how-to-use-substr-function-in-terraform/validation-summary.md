# Validation Summary: How to Use the substr Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform variable validation
- Terraform sensitive values and outputs
- AWS S3, IAM, and Availability Zones

## Sources Consulted
- HashiCorp Terraform `substr` function documentation: https://developer.hashicorp.com/terraform/language/functions/substr
- HashiCorp Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- HashiCorp Terraform `sensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/sensitive
- HashiCorp Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform custom validation documentation: https://developer.hashicorp.com/terraform/language/validate
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS IAM and STS quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS Availability Zones documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html

## Issues Found
- The sensitive value masking example derived `local.masked_key` from a sensitive input variable and then output it directly. Terraform propagates sensitivity through expressions, so a root module output derived from a sensitive value must either be marked sensitive or explicitly converted with `nonsensitive` when the derived value is safe to display. Changed the output value to `nonsensitive(local.masked_key)` so the displayed masked hint matches the section's stated purpose.
- The Redis connection string example said the `redis://` prefix is 7 characters, but it is 8 characters. The code already used offset `8` and produced the correct result, so only the comment was corrected.

## Review Notes
Terraform CLI and OpenTofu were not installed in the local environment, so examples were reviewed statically against official documentation. The `nonsensitive` function should be used with care because it deliberately exposes a derived value from sensitive input; the example exposes only the masked hint shown in the post.

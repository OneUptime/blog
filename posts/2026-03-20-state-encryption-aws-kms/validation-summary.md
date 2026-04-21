# Validation Summary: How to Configure State Encryption with AWS KMS in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- OpenTofu AWS KMS key provider
- AWS KMS keys, aliases, multi-Region keys, and key rotation
- AWS IAM and KMS key policies
- AWS CloudTrail and AWS CLI
- OpenTofu S3 backend encryption
- HCL configuration

## Sources Consulted
- OpenTofu State and Plan Encryption documentation, current v1.11: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu State and Plan Encryption documentation, v1.7: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- AWS KMS GenerateDataKey API Reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- AWS CLI `cloudtrail lookup-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Terraform AWS provider `aws_kms_key` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_key.html.markdown
- Terraform AWS provider `aws_kms_alias` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_alias.html.markdown

## Issues Found

1. **Missing required `key_spec` in AWS KMS key provider examples**: The post described `key_spec` as optional/defaulted, but OpenTofu documents it as a required `aws_kms` key provider option. Added `key_spec = "AES_256"` to each `key_provider "aws_kms"` example.

2. **Invalid placeholder KMS key ARNs**: Several examples used non-working key IDs such as `mrk-abc123`, `key/s3-key`, and `key/opentofu-key`. Replaced them with UUID-shaped key IDs for regional keys and a valid `mrk-` shaped key ID for the multi-Region example.

3. **Existing plaintext state migration caveat was missing**: OpenTofu refuses to read existing unencrypted state after encryption is enabled unless an `unencrypted` fallback is configured for the migration. Added a short note before the init/apply step.

4. **CloudTrail query selected a non-existent top-level field**: `aws cloudtrail lookup-events` does not return `RequestParameters` as a top-level event field. Changed the query to return `CloudTrailEvent`, where request parameters are contained.

5. **S3 backend SSE-KMS permissions were incomplete**: The S3 backend KMS key requires `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` permissions when `kms_key_id` is configured. Added a note in the S3 backend section.

## Review Notes
- Local `tofu`, `terraform`, and `aws` binaries were not installed in the workspace, so CLI behavior was validated against official documentation rather than local `--help` output.
- The S3 backend uses server-side encryption while the OpenTofu `encryption` block provides client-side state encryption; using different KMS keys for these layers is valid.

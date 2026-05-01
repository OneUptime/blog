# Validation Summary: How to Configure Encryption for Remote State Data Sources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS KMS
- AWS IAM
- `terraform_remote_state`

## Sources Consulted
- OpenTofu docs: State and Plan Encryption - https://opentofu.org/docs/language/state/encryption/
- OpenTofu docs: The `terraform_remote_state` Data Source - https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu source: encryption config schema - https://github.com/opentofu/opentofu/blob/main/internal/encryption/config/config.go
- OpenTofu source: AWS KMS key provider - https://github.com/opentofu/opentofu/blob/main/internal/encryption/keyprovider/aws_kms/provider.go
- AWS KMS docs: Allowing users in other accounts to use a KMS key - https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS KMS docs: Specifying KMS keys in IAM policy statements - https://docs.aws.amazon.com/kms/latest/developerguide/cmks-in-iam-policies.html
- AWS KMS API Reference: `DescribeKey` - https://docs.aws.amazon.com/kms/latest/APIReference/API_DescribeKey.html

## Issues Found
- The AWS KMS `key_provider "aws_kms"` examples omitted the required `key_spec` argument. I added `key_spec = "AES_256"` to each AWS KMS example because OpenTofu validates `key_spec` as required for this provider.
- The simple source and consumer examples used different key provider and method names for the same encrypted remote state. I aligned those names so the consumer matches the source, which is required unless you intentionally use `encrypted_metadata_alias`.
- The `remote_state_data_sources` examples incorrectly used `enforced = true`. I removed those lines because remote state data source targets support `method` and optional `fallback`, but not `enforced`.
- The named remote state example incorrectly targeted `terraform_remote_state.networking` and `terraform_remote_state.database`. I changed those to `networking` and `database`, which is the documented syntax for targeting root-module `terraform_remote_state` data sources.
- The cross-account AWS KMS section implied that an IAM policy on the consuming role was sufficient and only granted `kms:Decrypt` and `kms:DescribeKey`. I corrected the text to note that the source KMS key policy must also allow access, clarified that cross-account configurations should use the key ARN or alias ARN, and added `kms:GenerateDataKey`, which OpenTofu's AWS KMS key provider also uses.

## Review Notes
- The EC2 AMI ID in the example is region-specific and may age out over time; verify a current AMI before using that snippet verbatim.

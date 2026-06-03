# Validation Summary: How to Enable KMS Key Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS KMS
- AWS CLI
- Terraform AWS provider
- AWS Lambda with boto3
- Amazon EventBridge
- AWS CloudTrail
- AWS Config

## Sources Consulted
- AWS KMS Developer Guide: Rotate AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS Developer Guide: Enable automatic key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable.html
- AWS KMS API Reference: EnableKeyRotation: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html
- AWS KMS Developer Guide: Perform on-demand key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-on-demand.html
- AWS KMS Developer Guide: Importing key material: https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys.html
- AWS KMS Developer Guide: Rotate keys manually: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys-manually.html
- AWS KMS Developer Guide: Key states of AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/key-state.html
- AWS KMS pricing: https://aws.amazon.com/kms/pricing/
- AWS CLI Command Reference: enable-key-rotation: https://docs.aws.amazon.com/cli/latest/reference/kms/enable-key-rotation.html
- AWS Config managed rule: cmk-backing-key-rotation-enabled: https://docs.aws.amazon.com/config/latest/developerguide/cmk-backing-key-rotation-enabled.html
- Amazon EventBridge User Guide: Using resource-based policies for EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Terraform Registry: aws_kms_key resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key.html

## Issues Found
- Clarified that automatic rotation applies to symmetric encryption customer managed KMS keys with AWS KMS generated key material, not all symmetric keys.
- Added the missing Terraform `aws_caller_identity` data source required by the key policy example.
- Updated the imported key material section to reflect current AWS KMS support for on-demand rotation of symmetric encryption keys with imported key material after importing new key material into pending rotation state.
- Added custom key stores to the list of key types that do not support automatic or on-demand rotation.
- Narrowed the manual rotation guidance to asymmetric keys, HMAC keys, and keys in custom key stores.
- Added the required Lambda `add-permission` command so the EventBridge rule can invoke the Lambda target.
- Corrected the on-demand rotation explanation to distinguish AWS KMS generated key material from imported key material.
- Corrected the best-practice claim that rotation has no cost. AWS KMS charges a capped additional monthly fee for the first and second rotations of customer managed keys.
- Corrected the manual rotation guidance that suggested disabling old keys. Old manually rotated keys must remain enabled while they are still needed for decryption or signature verification.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI syntax was verified against official AWS CLI and AWS service documentation rather than local `--help` output.

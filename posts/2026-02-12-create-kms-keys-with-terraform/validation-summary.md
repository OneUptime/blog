# Validation Summary: How to Create KMS Keys with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Key Management Service (KMS)
- Terraform
- HashiCorp AWS Provider
- AWS IAM and KMS key policies
- AWS KMS grants
- AWS KMS multi-Region keys
- AWS KMS asymmetric keys

## Sources Consulted
- AWS KMS key policies: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS default key policy: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS KMS automatic key rotation API: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html
- AWS KMS key deletion: https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html
- AWS KMS key spec reference: https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html
- AWS KMS cross-account access: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS KMS multi-Region keys: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- AWS KMS grants: https://docs.aws.amazon.com/kms/latest/developerguide/grants.html
- Amazon S3 SSE-S3 documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- Amazon S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Terraform AWS provider `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform AWS provider `aws_kms_replica_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_replica_key
- Terraform AWS provider `aws_kms_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_alias

## Issues Found
- The introduction said KMS handles encryption keys every time an S3 object is encrypted. This was too broad because S3 uses SSE-S3 by default unless SSE-KMS or DSSE-KMS is selected. Changed the wording to say KMS is used by many AWS encryption features, including SSE-KMS for S3.
- The key administrator policy did not include `kms:RotateKeyOnDemand`, which is now included in the AWS KMS default key administrator example. Added it to the administration action list.
- The lockout warning said removing root account access always prevents modifying the key. This was too absolute because another principal with key policy update permissions could still recover access. Clarified that AWS Support is needed when no remaining principal can update the policy.

## Review Notes
- The Terraform examples use `customer_master_key_spec`, which is still the documented HashiCorp AWS provider argument for `aws_kms_key`. AWS KMS API documentation now calls this concept `KeySpec` and marks the API parameter name `CustomerMasterKeySpec` as deprecated.
- Terraform was not installed in the workspace, so `terraform fmt` and `terraform validate` could not be run locally.

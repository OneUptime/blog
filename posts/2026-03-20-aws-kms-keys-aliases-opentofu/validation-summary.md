# Validation Summary: How to Create AWS KMS Keys and Aliases with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform AWS Provider
- AWS KMS
- AWS CLI
- Amazon RDS

## Sources Consulted
- AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html
- Aliases in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/kms-alias.html
- Create aliases: https://docs.aws.amazon.com/kms/latest/developerguide/alias-create.html
- Default key policy: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS KMS key management for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.Keys.html
- AWS KMS condition keys: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- Multi-Region keys in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- Rotate AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- GetKeyRotationStatus API: https://docs.aws.amazon.com/kms/latest/APIReference/API_GetKeyRotationStatus.html
- `describe-key` command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/describe-key.html
- `get-key-rotation-status` command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/get-key-rotation-status.html
- Allowing users in other accounts to use a KMS key: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- Terraform AWS Provider `aws_kms_key`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- Terraform AWS Provider `aws_kms_replica_key`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_replica_key.html.markdown
- Terraform AWS Provider `aws_kms_alias`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_alias.html.markdown

## Issues Found
- The introduction used outdated "CMK" terminology and implied that customer managed keys themselves provide cross-Region sharing. I updated the wording to use current AWS terminology and clarified that multi-Region keys are the cross-Region mechanism.
- The RDS example granted permissions directly to the `rds.amazonaws.com` service principal. AWS documents RDS as using the KMS key on behalf of the caller, so I changed the example to grant `kms:DescribeKey` and grant-management permissions to an IAM role and restricted grant creation with `kms:ViaService`.
- The multi-Region replica example set `enable_key_rotation` on `aws_kms_replica_key`, but the provider exposes rotation on the primary key and reports it as a shared replica attribute. I removed the invalid argument.
- The cross-account example suggested that the key policy alone was sufficient and only granted decrypt access. I added a note that the partner account also needs an IAM policy in that account and aligned the allowed cryptographic actions with AWS's cross-account example.
- The AWS CLI example used `alias/my-project/main` with `get-key-rotation-status`, but AWS documents that operation as accepting a key ID or key ARN. I updated the command to resolve the key ID from `describe-key` first.
- The conclusion said multi-Region keys are essential for cross-Region encrypted storage like Aurora Global Databases and S3 replication. I corrected this to a narrower claim that matches AWS KMS documentation.

## Review Notes
- The post's `enable_key_rotation = true` examples remain valid. The current Terraform AWS Provider also supports `rotation_period_in_days` on `aws_kms_key`, but omitting it correctly keeps the default 365-day automatic rotation period.

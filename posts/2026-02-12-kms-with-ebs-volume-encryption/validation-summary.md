# Validation Summary: How to Use KMS with EBS for Volume Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EBS
- AWS KMS
- Amazon EC2
- AWS CLI
- Terraform AWS Provider
- AWS Config

## Sources Consulted
- Amazon EBS User Guide: Amazon EBS encryption - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- Amazon EBS User Guide: How Amazon EBS encryption works - https://docs.aws.amazon.com/ebs/latest/userguide/how-ebs-encryption-works.html
- Amazon EBS User Guide: Requirements for Amazon EBS encryption - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption-requirements.html
- Amazon EBS User Guide: Share an Amazon EBS snapshot with other AWS accounts - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html
- Amazon EBS User Guide: Share the KMS key used to encrypt a shared Amazon EBS snapshot - https://docs.aws.amazon.com/ebs/latest/userguide/share-kms-key.html
- Amazon EBS User Guide: Use Amazon EBS snapshots that are shared with you - https://docs.aws.amazon.com/ebs/latest/userguide/view-shared-snapshot.html
- AWS CLI Command Reference: enable-ebs-encryption-by-default - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-ebs-encryption-by-default.html
- AWS CLI Command Reference: modify-ebs-default-kms-key-id - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-ebs-default-kms-key-id.html
- AWS CLI Command Reference: copy-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- AWS Config Developer Guide: encrypted-volumes managed rule - https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- Terraform Registry: aws_ebs_encryption_by_default - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_encryption_by_default
- Terraform Registry: aws_ebs_default_kms_key - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_default_kms_key
- Terraform Registry: aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The "How EBS Encryption Works" sequence incorrectly said KMS returns a plaintext data key at volume creation and that EBS decrypts the data key on attach. Updated it to match AWS documentation: EC2/KMS use encrypted data keys, KMS grants, and Nitro hardware for disk I/O encryption while attached.
- The cross-region `copy-snapshot` example used `--destination-region` as if it selected the destination endpoint. AWS CLI documentation says the CLI destination is selected with `--region`, while `--destination-region` is only for the presigned URL parameter. Replaced it with `--region us-west-2`.
- The migration script hardcoded `--source-region us-east-1` without pinning the region for snapshot creation, waits, snapshot copy, and volume creation. Added a `REGION` variable and applied it consistently so the snapshot and replacement volume are created in the intended region.
- The cross-account encrypted snapshot KMS policy omitted documented `kms:GenerateDataKey*` permissions and did not include the recommended grant condition. Expanded the example into separate key-use and grant statements with `kms:GrantIsForAWSResource`.
- The wrap-up described EBS encryption as "zero-performance-impact". AWS documents same IOPS performance with minimal latency impact, so this was changed to "minimal-performance-impact".

## Review Notes
The local environment did not have the AWS CLI installed, so command verification was performed against official AWS CLI and service documentation rather than local `aws --help` output. The Terraform snippets use current AWS Provider resource and argument names.

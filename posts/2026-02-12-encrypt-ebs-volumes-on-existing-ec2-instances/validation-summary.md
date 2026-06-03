# Validation Summary: How to Encrypt EBS Volumes on Existing EC2 Instances

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Amazon EC2
- Amazon EBS volumes and snapshots
- Amazon EBS encryption
- AWS KMS keys
- AWS CLI
- AWS Config managed rules

## Sources Consulted
- Amazon EBS encryption: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- How Amazon EBS encryption works: https://docs.aws.amazon.com/ebs/latest/userguide/how-ebs-encryption-works.html
- Requirements for Amazon EBS encryption: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption-requirements.html
- Create Amazon EBS snapshots: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- Copy an Amazon EBS snapshot: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html
- Amazon EBS encryption examples: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-examples.html
- Create an Amazon EBS volume: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-volume.html
- Enable Amazon EBS encryption by default: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- AWS CLI copy-snapshot command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- AWS Config encrypted-volumes managed rule: https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS KMS pricing: https://aws.amazon.com/kms/pricing/
- AWS KMS key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html

## Issues Found
- The data volume workflow created a snapshot before unmounting or otherwise pausing writes. AWS recommends pausing writes or unmounting a volume before snapshot creation for a consistent and complete snapshot. Added an unmount step before `create-snapshot` and removed the duplicate later unmount step.
- The root volume script selected `BlockDeviceMappings[0]` as the root volume. Block device mapping order is not a safe way to identify the root volume. Changed the script to read `RootDeviceName` first and then select the mapping whose `DeviceName` matches it.
- The post stated there is no performance penalty or performance cost. AWS documents same IOPS performance with minimal effect on latency, so the wording was updated to match the official guidance.
- The snapshot copy section said the default key is always `aws/ebs`. AWS uses the Region's default EBS KMS key when no `--kms-key-id` is specified, and that default can be changed to a customer-managed key. Updated the wording to make `aws/ebs` conditional on the default not having been changed.
- The AWS-managed KMS key section said there are no KMS charges. AWS-managed keys have no monthly key storage charge, but KMS request charges can still apply. Updated the cost wording.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against the official AWS CLI command reference and AWS service documentation rather than local `--help` output. The overall migration approach, default encryption commands, KMS key distinctions, and AWS Config managed rule identifier are technically correct.

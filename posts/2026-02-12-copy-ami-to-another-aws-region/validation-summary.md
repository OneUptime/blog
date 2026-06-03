# Validation Summary: How to Copy an AMI to Another AWS Region

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS EC2
- Amazon Machine Images (AMIs)
- Amazon EBS snapshots
- AWS KMS
- AWS CLI
- Bash scripting

## Sources Consulted
- AWS EC2 User Guide: Copy an Amazon EC2 AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/CopyingAMIs.html
- AWS EC2 User Guide: How Amazon EC2 AMI copy works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ami-copy-works.html
- AWS EC2 User Guide: Use encryption with EBS-backed AMIs - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIEncryption.html
- AWS CLI Command Reference: aws ec2 copy-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-image.html
- AWS EC2 API Reference: CopyImage - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CopyImage.html
- Amazon EBS User Guide: Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- Amazon EBS User Guide: Copy an Amazon EBS snapshot - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html
- OneUptime linked post: How to Share an AMI Across AWS Accounts - https://oneuptime.com/blog/post/2026-02-12-share-ami-across-aws-accounts/view

## Issues Found
- Replaced invalid placeholder AMI IDs such as `ami-eu-0987654321fedcba0`, `ami-shared-0123456789`, and `ami-failed-123` with syntactically valid AMI-style IDs. AWS AMI IDs use the `ami-` prefix followed by hexadecimal characters.
- Corrected the shared AMI section. A shared AMI can be copied only when the source owner grants read access to the backing storage, and encrypted snapshots require KMS key access.
- Changed the multi-region script comment from "parallel" copying to "initiate copy jobs" because the loop starts asynchronous copy operations sequentially.
- Replaced an invalid placeholder KMS key ARN with a valid customer-managed KMS key ARN format.
- Made the cost section less absolute. AWS documents that standard storage and data transfer rates apply, and snapshot pricing varies by region and amount of stored snapshot data.
- Updated the tags section to mention the supported `--copy-image-tags` option, while keeping the manual tagging example for cases where tags are applied after copying.
- Added a guard in the DR replication script so an empty `describe-images` result does not trigger a copy check with empty AMI values.
- Changed "continuously replicate" to "regularly replicate" for the scheduled DR example, which runs daily or after AMI builds rather than continuously.
- Reworded "free operation" for encryption during copy because AMI copy, snapshot storage, inter-region transfer, and KMS usage can still have associated charges.

## Review Notes
- The AWS CLI examples use current `aws ec2 copy-image`, `describe-images`, `wait image-available`, `describe-snapshots`, and `create-tags` commands.
- The linked OneUptime AMI sharing article resolves and is relevant to the shared AMI section.

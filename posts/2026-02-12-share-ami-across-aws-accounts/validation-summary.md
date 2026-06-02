# Validation Summary: How to Share an AMI Across AWS Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Amazon Machine Images (AMIs)
- Amazon EBS snapshots
- AWS KMS
- AWS Organizations
- AWS CLI
- HashiCorp Packer

## Sources Consulted
- AWS EC2 User Guide: Share an AMI with specific AWS accounts - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-explicit.html
- AWS EC2 User Guide: Make your AMI publicly available for use in Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-intro.html
- AWS EC2 User Guide: Find shared AMIs to use for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/usingsharedamis-finding.html
- AWS EC2 User Guide: Share an AMI with organizations and organizational units - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/share-amis-org-ou-manage.html
- AWS EC2 User Guide: Use encryption with EBS-backed AMIs - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIEncryption.html
- Amazon EBS User Guide: Share an Amazon EBS snapshot with other AWS accounts - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html
- Amazon EBS User Guide: Share the KMS key used to encrypt a shared Amazon EBS snapshot - https://docs.aws.amazon.com/ebs/latest/userguide/share-kms-key.html
- AWS CLI Command Reference: modify-image-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-image-attribute.html
- AWS CLI Command Reference: copy-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-image.html
- AWS CLI Command Reference: create-grant - https://docs.aws.amazon.com/cli/latest/reference/kms/create-grant.html
- AWS KMS Developer Guide: Allowing users in other accounts to use a KMS key - https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- HashiCorp Packer Amazon EBS builder documentation - https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs

## Issues Found
- The post said that sharing an AMI implicitly shares access to underlying EBS snapshots and that the other account can read those snapshots. AWS documents that you do not need to share the referenced EBS snapshots separately for another account to launch instances from a shared AMI; EC2 provides launch-time access. I updated the explanation and the snapshot-access note to distinguish launching from copying a shared AMI.
- The public AMI section did not mention documented public-sharing restrictions. AWS documents that AMIs with encrypted volumes, encrypted snapshots, or product codes cannot be made public, and that AMI block public access must be disabled in the Region. I added those caveats.
- The post claimed that AWS scans public AMIs for common security issues. I did not find AWS EC2 documentation supporting automatic scanning for all public AMIs, so I removed that claim.
- The KMS grant example omitted `GenerateDataKey`, which AWS lists as one of the permissions needed by users accessing encrypted shared snapshots. I added it to the grant operations.
- The KMS key ARNs used invalid placeholder key IDs. I replaced them with syntactically valid example key IDs.

## Review Notes
The AWS CLI examples for modifying AMI launch permissions, describing launch permissions, finding shared AMIs with `--executable-users self`, sharing with AWS Organizations/OUs, copying AMIs, and revoking launch permissions match current AWS CLI and EC2 documentation.

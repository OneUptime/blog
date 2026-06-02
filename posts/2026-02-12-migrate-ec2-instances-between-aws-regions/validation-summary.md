# Validation Summary: How to Migrate EC2 Instances Between AWS Regions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS EC2
- Amazon Machine Images (AMIs)
- Amazon EBS snapshots and volumes
- AWS CLI
- AWS KMS encryption for copied AMIs and snapshots
- VPC networking and security groups
- Route 53 weighted routing
- AWS DataSync, RDS replication, and S3 cross-region replication
- CloudWatch monitoring

## Sources Consulted
- AWS CLI Command Reference: ec2 create-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- Amazon EC2 User Guide: Create an Amazon EBS-backed AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html
- Amazon EC2 User Guide: Copy an Amazon EC2 AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/CopyingAMIs.html
- AWS CLI Command Reference: ec2 copy-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-image.html
- AWS CLI Command Reference: ec2 copy-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EBS User Guide: Create Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- AWS CLI Command Reference: route53 change-resource-record-sets - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 Developer Guide: Weighted routing - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- AWS Data Transfer pricing - https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer

## Issues Found
- The original "Migrating Multiple Volumes" section said that additional EBS volumes need to be migrated separately. AWS documentation states that when creating an EBS-backed AMI, EC2 creates snapshots for the root volume and other attached EBS volumes, and the resulting AMI includes block device mapping information so those volumes launch automatically from the AMI. I changed the sentence to clarify that separate snapshot migration is only needed when a volume was excluded from the AMI, should be moved independently, or needs a fresher cutover snapshot.

## Review Notes
- The AWS CLI commands and major flags used in the post match current AWS CLI documentation.
- The VPC setup example is intentionally minimal. A production migration usually also needs route tables, internet or NAT gateways, load balancers, public IP or Elastic IP decisions, IAM roles, user data, and region-specific key pairs.
- The cost table is a rough planning estimate. Actual inter-region transfer and snapshot storage costs vary by source and destination Region and should be checked against current AWS pricing during a real migration.

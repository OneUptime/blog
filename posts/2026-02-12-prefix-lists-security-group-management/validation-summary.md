# Validation Summary: How to Use Prefix Lists for Security Group Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC managed prefix lists
- AWS-managed and customer-managed prefix lists
- Amazon EC2 security groups
- Amazon VPC route tables
- AWS Resource Access Manager
- AWS CloudFormation
- AWS CLI
- Python boto3

## Sources Consulted
- AWS VPC User Guide: Managed prefix lists - https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html
- AWS VPC User Guide: AWS-managed prefix lists - https://docs.aws.amazon.com/vpc/latest/userguide/working-with-aws-managed-prefix-lists.html
- AWS VPC User Guide: Referencing prefix lists in resources - https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists-referencing.html
- AWS VPC User Guide: Shared prefix list permissions - https://docs.aws.amazon.com/vpc/latest/userguide/sharing-perms.html
- AWS CLI Command Reference: ec2 create-managed-prefix-list - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-managed-prefix-list.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: ram create-resource-share - https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- AWS CloudFormation Template Reference: AWS::EC2::PrefixList - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-prefixlist.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroupIngress - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroupingress.html
- AWS CloudFormation Template Reference: AWS::RAM::ResourceShare - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ram-resourceshare.html

## Issues Found
- The `aws ec2 create-managed-prefix-list` examples used `--tags`, but the current AWS CLI command uses `--tag-specifications` for tagging resources at creation time. Updated both create examples to use `ResourceType=prefix-list` tag specifications.
- The post stated that each customer-managed prefix list entry counts against the security group rule limit. AWS documents that the configured maximum number of entries for a customer-managed prefix list counts against the quota when referenced. Updated the sizing and security group limit wording to use `MaxEntries`, and noted that AWS-managed prefix lists use AWS-defined weights.

## Review Notes
The local environment did not have the AWS CLI installed, so command validation was performed against the official AWS CLI command reference instead of local `--help` output. The examples use placeholder security group IDs, prefix list IDs, route table IDs, gateway IDs, account IDs, and organization IDs; those must be replaced with real values before use.

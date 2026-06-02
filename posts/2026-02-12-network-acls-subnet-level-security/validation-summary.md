# Validation Summary: How to Set Up Network ACLs for Subnet-Level Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- AWS Network ACLs
- AWS Security Groups
- AWS CLI
- VPC Flow Logs
- NAT Gateway and subnet-tier network patterns

## Sources Consulted
- AWS VPC User Guide: Control subnet traffic with network access control lists - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC User Guide: Default network ACL for a VPC - https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html
- AWS VPC User Guide: Custom network ACLs for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS VPC User Guide: Network ACL rules - https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- AWS VPC User Guide: Create a network ACL for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/create-network-acl.html
- AWS VPC User Guide: Infrastructure security in Amazon VPC / Compare security groups and network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/infrastructure-security.html
- AWS CLI Command Reference: create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS CLI Command Reference: create-network-acl - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl.html
- AWS CLI Command Reference: describe-network-acls - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html
- AWS CLI Command Reference: replace-network-acl-association - https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-network-acl-association.html
- OneUptime linked post: How to Enable and Configure VPC Flow Logs - https://oneuptime.com/blog/post/2026-02-12-enable-configure-vpc-flow-logs/view

## Issues Found
No technical issues found.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI reference instead of local `aws --help` output. The post's use of `1024-65535` for ephemeral ports is consistent with AWS guidance for broad compatibility, although AWS notes that exact ephemeral port ranges vary by client operating system and can sometimes be narrowed for known clients.

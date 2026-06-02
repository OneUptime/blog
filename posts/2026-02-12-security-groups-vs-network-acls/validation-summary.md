# Validation Summary: How to Understand Security Groups vs Network ACLs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon VPC
- AWS Security Groups
- Network ACLs
- AWS CLI
- Terraform AWS Provider
- VPC Flow Logs

## Sources Consulted
- AWS VPC User Guide: Infrastructure security in Amazon VPC - https://docs.aws.amazon.com/vpc/latest/userguide/infrastructure-security.html
- AWS VPC User Guide: Control subnet traffic with network access control lists - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC User Guide: Network ACL rules - https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- AWS VPC User Guide: Default network ACL for a VPC - https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html
- AWS VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS EC2 API Reference: CreateNetworkAclEntry - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateNetworkAclEntry.html
- AWS CLI Command Reference: ec2 create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS VPC User Guide: Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS EC2 User Guide: Security group rules - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html
- AWS VPC User Guide: Flow log record examples - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
- Terraform Registry: aws_security_group and current security group rule resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The NACL return-traffic example implied that 1024-65535 is always the ephemeral port range. AWS documents that ephemeral ports vary by client and service, while 1024-65535 is a practical broad range for mixed client types. Updated the wording to reflect that nuance.
- The comparison table said security groups are "up to 5 per ENI." AWS lists 5 as the default quota and notes it is adjustable up to 16. Updated the table to include the default and adjustable limit.
- The Terraform example used `aws_security_group_rule`, which still exists but is no longer HashiCorp's current recommended resource for new security group rules. Updated it to `aws_vpc_security_group_ingress_rule` with `referenced_security_group_id`.
- The NACL usage section said NACLs are the only VPC-native option for blacklisting. That overstates the point, because AWS has other VPC-integrated network controls. Updated it to describe NACLs as the built-in subnet-level option.

## Review Notes
- The AWS CLI command syntax for `aws ec2 create-network-acl-entry` is consistent with the EC2 API and AWS CLI documentation. The AWS CLI was not installed locally, so command verification was done against official AWS CLI/API documentation.
- The internal OneUptime flow logs URL is plausible and a matching post exists in the repository.

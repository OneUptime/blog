# Validation Summary: How to Set Up Shared VPCs with AWS Resource Access Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Resource Access Manager
- Amazon VPC subnet sharing
- AWS Organizations
- Amazon EC2 networking
- Security groups
- Route tables, internet gateways, and NAT gateways
- AWS CLI

## Sources Consulted
- Amazon VPC User Guide: Share your VPC subnets with other accounts: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html
- Amazon VPC User Guide: Responsibilities and permissions for owners and participants: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-share-limitations.html
- Amazon VPC User Guide: Security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Amazon VPC User Guide: Share security groups with AWS Organizations: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-sharing.html
- AWS CLI Command Reference: ram create-resource-share: https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- AWS CLI Command Reference: ram enable-sharing-with-aws-organization: https://docs.aws.amazon.com/cli/latest/reference/ram/enable-sharing-with-aws-organization.html
- AWS CLI Command Reference: ec2 create-vpc: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI Command Reference: ec2 create-subnet: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CLI Command Reference: ec2 create-route-table: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route-table.html
- AWS CLI Command Reference: ec2 create-route: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: ec2 create-nat-gateway: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- The prerequisites said RAM sharing is enabled by default in newer organization setups. I removed that claim because AWS documents this as an organization integration that must be enabled before sharing resources with AWS Organizations.
- The NAT gateway example used a placeholder public subnet that had not been created or routed to an internet gateway. I added the missing public subnet, public route table, default route, and route table association so the NAT gateway example is technically complete.
- Several subnet, route table, and security group placeholders did not follow AWS resource ID formats. I replaced them with realistic placeholder IDs so the CLI examples match the formats AWS validates.
- The RAM examples did not explicitly restrict sharing to organization principals. I added `--no-allow-external-principals`, matching the same-organization requirement for VPC subnet sharing.
- The security group section incorrectly said participants cannot reference security groups from other participant accounts and must use CIDR rules. AWS documents that participants can create rules referencing security groups that belong to the VPC owner or other participants using the owning account ID and security group ID. I corrected the explanation and updated the CLI example to use `--source-group` with `--group-owner`.
- The limitations section said participants create their own default security groups. Participants cannot use the VPC owner's default security group; they create custom security groups instead. I corrected the wording.

## Review Notes
The post is now technically accurate as a high-level tutorial. The commands still use placeholder IDs, so readers must substitute the actual IDs returned by AWS CLI calls in their environment.

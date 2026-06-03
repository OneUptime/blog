# Validation Summary: How to Design a VPC with Public and Private Subnets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- Public and private subnets
- Internet gateways
- NAT gateways
- Route tables
- Security groups
- Network ACLs
- AWS CloudFormation
- AWS CLI

## Sources Consulted
- AWS VPC User Guide: Internet gateways and public/private subnet routing - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC User Guide: Subnet CIDR blocks and reserved IP addresses - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS CloudFormation Template Reference: AWS::EC2::Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation Template Reference: AWS::EC2::EIP - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-eip.html
- AWS CloudFormation Template Reference: AWS::EC2::NatGateway - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS CloudFormation Template Reference: AWS::EC2::Route - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-route.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- AWS CLI Command Reference: cloudformation deploy - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy/
- AWS CLI Command Reference: ec2 create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS CLI Command Reference: ec2 associate-network-acl - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-network-acl.html

## Issues Found
- The post said every resource in a public subnet gets a public IP address and is directly reachable from the internet. This was too broad: AWS defines a public subnet by its route to an internet gateway, and internet communication for IPv4 still requires a public IPv4 address or Elastic IP. Updated the wording to distinguish subnet routing from public IP assignment.
- The post said private subnets have no direct internet access, but the architecture routes private subnet outbound traffic through a NAT gateway. Updated the wording to say private subnets have no direct route to an internet gateway and use NAT for outbound internet access.
- The architecture summary called the single-NAT-gateway design resilient, while the post later correctly warns that a single NAT gateway is not highly available across AZ failures. Updated the summary to call the example simple and secure, and to note that production resiliency requires a NAT gateway in each availability zone.
- The NACL example created a new network ACL but did not associate it with the private subnets, so it would not affect those subnets. Added `associate-network-acl` commands for the private subnet IDs.
- The NACL example allowed inbound traffic only from the VPC CIDR while allowing outbound internet access through NAT. Because NACLs are stateless, that would block return traffic from internet destinations. Added inbound ephemeral TCP and UDP rules for return traffic.

## Review Notes
- The CloudFormation resource types and properties used in the main VPC template are current and valid according to AWS CloudFormation documentation.
- The AWS CLI command shapes are current for AWS CLI v2 documentation, but the local environment did not have the `aws` CLI installed, so command verification was performed against official AWS CLI documentation rather than local `--help` output.
- The template intentionally demonstrates a single NAT gateway for simplicity. For production high availability, the post now notes that each availability zone should have its own NAT gateway and private route table routing to the same-AZ NAT gateway.

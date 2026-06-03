# Validation Summary: How to Create a VPC from Scratch in AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- AWS CLI for Amazon EC2/VPC
- VPC CIDR blocks and subnets
- Internet gateways
- NAT gateways
- Route tables
- Security groups
- AWS CloudFormation

## Sources Consulted
- AWS CLI `create-vpc` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI `modify-vpc-attribute` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI `create-subnet` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CLI `modify-subnet-attribute` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI `create-nat-gateway` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI `authorize-security-group-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon VPC subnet sizing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- Amazon VPC internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC NAT gateway documentation: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/vpc-nat-gateway.html
- AWS CloudFormation `AWS::EC2::VPC` resource documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
- AWS CloudFormation `AWS::EC2::Subnet` resource documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation `AWS::EC2::NatGateway` resource documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS CloudFormation `AWS::EC2::SubnetRouteTableAssociation` resource documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnetroutetableassociation.html
- AWS CloudFormation `DependsOn` documentation for VPC gateway attachments: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html

## Issues Found
- The original CLI walkthrough created the VPC twice: once as a standalone command and again when assigning `VPC_ID`. I combined this into a single tagged `create-vpc` command that captures the VPC ID.
- The CLI-created public subnets did not enable auto-assign public IPv4 addresses. I added `modify-subnet-attribute --map-public-ip-on-launch` for both public subnets, matching the public subnet behavior shown in the CloudFormation example.
- The CloudFormation section claimed to define the same complete VPC with public and private subnets, but it only created the VPC, internet gateway, and two public subnets. I added private subnets, route tables, subnet route table associations, an Elastic IP, a NAT gateway, an internet gateway route, and a NAT gateway route.
- The CloudFormation template needed an explicit gateway attachment dependency for the Elastic IP used by the NAT gateway. I added `DependsOn: AttachGateway` to the `AWS::EC2::EIP` resource, following AWS CloudFormation dependency guidance for VPC resources that require a gateway attachment.

## Review Notes
- The AWS CLI and `cfn-lint` binaries are not installed in this workspace, so local command-help and template lint verification could not be run. Commands and CloudFormation resource properties were verified against current official AWS documentation instead.
- The design uses one NAT gateway for private subnets in two Availability Zones. This is valid, but a future production-hardening improvement would be one NAT gateway per Availability Zone for better zone resilience.

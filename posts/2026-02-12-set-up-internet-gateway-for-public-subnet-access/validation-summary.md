# Validation Summary: How to Set Up an Internet Gateway for Public Subnet Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- AWS Internet Gateway
- AWS EC2 public IPv4 and Elastic IP addressing
- AWS CLI
- AWS CloudFormation
- Terraform AWS Provider
- IPv6 and egress-only internet gateway routing
- Security groups and network ACLs

## Sources Consulted
- AWS VPC User Guide: Enable internet access for a VPC using an internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC User Guide: Example routing options - https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS CLI Command Reference: create-internet-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-internet-gateway.html
- AWS CLI Command Reference: attach-internet-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-internet-gateway.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: modify-subnet-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI Command Reference: allocate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: associate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference: associate-vpc-cidr-block - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- AWS CloudFormation Template Reference: AWS::EC2::Route - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- AWS CloudFormation Template Reference: AWS::EC2::VPCGatewayAttachment - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcgatewayattachment.html
- AWS CloudFormation Template Reference: AWS::EC2::Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation Template Reference: AWS::EC2::SubnetRouteTableAssociation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnetroutetableassociation.html
- Terraform Registry: aws_internet_gateway - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- Terraform Registry: aws_route - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Terraform Registry: aws_route_table_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association

## Issues Found
- The security considerations checklist said NACL rules only needed to allow inbound traffic for internet reachability. Network ACLs are stateless, so inbound connections also require outbound return traffic to be allowed. Updated the checklist item to say "NACL rules allowing inbound traffic and outbound return traffic."

## Review Notes
The AWS CLI commands, CloudFormation resource types and properties, Terraform resource arguments, internet gateway NAT explanation for IPv4, public subnet routing explanation, and IPv6 route guidance were verified against current official documentation. The AWS CLI was not installed in the local environment, so command validation was performed against the AWS CLI v2 command reference instead of local help output.

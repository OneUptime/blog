# Validation Summary: How to Configure IPv6 Route Tables in AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon VPC
- IPv6
- VPC route tables
- Internet Gateway
- Egress-Only Internet Gateway
- AWS CLI
- Amazon EC2 instance metadata service
- Terraform AWS Provider
- AWS CloudFormation

## Sources Consulted
- AWS CLI `create-route` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- Amazon VPC User Guide, internet gateway routing: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide, example routing options: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- Amazon VPC User Guide, add IPv6 support for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- Amazon VPC User Guide, IP addressing for your VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- Amazon EC2 User Guide, instance metadata categories: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- Amazon EC2 User Guide, manage IPv6 addresses for instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-ipv6-addresses.html
- Amazon EC2 API Reference, `Route` shape: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Route.html
- AWS CloudFormation template reference, `AWS::EC2::Route`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- Terraform Registry, `aws_egress_only_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/egress_only_internet_gateway
- Terraform Registry, `aws_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- Terraform Registry, `aws_route_table` route attributes via `aws_route_table` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route_table

## Issues Found
- The introduction said that without IPv6 routes, IPv6-assigned instances "cannot communicate." This was too broad because AWS automatically adds local IPv6 routes within the VPC when an IPv6 CIDR is associated. I corrected this to say the instances cannot reach the internet over IPv6 without the appropriate routes.
- The `describe-route-tables` verification query only exposed `GatewayId`, which would hide the target for private-subnet IPv6 routes that use an egress-only internet gateway. I updated the query to return both `GatewayId` and `EgressOnlyInternetGatewayId`.
- The EC2 metadata examples used IMDSv1-style `curl` commands without a token. That can fail on instances configured to require IMDSv2. I updated the commands to use an IMDSv2 token, which matches current AWS guidance.

## Review Notes
- The Terraform and CloudFormation snippets are technically correct as route-focused examples, but they are partial snippets rather than complete standalone VPC definitions. They assume the VPC, subnets, and referenced gateway resources already exist or are defined elsewhere.
- AWS documentation now also covers NAT64 and DNS64 support on NAT gateways for IPv6 workloads reaching IPv4 destinations. That does not change the correctness of this post's `::/0` egress-only internet gateway guidance for normal outbound IPv6 internet routing, but it is a related caveat worth keeping in mind for future expansion.

# Validation Summary: How to Create a NAT Gateway for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC
- AWS NAT Gateway
- Elastic IP addresses
- VPC route tables and subnet associations

## Sources Consulted
- AWS VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC User Guide: NAT gateway use cases - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- AWS VPC User Guide: Regional NAT gateways for automatic multi-AZ expansion - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html
- Amazon VPC Pricing - https://aws.amazon.com/vpc/pricing/
- Terraform AWS Provider: aws_nat_gateway - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS Provider: aws_eip - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS Provider: aws_route_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS Provider: aws_route_table_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association

## Issues Found
- The post stated that each NAT Gateway requires an Elastic IP and resides in a public subnet. AWS now distinguishes public, private, zonal, and regional NAT gateways. I changed this to "public zonal NAT Gateway" because the Terraform snippets create public zonal NAT gateways for internet egress.
- The high-availability recommendation said to deploy one NAT Gateway per AZ without qualification. I scoped this recommendation to zonal NAT gateways because AWS also supports regional NAT gateways for automatic multi-AZ expansion.
- The cost optimization NAT Gateway snippet omitted the explicit dependency on the internet gateway. I added `depends_on = [aws_internet_gateway.main]`, matching the earlier snippets and Terraform provider guidance for public NAT gateway creation ordering.
- The conclusion gave a fixed approximate monthly cost without mentioning usage-based and public IPv4 charges. I updated it to qualify the estimate as about $33/month at $0.045/hour before data processing, data transfer, and public IPv4 address charges.

## Review Notes
The Terraform snippets are partial examples and assume the VPC, subnets, internet gateway, local AZ list, and public subnet routing already exist. The local environment did not have the Terraform CLI installed, so validation was performed by HCL inspection against the official AWS and Terraform AWS Provider documentation.

# Validation Summary: How to Set Up a NAT Gateway for Private Subnet IPv4 Internet Access in AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS VPC
- AWS NAT Gateway
- Elastic IP addresses
- Public and private subnets
- VPC route tables
- AWS CLI

## Sources Consulted
- AWS VPC User Guide: Connect to the internet or other networks using NAT devices: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat.html
- AWS VPC User Guide: Work with NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-working-with.html
- AWS VPC User Guide: Regional NAT gateways for automatic multi-AZ expansion: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html
- AWS VPC User Guide: Create a VPC with private subnets and NAT gateways using AWS CLI: https://docs.aws.amazon.com/vpc/latest/userguide/create-a-vpc-with-private-subnets-and-nat-gateways-using-aws-cli.html
- AWS VPC User Guide: Pricing for NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS CLI Command Reference: allocate-address: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: create-nat-gateway: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI Command Reference: describe-subnets: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS check IP endpoint used in the verification example: https://checkip.amazonaws.com
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The introduction and conclusion described public subnet placement, Elastic IP use, and one NAT Gateway per AZ as universal requirements. AWS now also supports Regional NAT Gateways for automatic multi-AZ expansion, so I scoped those statements to the zonal public NAT Gateway pattern shown in the article and added a brief note about Regional NAT Gateways.
- The placeholder subnet IDs used non-realistic values (`subnet-0pub1a` and `subnet-0priv1a`). I replaced them with valid-looking placeholder IDs so the examples match AWS resource ID formats more closely.
- The NAT Gateway provisioning comment said availability takes "1-2 minutes." AWS documentation says NAT Gateways take a few minutes to provision, so I changed the wording to "a few minutes."
- The high-availability subnet lookup selected subnets by AZ and name tag only. I added a `vpc-id` filter so the command does not accidentally choose a similarly tagged public subnet from another VPC.

## Review Notes
The AWS CLI commands and flags used in the post are current for AWS CLI v2. The examples still assume the reader replaces placeholder VPC and subnet IDs with resources in an existing VPC where the public subnet has a route to an internet gateway. The author link and `checkip.amazonaws.com` endpoint returned HTTP 200 during link validation.

# Validation Summary: How to Use Elastic IP Addresses Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Elastic IP addresses
- Amazon EC2
- Amazon VPC
- AWS CLI
- NAT gateways
- Terraform AWS provider
- AWS Service Quotas
- Elastic Load Balancing
- Amazon Route 53
- AWS Global Accelerator
- IPv6

## Sources Consulted
- AWS EC2 User Guide: Elastic IP addresses: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Amazon VPC Pricing: Public IPv4 address pricing: https://aws.amazon.com/vpc/pricing/
- AWS CLI Command Reference: allocate-address: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: associate-address: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference: create-nat-gateway: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- Amazon VPC User Guide: IP addressing for VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- AWS Global Accelerator Developer Guide: How AWS Global Accelerator works: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- Terraform AWS provider documentation: aws_eip: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS provider documentation: aws_nat_gateway: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS General Reference: Amazon EC2 endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/ec2-service.html

## Issues Found
- The allocation section used the older pricing model, saying an EIP does not cost anything while associated with a running instance. Updated it to state that AWS charges for all Elastic IP addresses, whether in use or idle.
- The EIP costs section still said the first EIP on a running instance is free. Updated the list to distinguish idle public IPv4 charges from in-use public IPv4 charges and changed the effective date wording to February 1, 2024.
- The NAT gateway section said NAT gateways require an Elastic IP. Updated it to specify public NAT gateways, because private NAT gateways do not require public Elastic IP addresses.

## Review Notes
The AWS CLI examples use current command names and options. The Terraform examples use current AWS provider resource names and arguments. The referenced OneUptime links point to matching local post directories.

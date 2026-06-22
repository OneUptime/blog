# Validation Summary: How to Deploy Network Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS VPC
- AWS subnets and route tables
- NAT Gateway and Elastic IP
- Network ACLs
- VPC endpoints
- VPC peering
- AWS Transit Gateway

## Sources Consulted
- HashiCorp Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp AWS provider `aws_vpc_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- HashiCorp AWS provider `aws_nat_gateway` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- HashiCorp AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp AWS provider `aws_vpc_peering_connection` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- HashiCorp AWS provider `aws_vpc_peering_connection_accepter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- HashiCorp AWS provider `aws_ec2_transit_gateway` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- HashiCorp AWS provider `aws_ec2_transit_gateway_vpc_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- AWS VPC NAT Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC gateway endpoints documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS VPC Network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC peering route table documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- AWS Transit Gateway routing documentation: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html

## Issues Found
- The private and data subnet route table associations used `var.single_nat_gateway ? 0 : count.index`. When `enable_nat_gateway = false` and multiple availability zones are configured, only one private route table is created, so `count.index` would reference route tables that do not exist. Updated the expression to use per-AZ route tables only when NAT is enabled and `single_nat_gateway` is false.
- The VPC peering route used `aws_route_table.private[count.index]`, which fails when a single private route table is created. Updated it to use the same route table index condition as the subnet associations.
- The VPC peering explanation implied the shown routes were sufficient for private communication. AWS requires routes in the route tables for both sides of the peering connection, so the text now calls out reciprocal peer VPC routes.
- The Transit Gateway explanation omitted the need for routes in attached VPC subnet route tables. AWS requires subnet route tables to route target CIDRs through the Transit Gateway, so the text now notes that requirement.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The reviewed snippets were checked against current official Terraform AWS provider and AWS networking documentation instead.

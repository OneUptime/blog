# Validation Summary: How to Create VPC Subnets with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Provider for Terraform/OpenTofu
- Amazon VPC (Virtual Private Cloud)
- AWS Subnets (public, private, database)
- AWS Route Tables and Route Table Associations
- Terraform `cidrsubnet` function
- AWS Availability Zones data source

## Sources Consulted
- AWS Provider documentation: `aws_subnet` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet)
- AWS Provider documentation: `aws_availability_zones` data source (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones)
- AWS Provider documentation: `aws_route_table` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table)
- AWS Provider documentation: `aws_route_table_association` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association)
- OpenTofu documentation for `cidrsubnet` function (https://opentofu.org/docs/language/functions/cidrsubnet/)
- Terraform `count` and splat expression documentation
- AWS VPC subnet documentation (https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html)

## Issues Found
No technical issues found.

## Review Notes
- The `cidrsubnet(var.vpc_cidr, 8, count.index)` call assumes `var.vpc_cidr` is a /16 (commonly /16 for AWS VPCs), producing /24 subnets. The offsets used (0-2, 10-12, 20-22) are well-spaced and non-overlapping, leaving room for future expansion.
- The post references `aws_vpc.main` and `aws_internet_gateway.main` and `var.vpc_cidr` as if they are defined elsewhere — this is a reasonable assumption for a focused tutorial on subnets, but readers will need to define these resources/variables in their own configuration.
- The `route` inline block in `aws_route_table` is supported, though HashiCorp also recommends `aws_route` as a separate resource for more granular lifecycle control. Both approaches are valid.
- The post does not show outputs for database subnets, only public and private — this is a minor omission but does not affect technical correctness.
- No private route tables / NAT gateway are shown for the private subnets. Outbound internet access for private subnets typically requires a NAT gateway and a separate route table — this is out of scope for the post but worth noting for readers building a complete VPC.

# Validation Summary: How to Create Subnets with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- HCL (HashiCorp Configuration Language)
- AWS VPC / Subnets
- AWS RDS subnet groups
- AWS Availability Zones
- EKS / AWS Load Balancer Controller (subnet auto-discovery tags)

## Sources Consulted
- Terraform AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider `aws_db_subnet_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS Load Balancer Controller subnet discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/
- OpenTofu docs (HCL is identical to Terraform): https://opentofu.org/docs/

## Issues Found
No technical issues found.

- All `aws_subnet` arguments (`vpc_id`, `cidr_block`, `availability_zone`, `map_public_ip_on_launch`, `tags`) are valid and current.
- The `cidrsubnet(prefix, newbits, netnum)` function signature and usage are correct.
- The CIDR visualisation table is mathematically correct: with `10.0.0.0/16` + `newbits = 4`, the produced `/20` subnets at indices 0–5 are exactly `10.0.0.0/20`, `10.0.16.0/20`, `10.0.32.0/20`, `10.0.48.0/20`, `10.0.64.0/20`, and `10.0.80.0/20`.
- The `kubernetes.io/role/elb = "1"` tag is the correct tag used by the AWS Load Balancer Controller for public subnet auto-discovery.
- `aws_db_subnet_group` arguments (`name`, `subnet_ids`, `tags`) are correct.
- The splat expression `aws_subnet.database[*].id` is valid Terraform/HCL.
- `data "aws_availability_zones"` with `state = "available"` and the `.names` attribute is current and correct.

## Review Notes
- The post does not pin a provider version. In production usage, readers should pin the AWS provider version in a `terraform`/`required_providers` block to avoid unexpected behaviour from future provider releases.
- The example `cidr_block = "10.0.1.0/24"` in the basic example is fine, but readers should be aware that AWS reserves the first four addresses and the last address (`.0`, `.1`, `.2`, `.3`, `.255` in a /24) within every subnet.
- For private subnets used by EKS internal load balancers, the companion tag `kubernetes.io/role/internal-elb = "1"` is also commonly applied; the post only shows the public-facing tag, which is appropriate for the public subnet example shown.
- `map_public_ip_on_launch = true` is set on the public subnets, which is correct, but this only ensures public IPs are assigned — it does not by itself make the subnet "public"; an internet gateway and route are also required (out of scope for this post, which focuses purely on subnets).

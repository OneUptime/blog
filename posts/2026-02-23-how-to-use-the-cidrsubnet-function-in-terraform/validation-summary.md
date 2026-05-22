# Validation Summary: How to Use the cidrsubnet Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform IP network functions
- CIDR subnetting
- AWS VPC subnet configuration

## Sources Consulted
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `cidrsubnets` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnets
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost

## Issues Found
- The mixed-size subnet example set `lb_subnet = cidrsubnet(var.vpc_cidr, 12, 256)`, which calculates to `10.0.16.0/28` and overlaps the preceding database subnet `10.0.16.0/24`. Changed the load balancer subnet to `cidrsubnet(var.vpc_cidr, 12, 272)`, which calculates to `10.0.17.0/28`, so the example no longer overlaps the database subnet.

## Review Notes
The Terraform function signature and explanations of `prefix`, `newbits`, and `netnum` match the official Terraform documentation. The post does not mention Terraform version-specific behavior, and the reviewed function remains current in Terraform v1.15.x documentation.

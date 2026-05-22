# Validation Summary: How to Use the reverse Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform collection functions
- Terraform numeric, IP network, and string/list functions
- AWS VPC DHCP options
- AWS VPC route tables

## Sources Consulted
- Terraform `reverse` function documentation: https://developer.hashicorp.com/terraform/language/functions/reverse
- Terraform `range` function documentation: https://developer.hashicorp.com/terraform/language/functions/range
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `sort` function documentation: https://developer.hashicorp.com/terraform/language/functions/sort
- Terraform `min` function documentation: https://developer.hashicorp.com/terraform/language/functions/min
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS VPC route priority documentation: https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html
- Terraform AWS provider `aws_vpc_dhcp_options` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_dhcp_options

## Issues Found
- The DNS priority example computed `dns_servers_reversed` but passed `var.dns_servers` to `aws_vpc_dhcp_options.main`. Changed `domain_name_servers` to use `local.dns_servers_reversed` so the resource matches the example's stated behavior.
- The route table section implied that AWS route creation order affects route precedence. AWS VPC route priority is based on the longest prefix match, with additional tie-breaking rules for static, prefix-list, and propagated routes. Updated the heading and explanation to describe `reverse` as an iteration/display helper rather than a precedence mechanism.

## Review Notes
Terraform and OpenTofu CLIs were not installed locally, so examples were verified against official documentation rather than local console execution. The remaining Terraform function examples are consistent with the official documentation for `reverse`, `range`, `slice`, `sort`, `min`, and `cidrsubnet`.

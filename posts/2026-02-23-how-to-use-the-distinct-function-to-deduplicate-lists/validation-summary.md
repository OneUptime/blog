# Validation Summary: How to Use the distinct Function to Deduplicate Lists

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform collection functions: `distinct`, `concat`, `flatten`, `toset`, `tolist`
- Terraform `for_each`
- AWS provider data sources and security group rules

## Sources Consulted
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- Terraform `toset` function documentation: https://developer.hashicorp.com/terraform/language/functions/toset
- Terraform `tolist` function documentation: https://developer.hashicorp.com/terraform/language/functions/tolist
- Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform `sort` function documentation: https://developer.hashicorp.com/terraform/language/functions/sort
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- AWS provider `aws_instances` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instances
- AWS provider `aws_instance` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance

## Issues Found
- Corrected the expected result for iterating over the `instances` map. Terraform sorts map/object keys lexically when producing an ordered result from a `for` expression, so the listed zones were not in declaration order.
- Changed the practical example introduction from preventing duplicate subnets to preventing duplicate per-AZ resources, because the snippet creates NAT gateways rather than subnets.
- Corrected the security group explanation. `toset` removes duplicate elements and does not fail merely because the input list contains duplicate values.
- Corrected the `flatten` and `distinct` port example. Terraform map iteration is lexical by key, and `sort` is documented for lists of strings rather than lists of numbers, so the output now returns the deduplicated numeric list directly.
- Corrected the `toset` comparison. Sets are unordered, and converting a set back to a list has undefined ordering that should not be relied on.
- Corrected the computed AWS instance example. The `aws_instances` data source exports instance IDs and IP addresses, but not `instance_type_ids`; the post now looks up each instance with `aws_instance` and extracts `instance_type` and `subnet_id` from those data source instances.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed locally.

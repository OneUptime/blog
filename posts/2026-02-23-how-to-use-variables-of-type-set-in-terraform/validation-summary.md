# Validation Summary: How to Use Variables of Type Set in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables and type constraints
- Terraform collection functions
- Terraform `for_each`
- AWS Terraform provider resources

## Sources Consulted
- HashiCorp Terraform Types and Values: https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform `for_each` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform `toset` function: https://developer.hashicorp.com/terraform/language/functions/toset
- HashiCorp Terraform `tolist` function: https://developer.hashicorp.com/terraform/language/functions/tolist
- HashiCorp Terraform `sort` function: https://developer.hashicorp.com/terraform/language/functions/sort
- HashiCorp Terraform `setunion` function: https://developer.hashicorp.com/terraform/language/functions/setunion
- HashiCorp Terraform `setintersection` function: https://developer.hashicorp.com/terraform/language/functions/setintersection
- HashiCorp Terraform `setsubtract` function: https://developer.hashicorp.com/terraform/language/functions/setsubtract
- HashiCorp Terraform `setproduct` function: https://developer.hashicorp.com/terraform/language/functions/setproduct
- HashiCorp Terraform variable validation documentation: https://developer.hashicorp.com/terraform/language/validate
- AWS Regions documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The comparison table said sets work directly with `for_each` without qualifying the element type. Terraform's `for_each` accepts maps and sets of strings, so I changed the table entry to "Works directly for sets of strings."
- The `setproduct` example showed an ordered list-like result even though the inputs are sets and set ordering is not guaranteed. I changed the comment to say the result includes those pairs, avoiding an implied stable ordering.
- The availability zone subnet example used `index(tolist(local.all_azs), each.value)` to allocate subnet CIDR numbers. Terraform documents that converting a set to a list produces an undefined order, so this could assign unstable CIDR indexes. I added `sorted_all_azs = sort(tolist(local.all_azs))` and used that sorted list for `index()`.
- The region validation regex claimed to require valid AWS region names but excluded real AWS regions such as `ca-central-1` and `af-south-1`. I changed the regex and error message to describe a general AWS-region-name shape instead of claiming complete validation against AWS's live region catalog.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate` locally. The examples were reviewed against official HashiCorp Terraform documentation and AWS documentation.

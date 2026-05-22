# Validation Summary: How to Use the setintersection Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform collection and set functions
- Terraform for expressions
- Terraform AWS provider data sources and resources
- AWS Availability Zones

## Sources Consulted
- HashiCorp Terraform `setintersection` function reference: https://developer.hashicorp.com/terraform/language/functions/setintersection
- HashiCorp Terraform `setproduct` function reference: https://developer.hashicorp.com/terraform/language/functions/setproduct
- HashiCorp Terraform `setsubtract` function reference: https://developer.hashicorp.com/terraform/language/functions/setsubtract
- HashiCorp Terraform `toset` function reference: https://developer.hashicorp.com/terraform/language/functions/toset
- HashiCorp Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform `index` function reference: https://developer.hashicorp.com/terraform/language/functions/index_function
- HashiCorp Terraform `keys` function reference: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform Registry AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform Registry AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS Availability Zone IDs documentation: https://docs.aws.amazon.com/ram/latest/userguide/working-with-az-ids.html

## Issues Found
- The post described `setintersection` as taking "two or more" sets while also showing a single-set example. Verified with Terraform 1.14.0 console and corrected the description and summary to "one or more" sets.
- The AWS Availability Zone example compared AZ names across accounts. AWS documents that AZ names can map differently across accounts, so the example now compares `zone_ids` and uses `availability_zone_id` for subnets.
- The access-control example only intersected the first two assigned roles even though the surrounding text described multiple roles. Updated it to use Terraform's function argument expansion syntax, `setintersection(local.role_permissions...)`, with an empty-list guard.
- The CIDR section used "overlapping" wording, but `setintersection` only detects exact matching values, not network containment or CIDR overlap. Updated the wording to "shared" and "exact CIDR blocks."
- The set function family section said Terraform provides three set operations, omitting `setunion`. Updated the wording and summary to include `setunion`.
- The type-consistency note said all elements must be the same type. Terraform sets have a single element type, but compatible mixed primitive values can be converted to a common type. Updated the wording to reflect Terraform's conversion behavior.

## Review Notes
Terraform CLI was not installed in the workspace, so I downloaded the official Terraform 1.14.0 Linux binary from HashiCorp releases into a temporary directory and used `terraform console` to verify the single-argument, empty-set, mixed-type, and function-expansion cases. No persistent tool installation was made.

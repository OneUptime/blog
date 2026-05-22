# Validation Summary: How to Use the map Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform collection and type conversion functions
- Terraform `for_each` meta-argument
- AWS S3 bucket resource example

## Sources Consulted
- Terraform `map` function documentation: https://developer.hashicorp.com/terraform/language/functions/map
- Terraform `tomap` function documentation: https://developer.hashicorp.com/terraform/language/functions/tomap
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints

## Issues Found
- The `for_each` S3 bucket example declared `acl` and `versioned` values in the input map but did not use them in the resource, which made the example misleading and mixed map iteration with unrelated bucket settings. Updated the example to use a `purpose` field and reference `each.value.purpose` in tags, keeping the example focused on map iteration and the documented `each.value` behavior.

## Review Notes
The post is technically accurate after the correction. Terraform's documentation states that `map` is no longer available, that Terraform v0.12 introduced first-class object/map literal syntax, and that `tomap` is the explicit conversion function for map values. Terraform documentation also notes that object and map values are often used interchangeably through automatic conversion, so the post's practical map-literal examples are appropriate for current Terraform usage.

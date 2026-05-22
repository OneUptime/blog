# Validation Summary: How to Use the list Function in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform collection and type conversion functions
- Infrastructure as Code

## Sources Consulted
- HashiCorp Terraform documentation: `list` function - https://developer.hashicorp.com/terraform/language/functions/list
- HashiCorp Terraform documentation: `tolist` function - https://developer.hashicorp.com/terraform/language/functions/tolist
- HashiCorp Terraform documentation: `toset` function - https://developer.hashicorp.com/terraform/language/functions/toset
- HashiCorp Terraform documentation: Types and Values - https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform documentation: Type Constraints - https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform documentation: For Expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform documentation: `setintersection` function - https://developer.hashicorp.com/terraform/language/functions/setintersection
- HashiCorp Terraform documentation: `setunion` function - https://developer.hashicorp.com/terraform/language/functions/setunion
- HashiCorp Terraform documentation: `range` function - https://developer.hashicorp.com/terraform/language/functions/range
- HashiCorp Terraform documentation: `concat` function - https://developer.hashicorp.com/terraform/language/functions/concat
- HashiCorp Terraform documentation: `flatten` function - https://developer.hashicorp.com/terraform/language/functions/flatten

## Issues Found
- The post described `list()` as deprecated since Terraform 0.12. HashiCorp's current documentation says the `list` function is no longer available. Updated the wording in the introduction, summary, and takeaways.
- The post implied square bracket syntax directly creates Terraform list values. HashiCorp documents bracket expressions as tuple values that Terraform can automatically convert to lists when required. Updated the explanation while preserving the practical guidance.
- The post implied `tolist` gives an ordered list from a set. HashiCorp documents set ordering as undefined when converted to a list. Updated the explanation and example comments to avoid suggesting stable ordering.
- The "Converting for_each Keys to a List" example was actually converting a set variable, not `for_each` keys. Renamed the subsection and local variable to match the code.
- The mixed-type pitfall claimed a local tuple literal like `[1, "two", true]` would cause an error. Terraform can represent mixed tuple values, and errors occur when Terraform must convert incompatible values to a more specific collection type. Updated the example to use a typed `list(number)` variable.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were verified against official HashiCorp documentation rather than local `terraform console` execution.

# Validation Summary: How to Use the length Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform built-in functions
- AWS Terraform provider resource examples

## Sources Consulted
- Terraform `length` function documentation: https://developer.hashicorp.com/terraform/language/functions/length
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform custom conditions and variable validation documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions

## Issues Found
- The post described string length as the number of "Unicode characters." Terraform's official documentation is more precise: strings are counted as characters represented by Unicode grapheme clusters, not bytes or Unicode sequences. Updated the wording in the explanatory text and edge-case note.
- The ECS section called the snippet a "complete example," but it references surrounding resources such as task definitions that are not included in the snippet. Changed this to "larger example" to avoid implying the snippet is standalone.

## Review Notes
The Terraform CLI was not installed in the review environment, so examples were checked against official HashiCorp documentation rather than local `terraform console` execution. The AWS resource examples are illustrative and assume surrounding resources such as VPCs, security groups, and ECS task definitions exist.

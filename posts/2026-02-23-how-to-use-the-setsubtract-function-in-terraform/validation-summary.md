# Validation Summary: How to Use the setsubtract Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform collection and set functions
- Terraform variable validation
- Terraform `for_each`
- AWS provider `aws_s3_bucket` resource

## Sources Consulted
- HashiCorp Developer: `setsubtract` function reference - https://developer.hashicorp.com/terraform/language/functions/setsubtract
- HashiCorp Developer: `setintersection` function reference - https://developer.hashicorp.com/terraform/language/functions/setintersection
- HashiCorp Developer: `setproduct` function reference - https://developer.hashicorp.com/terraform/language/functions/setproduct
- HashiCorp Developer: `contains` function reference - https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Developer: `toset` function reference - https://developer.hashicorp.com/terraform/language/functions/toset
- HashiCorp Developer: `for_each` meta-argument reference - https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Developer: Validate your infrastructure in Terraform's configuration language - https://developer.hashicorp.com/terraform/language/validate
- Terraform Registry: AWS provider `aws_s3_bucket` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The tag-audit example included an incorrect intermediate comment saying `Owner` would be an extra tag, followed by a self-correction. Removed the incorrect comment and kept the correct `toset([])` result because `Owner` is included in `required_tags`.
- The set-function family section said "all three set functions," but Terraform's documented set-related functions also include `setunion`. Changed the wording to "these set functions" to avoid implying Terraform has only three set functions.

## Review Notes
Terraform CLI was not installed in the workspace, so local `terraform console` or `terraform validate` execution was not available. The review was completed against official HashiCorp Developer documentation and the Terraform AWS provider registry documentation.

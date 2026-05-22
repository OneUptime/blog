# Validation Summary: How to Pass Input Variables to Terraform Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- Terraform input variables
- HCL type constraints
- Terraform variable validation
- Terraform sensitive and nullable variables

## Sources Consulted
- HashiCorp Developer: variable block reference for Terraform configuration language - https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Developer: module block reference - https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Developer: Type constraints, including optional object type attributes - https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Developer: Use input variables to add module arguments - https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Developer: Validate modules with custom conditions - https://developer.hashicorp.com/terraform/tutorials/configuration-language/custom-conditions
- HashiCorp Developer: Protect sensitive input variables - https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables

## Issues Found
- The post described `optional()` as a function. HashiCorp's Terraform documentation describes it as the `optional` modifier for object type attributes, so the wording was corrected to avoid implying it is a general Terraform function.
- The post stated that variable validation runs before any resources are planned. Terraform evaluates variable validations while creating a plan and stops the operation if a condition fails, so the wording was corrected to say validation runs while Terraform creates a plan and before Terraform finishes planning.
- The post stated that variables cannot be set to `null` by default unless explicitly allowed. Terraform's `nullable` argument defaults to `true`, so variables are nullable by default. The wording was corrected to explain that `nullable = true` is explicit and `nullable = false` disallows `null`.

## Review Notes
The examples use current Terraform syntax. The `optional()` object attribute defaults require Terraform 1.3 or later, which the post now describes accurately.

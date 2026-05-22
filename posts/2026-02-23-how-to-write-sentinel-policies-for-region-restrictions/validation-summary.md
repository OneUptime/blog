# Validation Summary: How to Write Sentinel Policies for Region Restrictions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform policy enforcement
- Sentinel policy language
- Sentinel `tfconfig/v2`, `tfplan/v2`, and `tfrun` imports
- AWS, Azure, and Google Cloud region attributes

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel functions documentation: https://developer.hashicorp.com/sentinel/docs/language/functions
- HashiCorp Sentinel rules documentation: https://developer.hashicorp.com/sentinel/docs/language/rules
- HashiCorp Sentinel `strings` import documentation: https://developer.hashicorp.com/sentinel/docs/imports/strings
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfconfig/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfconfig-v2
- HashiCorp Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfrun
- Terraform Registry AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry AzureRM provider `azurerm_resource_group` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group
- Terraform Registry Google provider `google_compute_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- Several Sentinel snippets were marked with `python` code fences. Changed them to `sentinel` so the examples are not presented as Python.
- Several `all` quantifier bodies contained statement-style assignments and `if` blocks. Sentinel quantifier bodies are boolean expressions, while statements belong in functions. Moved that logic into helper functions and had the rules call those helpers.
- The AWS provider configuration example matched `provider_config_key` with `^aws.*`, which misses provider keys from child modules. Changed the check to use the documented `provider.name` field.
- Several plan-based examples accessed missing resource attributes directly. In `tfplan/v2`, unknown or absent fields may be omitted from `after`, and direct comparisons with `undefined` can make policies fail incorrectly. Added `else null` and helper accessors where needed.
- The Azure example said it normalized location casing but compared the original value. Added the `strings` import and `strings.to_lower(location)`.
- The GCP example imported `strings` after declarations, but Sentinel imports must appear before other statements. Moved the import to the top of the snippet.
- The data sovereignty snippet used `print()` followed by `true` as separate expressions in a rule body. Changed it to a single boolean expression using `print(...) and true`.

## Review Notes
- The examples are now syntactically aligned with the current Sentinel language rules and current HCP Terraform Sentinel import references.
- The AWS availability zone examples derive a region by trimming the final zone letter, which is suitable for standard AWS availability zone names such as `us-east-1a`. Environments using Local Zones, Wavelength Zones, or other extended zone identifiers may need provider-level region checks or a more specific parser.

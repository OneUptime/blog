# Validation Summary: How to Write Sentinel Policies to Enforce Tagging Standards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise Sentinel policy enforcement
- Sentinel policy language
- Terraform `tfplan/v2` and `tfrun` Sentinel imports
- AWS provider tagging, `default_tags`, and `tags_all`
- AWS resource tags

## Sources Consulted
- HashiCorp Sentinel language documentation: https://developer.hashicorp.com/sentinel/docs/language
- HashiCorp Sentinel boolean expressions and `is defined`: https://developer.hashicorp.com/sentinel/docs/language/boolexpr
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Sentinel `test` command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- Terraform AWS Provider resource tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- AWS Tag Editor service quotas: https://docs.aws.amazon.com/tag-editor/latest/userguide/reference.html

## Issues Found
- Several Sentinel examples checked missing `tags`, `tags_all`, or `labels` attributes by comparing directly to `null` or `undefined`. In Sentinel, missing selectors evaluate to `undefined`, and comparisons involving incompatible or undefined values can themselves become `undefined`. I changed those examples to use `is defined` / `is not defined` before reading optional attributes, so policies avoid accidental undefined rule results.
- The tag value and environment-specific examples filtered on `rc.change.after.tags is not null`, which could skip resources with a defined but null `tags` attribute instead of reporting missing tags. I changed those filters to select resources where the `tags` attribute is defined, then fail explicitly when the value is null.
- The Sentinel policy snippets were marked as `python` code blocks even though they are Sentinel, not Python. I changed those fences to `sentinel`.

## Review Notes
The `sentinel test enforce-tags.sentinel` command matches the documented Sentinel CLI test usage. The AWS tag key and value length limits in the post match AWS documentation. The `tags_all` explanation is consistent with the Terraform AWS Provider tagging guide, which documents `tags_all` as the read-only view of all tags applied to a resource, including provider-level default tags.

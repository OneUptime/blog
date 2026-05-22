# Validation Summary: How to Write Sentinel Policies to Restrict Instance Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform policy enforcement
- Sentinel policy language
- Sentinel CLI testing
- AWS EC2, RDS, and ElastiCache Terraform resources
- AzureRM virtual machine Terraform resources
- Google Compute Engine Terraform resources

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel boolean expressions and quantifiers: https://developer.hashicorp.com/sentinel/docs/language/boolexpr
- HashiCorp Sentinel conditionals: https://developer.hashicorp.com/sentinel/docs/language/conditionals
- HashiCorp Sentinel strings import: https://developer.hashicorp.com/sentinel/docs/imports/strings
- HashiCorp Sentinel test command: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Terraform `tfplan/v2` Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfrun` Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_elasticache_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- AzureRM provider `azurerm_virtual_machine` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine
- AzureRM provider Linux and Windows VM resources: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Google provider `google_compute_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- Several Sentinel examples used statement blocks with assignments and `if` statements directly inside `main = rule { ... }` or `all ... { ... }` expressions. Sentinel rules and quantifier bodies must be boolean expressions, while `if` statements are only allowed outside rule expressions. Moved those checks into helper functions and kept `main` rule bodies as boolean expressions.
- The code fences labeled Sentinel policies as `python`. Changed them to `sentinel` so syntax highlighting matches the actual language.
- The family restriction example described prefix matching but split the instance type and compared exact family names, so the `"u-"` high-memory block would not match types such as `u-6tb1.56xlarge`. Reworked the blocklist to use explicit blocked prefixes with `strings.has_prefix`.
- The multi-resource example checked `instance_type is undefined`, which is less robust than recovering missing map keys with Sentinel's `else` operator. Updated attribute lookup to use `else null` and check for `null`.
- The multi-cloud example built a merged map with top-level `for` mutation. While top-level loops are valid Sentinel, a literal merged map is clearer and avoids unnecessary mutation in a tutorial snippet. Replaced it with an explicit merged map.

## Review Notes
- The examples intentionally filter actions using `contains "create"` or `contains "update"` so replacement operations are included. HashiCorp's `tfplan/v2` docs recommend exact list comparison when selecting only one action shape, but list membership is appropriate for these broader create/update checks.
- The `sentinel test restrict-instance-types.sentinel -verbose` command and test directory layout match the current Sentinel CLI documentation.

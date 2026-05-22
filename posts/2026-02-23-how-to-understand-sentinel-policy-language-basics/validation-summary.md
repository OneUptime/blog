# Validation Summary: How to Understand Sentinel Policy Language Basics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sentinel policy language
- Terraform / HCP Terraform Sentinel policy enforcement
- `tfplan/v2` Sentinel import
- Policy as code

## Sources Consulted
- HashiCorp Sentinel Language Specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel Language - Undefined: https://developer.hashicorp.com/sentinel/docs/language/undefined
- HashiCorp Sentinel Language - Collection Operations: https://developer.hashicorp.com/sentinel/docs/language/collection-operations
- HashiCorp Sentinel Language - Loops: https://developer.hashicorp.com/sentinel/docs/language/loops
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2

## Issues Found
- The post described Sentinel multi-line strings as heredoc syntax. HashiCorp's Sentinel specification documents double-quoted string literals and backtick-delimited string literals, so the text and example were corrected to use backtick-delimited multi-line strings.
- The post said Sentinel uses `is` and `is not` instead of `==` and `!=`, and that `==` only works in some contexts. The Sentinel specification lists both forms as comparison operators with identical equality behavior, so the explanation was corrected.
- Sentinel code blocks were tagged as `python`. They were changed to `sentinel` so the snippets are identified as the correct language.
- Several `tfplan/v2` examples used `contains "create"` or `contains "update"` to filter actions. HashiCorp's `tfplan/v2` reference recommends exact action-list comparison for change type filtering, so those examples were changed to compare `rc.change.actions` to `["create"]` or `["update"]`.
- The `count_violations` example accepted `max_size` but referenced `allowed_types`, which was not passed to the function. The function parameter was corrected to `allowed_types`.
- The tag-filtering and undefined-value examples compared potentially undefined values directly. Sentinel's undefined documentation recommends recovering with the `else` operator, so the examples were updated to use `else null` before comparison.

## Review Notes
No Sentinel CLI was available in the local environment, so validation was performed against HashiCorp's official language and Terraform import documentation rather than by executing the snippets.

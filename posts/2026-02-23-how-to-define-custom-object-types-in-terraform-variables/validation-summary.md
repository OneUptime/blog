# Validation Summary: How to Define Custom Object Types in Terraform Variables

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Terraform (HCL language)
- Terraform type constraints (`object`, `list`, `map`, `optional`)
- Terraform input variable validation blocks
- Terraform built-in functions (`coalesce`, `contains`, `can`, `regex`, `alltrue`, `distinct`, `length`)
- Terraform dynamic blocks
- AWS provider resources (`aws_db_instance`, `aws_instance`, `aws_security_group`)
- `terraform.workspace` reference

## Sources Consulted
- Terraform Type Constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform Input Variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `coalesce` function: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform Dynamic Blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp blog: Terraform 1.3 release announcement (optional object attributes GA)
- AWS Provider `aws_db_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found

1. **Inaccurate description of unknown-attribute handling.** The bulleted list under "Basic Object Type Definition" claimed Terraform "checks that ... No unknown attributes are included (by default)", which implies it errors on extras. The actual documented behavior is that extra attributes are silently discarded during type conversion. Reworded the section to describe the silent-discard behavior accurately.

## Review Notes

- The claim that `optional()` is available since Terraform 1.3 is correct — it was experimental from 0.14 and promoted to GA in 1.3 (September 2022), which also introduced the second-argument default value form used throughout the post.
- `optional()` without a default value correctly returns `null` per official docs.
- `coalesce()` usage in the Merge Pattern example is sound: it returns the first non-null, non-empty-string argument. Future readers should be aware that for string attributes this also skips empty strings (not just nulls), but the example values are non-string-empty so the behavior matches the post's description.
- Validation blocks referencing `var.<self>` are explicitly supported and correct.
- `aws_db_instance.backup_retention_period` is the correct provider argument name.
- The simplified error message shown under "Basic Object Type Definition" is a stylized representation; current Terraform versions emit slightly more verbose, box-drawn error output, but the content of the example is faithful.
- The `dynamic "ingress"` block syntax inside `aws_security_group` matches the current documented pattern.
- No deprecated APIs or removed features referenced.

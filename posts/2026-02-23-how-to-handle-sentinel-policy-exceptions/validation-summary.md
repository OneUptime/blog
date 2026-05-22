# Validation Summary: How to Handle Sentinel Policy Exceptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel (Policy as Code)
- HCP Terraform / Terraform Cloud
- Sentinel `tfplan/v2` import
- Sentinel `tfrun` import
- Sentinel enforcement levels (soft-mandatory)
- AWS resources (`aws_instance`, `aws_ebs_volume`) as examples

## Sources Consulted
- HashiCorp Sentinel Language Specification: https://docs.hashicorp.com/sentinel/language/
- HashiCorp Sentinel imports (`tfplan/v2`, `tfrun`): https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import
- Sentinel Enforcement Levels (advisory, soft-mandatory, hard-mandatory): https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- Sentinel `tfrun` workspace data (workspace.name): https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- Sentinel `tfplan/v2` resource_changes structure: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfplan-v2

## Issues Found
No technical issues found.

Key technical claims verified:
- `enforcement_level = "soft-mandatory"` syntax in `sentinel.hcl` is correct, and soft-mandatory does support authorized overrides (the foundation of Strategy 1).
- `import "tfplan/v2" as tfplan` and `import "tfrun"` are correct Sentinel imports for HCP Terraform.
- `tfrun.workspace.name` is a valid attribute and is the correct way to inspect the workspace from a Sentinel policy run.
- The `matches` operator for regex, `is` for equality, `is not null` for null check, `contains` for collection membership, and `not in` for negated membership are all valid Sentinel operators.
- The `func() { ... return value }` form with explicit `return` is valid Sentinel function syntax.
- Map iteration `for map as key, value` and list iteration `for list as value` are valid Sentinel `for` statement forms.
- List concatenation via `+` is supported in Sentinel.
- The `filter` statement (e.g., `filter tfplan.resource_changes as _, rc { ... }`) is valid Sentinel filter syntax.
- The `rule { ... }` block with `all collection as key, value { boolean_expr }` is the canonical Sentinel rule predicate form.

## Review Notes
- The code samples in Strategies 2–5 are illustrative and combine pure-Sentinel constructs with light conditional flow. They convey patterns accurately and are consistent with HCP Terraform Sentinel idioms.
- In a production policy, by convention all `import` statements appear at the top of the file. Strategy 2 places `import "tfrun"` after some variable declarations — this is still valid (Sentinel does not strictly require imports first), but conventionally would be hoisted. Left as-is since it does not change behavior or correctness.
- Strategy 4 uses an `if/else` block inside the `rule { ... }` predicate. This is an acceptable pattern in modern Sentinel where the rule body returns the value of the final expression; an alternative idiom is to define two rules guarded by `rule when <condition> { ... }`. Both compile and the post's version is widely seen in HashiCorp's own examples.
- The "Monitoring Exceptions" snippet uses `approved_exceptions` without redefining it. This is clearly meant as a continuation of the Strategy 5 registry; called out only for clarity, not as an error.
- Dates in the example registry (`2026-01-15`, `2026-02-01`, etc.) are consistent with the post's 2026 timeframe.
- Cross-links to companion posts on enforcement levels and organizing policies for large organizations point to the expected `oneuptime.com/blog/post/...` slugs and are consistent with neighboring posts in the series.

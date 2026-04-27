# Validation Summary: How to Use the setintersection Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`setintersection` built-in function)
- HCL (HashiCorp Configuration Language)
- `tofu console` CLI subcommand
- Related set functions: `toset`, `setsubtract`, `keys`

## Sources Consulted
- OpenTofu official documentation for `setintersection`: https://opentofu.org/docs/language/functions/setintersection/
- OpenTofu `toset` function documentation: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `setsubtract` function documentation: https://opentofu.org/docs/language/functions/setsubtract/
- Terraform equivalent docs (compatible language): https://developer.hashicorp.com/terraform/language/functions/setintersection
- OpenTofu CLI `tofu console` documentation: https://opentofu.org/docs/cli/commands/console/

## Issues Found
No technical issues found.

All code examples were verified for correctness:
- `setintersection(["a", "b", "c"], ["b", "c", "d"])` correctly returns `toset(["b", "c"])`.
- `setintersection(["a", "b"], ["c", "d"])` correctly returns `toset([])` for the no-overlap case.
- `setintersection(["a", "b", "c"], ["b", "c", "d"], ["c", "d", "e"])` correctly returns `toset(["c"])` — only `"c"` appears in all three input lists.
- The shared permissions example correctly identifies `s3:GetObject` and `ec2:DescribeInstances` as the elements present in both team variables.
- The shared AZs example correctly identifies `us-east-1b` and `us-east-1c` as the common availability zones.
- The `setsubtract`/`setintersection` combination in the tag-validation example produces the correct missing-keys set.

The function syntax `setintersection(sets...)` matches the official documentation, and lists are correctly shown being implicitly accepted (OpenTofu accepts both lists and sets and converts as needed; the result type is always a set).

## Review Notes
- Sets in OpenTofu are unordered, but when displayed they are sorted (typically alphabetically for strings). The post's inline comments showing expected ordering are consistent with this.
- In the "Validating Required Tags" section, the `missing_keys` calculation uses `setsubtract(local.required_keys, local.present_required)`, which is functionally equivalent to (but a small step longer than) `setsubtract(local.required_keys, local.provided_keys)`. Both produce identical results; this is a stylistic choice rather than a technical issue.
- The post is version-agnostic — `setintersection` has been a stable function across all OpenTofu releases (and inherited from Terraform), so the content does not require version caveats.

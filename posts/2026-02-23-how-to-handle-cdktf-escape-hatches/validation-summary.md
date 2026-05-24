# Validation Summary: How to Handle CDKTF Escape Hatches

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDKTF (Cloud Development Kit for Terraform)
- Terraform
- TypeScript
- AWS Provider (`@cdktf/provider-aws`)
- Jest-style testing with `cdktf` Testing utilities

## Sources Consulted
- CDKTF Resources / Escape Hatch docs: https://developer.hashicorp.com/terraform/cdktf/concepts/resources
- CDKTF Functions docs: https://developer.hashicorp.com/terraform/cdktf/concepts/functions
- CDKTF Unit Tests docs: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- CDKTF TypeScript API Reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript
- CDKTF source code: https://github.com/hashicorp/terraform-cdk/blob/main/packages/cdktf/lib/terraform-element.ts
- CDKTF source code: https://github.com/hashicorp/terraform-cdk/blob/main/packages/cdktf/lib/terraform-resource.ts
- AWS Provider documentation for `aws_instance`, `aws_db_instance`, `aws_lb`, `aws_security_group`

## Issues Found

1. **`Fn.dataAwsRegionCurrent` does not exist.** The post claimed `Fn.dataAwsRegionCurrent` could be used to get the current AWS region. The `Fn` class in CDKTF only exposes Terraform's built-in functions (like `timestamp()`, `lookup()`, `format()`, etc.) and does NOT contain AWS-specific data sources. AWS data sources are exposed via separate classes such as `DataAwsRegion` from `@cdktf/provider-aws/lib/data-aws-region`. **Fix:** Replaced the broken example with `Fn.timestamp()`, which is a real built-in Terraform function exposed on `Fn`, demonstrating the same "type-safe alternative to raw interpolation" point the author was making.

2. **`resetOverride(path)` method does not exist.** The post had a section titled "The resetOverride Method" describing how to remove a previously-set override. However, CDKTF's `TerraformElement` / `TerraformResource` classes do not expose a `resetOverride(path)` public method. Only `resetOverrideLogicalId()` exists, which is unrelated (it resets logical IDs, not property overrides). There is no public API to undo an `addOverride` call. **Fix:** Removed the entire "The resetOverride Method" section since its premise was incorrect.

## Review Notes

- The `addOverride` dot-notation path semantics described in the post are accurate. CDKTF interprets paths like `"metadata_options.http_tokens"` as nested object property assignments.
- Some examples (such as the `provisioner.remote-exec.*` overrides and `depends_on` override using `${bucket.node.id}` interpolation) work for simple flat cases but may need numeric indices (e.g., `provisioner.0.remote-exec.inline`) or use of `bucket.fqn` for more complex/nested constructs. These are not strictly incorrect for the illustrative examples shown but are worth noting as caveats for readers who try to extend the patterns.
- `Fn.timestamp()` is exposed in the CDKTF `Fn` class; the more commonly documented alternative is `Fn.plantimestamp()` which is evaluated at plan-time. Either would be a valid replacement for the broken example.
- Testing utilities (`Testing.app()`, `Testing.synth()`) and the `cdktf synth` CLI usage are all correct.
- Provider-level overrides (e.g., on `AwsProvider`) are valid since providers extend `TerraformElement` which provides `addOverride`.

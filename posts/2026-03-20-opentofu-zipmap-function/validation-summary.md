# Validation Summary: How to Use the zipmap Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language functions)
- Terraform (shared function semantics)
- AWS provider resources (`aws_security_group_rule`, `aws_instance`) used in illustrative examples

## Sources Consulted
- OpenTofu `zipmap` function documentation: https://opentofu.org/docs/language/functions/zipmap/
- Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each

## Issues Found
- **Console output format in "Step-by-Step Usage" section was inaccurate.** The post showed `tofu console` returning `{x = 10, y = 20}` (single-line, unquoted keys), but the actual OpenTofu/Terraform console output uses a multi-line format with quoted string keys. Updated the example to:
  ```
  {
    "x" = 10
    "y" = 20
  }
  ```
  This matches the real `tofu console` output and the format shown in the official OpenTofu documentation.

## Review Notes
- The `zipmap(keyslist, valueslist)` syntax is correct.
- The constraint that both lists must have the same length is correctly stated; passing mismatched lengths raises an error.
- The keys list must contain strings; the values list can contain heterogeneous types — the post correctly notes this.
- The `for_each = local.service_port_map` example with a `map(string -> number)` is valid: `for_each` accepts maps with any value type (only the "set of strings" constraint applies to sets, not maps), so the security group rule example works as written.
- The inline comment `# Returns {a = 1, b = 2, c = 3}` in the basic example uses informal (unquoted) notation; this is a code comment describing the returned value rather than literal console output, so it was left unchanged.
- The description "It is the inverse of using `keys()` and `values()` to split a map" is a reasonable conceptual framing — the official docs describe `zipmap` as constructing a map by pairing elements from two lists, which is the inverse operation of `keys()`/`values()` decomposition.

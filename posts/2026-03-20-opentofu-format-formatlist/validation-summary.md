# Validation Summary: How to Use format() and formatlist() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (and equivalently Terraform) language functions
- HCL (HashiCorp Configuration Language)
- AWS provider resources used in examples (`aws_iam_policy_document`, `aws_security_group`)

## Sources Consulted
- Official OpenTofu `format()` documentation: https://opentofu.org/docs/language/functions/format/
- Official OpenTofu `formatlist()` documentation: https://opentofu.org/docs/language/functions/formatlist/

## Issues Found
No technical issues found.

Verification details:
- `format(format_string, values...)` syntax matches the official documentation.
- All format verbs shown (`%s`, `%d`, `%f`, `%05d`, `%q`, `%v`, `%%`) are documented as supported by OpenTofu's `format()`. Notably, `%v` is supported and produces the default formatting for the underlying value type (booleans render as `true`/`false`), so `format("Value: %v", true)` correctly yields `"Value: true"`.
- The `%.2f` width/precision example for floats is correct (`"1.50 GB"`).
- The `%05d` zero-padding example produces `"00042"` as shown.
- The `%q` example output `"Name: \"my resource\""` correctly reflects how the OpenTofu/Terraform console displays the resulting string with embedded quotes escaped.
- `formatlist(spec, values...)` syntax and its iteration behavior over list arguments match the official documentation.
- The interpolation pattern `"arn:aws:iam::%s:role/${var.role_name}"` is valid — the `${...}` template is expanded before the string is passed to `formatlist()`.
- The `aws_iam_policy_document` `principals` block (with `type = "AWS"` and `identifiers = [...]`) and `aws_security_group` `count = length(...)` / `name = ...[count.index]` patterns are valid HCL.

## Review Notes
- The post does not state a minimum OpenTofu/Terraform version, but the `format()` and `formatlist()` functions and the `%v` verb have been available in all supported OpenTofu releases as well as historical Terraform releases, so version-specific caveats are not required.
- The example using `count` together with `formatlist()` works, but `for_each` over the `services` list (e.g. `for_each = toset(var.services)`) is generally preferred in modern HCL because it produces stable resource addresses if the list order changes. This is a stylistic improvement, not a correctness issue, and is out of scope for this post.

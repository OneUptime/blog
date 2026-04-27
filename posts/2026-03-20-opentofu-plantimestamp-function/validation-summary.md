# Validation Summary: How to Use the plantimestamp Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (`plantimestamp`, `timestamp`, `formatdate` built-in functions)
- HCL configuration language
- AWS provider resources (`aws_instance`, `aws_s3_object`, `aws_ssm_parameter`)
- Infrastructure as Code (general concepts)

## Sources Consulted
- OpenTofu `plantimestamp` function docs: https://opentofu.org/docs/language/functions/plantimestamp/
- OpenTofu `timestamp` function docs: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `formatdate` function docs: https://opentofu.org/docs/language/functions/formatdate/

## Issues Found

1. **Incorrect `formatdate` specifier `HH` used for 24-hour formatting.** The post used `HH` in three places (basic example, deployment timestamp tag local, versioned artifact key local). According to the OpenTofu `formatdate` reference, `HH` is the **12-hour** zero-padded specifier; the **24-hour** zero-padded specifier is `hh`. Since the surrounding format strings have no AM/PM marker and are clearly intended to express 24-hour timestamps (e.g. matching the `2026-03-20T14:30:00Z` example), all three `HH` usages were corrected to `hh` (and `HHmmss` to `hhmmss`).

2. **`plantimestamp()` shown being called in `tofu console`.** The OpenTofu docs explicitly state: "The `plantimestamp` function is not available within the OpenTofu console." The Step-by-Step Usage section's `tofu console` snippet would actually error. Replaced the snippet with a note about the console limitation and a `tofu plan` example that surfaces the value through an `output`, which is the supported way to observe `plantimestamp()`.

## Review Notes

- The OpenTofu docs for `plantimestamp` recommend the function primarily for use in custom conditions comparing against provider-exported timestamps (e.g. validating TLS certificate expiry), and warn that timestamps generated in configuration may be recomputed during refresh-only plans without propagating to resources. The post's framing focuses on resource tagging and artifact naming, which is a legitimate use but not the primary documented use case. Using `plantimestamp()` in resource attributes can still produce drift between plans (the value changes per plan operation), so in practice readers should usually pair it with `lifecycle { ignore_changes = [...] }`. The post is not technically wrong — within a single plan/apply the value is stable — but a reader looking for "set-and-forget" deployment tags may be surprised by replan diffs. Left as-is per the "minimal fixes only" instruction.
- `plantimestamp` was introduced in OpenTofu 1.8 (it has no Terraform equivalent). The post does not call out the version requirement; readers on older OpenTofu releases or on Terraform will not have access to this function. A future revision could mention this caveat.

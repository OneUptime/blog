# Validation Summary: Designing Reusable Modules in OpenTofu

## Status
validated

## Post Type
Guide / Best-practices

## Technologies Covered
- OpenTofu
- Terraform / HCL (configuration language)
- AWS provider (`hashicorp/aws`) — `aws_instance`, `aws_security_group`, `aws_route53_record`, `aws_cloudwatch_metric_alarm`, `aws_sns_topic`
- Terraform/OpenTofu language features: `variable` blocks, `validation` blocks, `optional()` object attributes with defaults, `merge()`, `terraform { required_providers { ... } }`

## Sources Consulted
- OpenTofu language documentation — Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu language documentation — Outputs: https://opentofu.org/docs/language/values/outputs/
- OpenTofu language documentation — Type Constraints / `optional()`: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `merge` function: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `tobool` function: https://opentofu.org/docs/language/functions/tobool/
- OpenTofu `regex` / `can` functions: https://opentofu.org/docs/language/functions/regex/, https://opentofu.org/docs/language/functions/can/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Terraform AWS provider docs (`aws_instance`, `aws_route53_record`, `aws_cloudwatch_metric_alarm`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- **Tag merge order contradicted the comment / intent.** In the "Tag Management Strategy" section the code used `merge(local.required_tags, var.tags)` while the adjacent comment stated *"Caller tags override defaults, but not required tags"*. Per the `merge()` function spec, the **last** argument takes precedence on key conflicts, so as written the caller's `var.tags` would silently override the required tags (e.g., a caller could change `ManagedBy` away from `"opentofu"`). Swapped the argument order to `merge(var.tags, local.required_tags)` so `required_tags` actually wins, matching the stated intent.

## Review Notes
- The `tobool("dns_zone_id required when create_dns_record is true")` trick in the "Handling Optional Resources" section is a working but hacky pattern: it relies on `tobool` raising a conversion error whose message surfaces the supplied string. Modern OpenTofu/Terraform supports cleaner alternatives — a `validation` block on the variable (with cross-variable references, supported in Terraform 1.9+ / OpenTofu 1.8+) or a `precondition` block in a `lifecycle` — but the example as written is not technically incorrect.
- The instance-type validation regex `^[a-z][0-9]+\.[a-z]+$` is intentionally narrow and will reject several legitimate AWS instance type families (e.g. `c5n.large`, `t4g.medium`, `m6i.xlarge`, anything with a generation/suffix letter before the dot, plus metal sizes like `c5.metal`). It works for the `t3.medium` / `m5.large` examples cited but readers copying the snippet may hit false negatives. Not changed because the post explicitly frames it as an example pattern rather than an exhaustive validator.
- The `terraform { ... }` settings block is still the canonical name in OpenTofu and remains correct; OpenTofu 1.8+ also accepts `tofu { ... }` as an OpenTofu-only alternative, but using `terraform` keeps the module compatible with both tools.
- AWS provider version range `">= 4.0, < 6.0"` is currently valid (AWS provider 5.x is the latest major as of this review); will need to be widened once 6.x ships.

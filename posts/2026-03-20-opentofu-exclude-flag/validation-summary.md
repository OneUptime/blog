# Validation Summary: How to Use the -exclude Flag in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI, version 1.9+)
- Terraform-style HCL resource addressing
- AWS provider resource examples (illustrative)

## Sources Consulted
- [OpenTofu CLI plan command documentation](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu CLI plan resource targeting section](https://opentofu.org/docs/cli/commands/plan/#resource-targeting)
- [What's new in OpenTofu 1.9?](https://opentofu.org/docs/v1.9/intro/whats-new/)
- [OpenTofu 1.9.0 release announcement](https://opentofu.org/blog/opentofu-1-9-0/)
- [GitHub Issue #426 - -exclude flag for targeted plan/apply](https://github.com/opentofu/opentofu/issues/426)
- [env0 blog: OpenTofu 1.9 introduces the exclude flag](https://www.env0.com/blog/opentofu-1-9-introduces-the-exclude-flag-and-for-each-for-providers)

## Issues Found
No technical issues found. All commands, flags, and behaviors described in the post align with the official OpenTofu documentation:

- `-exclude` is correctly described as the inverse of `-target` (introduced in OpenTofu 1.9).
- The flag is supported on `tofu plan` and `tofu apply` as shown.
- The address syntax for whole resources, modules, `count` indices (e.g. `aws_instance.web[2]`), and `for_each` keys (e.g. `aws_s3_bucket.buckets["legacy"]`) is valid.
- The dependency semantics described ("resources that depend on the excluded one are also implicitly skipped") match the official docs: "do not depend on any such resources or modules that were excluded."
- The partial-state warning text is consistent with OpenTofu's actual warning output for `-exclude`/`-target` plans.
- Multiple `-exclude` flags can be combined in a single command, as shown.

## Review Notes
- The OpenTofu documentation notes that, while individual instance addresses (with `count`/`for_each` indices) are accepted by `-target` and `-exclude`, the recommended pattern is to use whole-resource addresses where possible. The post's instance-level examples work but represent an advanced use case; future revisions could call out this nuance.
- OpenTofu also offers `-exclude-file=FILENAME` for managing many exclusions; this could be a worthwhile follow-up topic but is out of scope for the current post.
- The official documentation emphasizes that `-exclude` (like `-target`) should be used "in exceptional circumstances only, such as recovering from mistakes or working around OpenTofu limitations." The post conveys this spirit through its "partial state" and "temporary workaround" sections.

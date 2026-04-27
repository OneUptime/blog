# Validation Summary: How to Use -target-file and -exclude-file in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.10+)
- Terraform (conceptually related)
- AWS provider resources (used in examples)
- Bash / shell scripting

## Sources Consulted
- [OpenTofu plan command documentation](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu resource addressing documentation](https://opentofu.org/docs/cli/state/resource-addressing/)
- [OpenTofu 1.10 What's New documentation](https://opentofu.org/docs/v1.10/intro/whats-new/)
- [GitHub issue #2429: Read multiple -target or -exclude addresses from a file](https://github.com/opentofu/opentofu/issues/2429)

## Issues Found
No technical issues found.

All technical claims were verified against official OpenTofu documentation:
- The `-target-file` and `-exclude-file` flags exist and were introduced in OpenTofu 1.10.
- File format (one resource address per line) is accurate.
- Comment support with `#` lines is documented and correct.
- Blank lines being ignored is documented and correct.
- Supported address formats (simple resource, module, count instances with `[n]`, for_each instances with `["key"]`) all match the official resource addressing documentation.
- Combining `-target-file` with `-target` flags is permitted (both are positive targeting, only positive vs. negative targeting is mutually exclusive).
- The warning about partial state mirrors official guidance for the existing `-target`/`-exclude` flags.

## Review Notes
- The OpenTofu documentation describes the file-based targeting feature as experimental in 1.10, with the final UX subject to change. The post does not call this out, but this is a caveat rather than a technical error.
- The post's phrasing "Apply only the resources listed in targets.txt" is slightly simplified — `-target` (and by extension `-target-file`) also includes dependencies of the targeted resources. This is a minor simplification appropriate for an introductory tutorial and is not technically incorrect.
- The examples consistently use `tofu` as the binary name, which is correct for OpenTofu (not `terraform`).

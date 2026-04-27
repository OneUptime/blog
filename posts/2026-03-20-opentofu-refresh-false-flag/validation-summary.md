# Validation Summary: How to Use the -refresh=false Flag in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform (referenced as a related tool)
- Infrastructure as Code

## Sources Consulted
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
No technical issues found.

All technical claims were verified against the official OpenTofu documentation:
- `-refresh=false` correctly described as disabling the default behavior of synchronizing state with remote objects before plan/apply.
- `-refresh-only` correctly described as an alternative dedicated drift detection mode.
- `-target=ADDRESS`, `-out=FILENAME`, and `-input=false` are all valid flags and combine with `-refresh=false` as shown.
- The default behavior (refresh enabled, equivalent to `-refresh=true`) is accurate.
- The claim that applying a saved plan file does not refresh again at apply time is correct — saved plans capture state at plan time.
- The trade-offs noted (drift risk after manual console changes, auto-scaling events, multi-team modifications) accurately reflect the documented caveat that skipping refresh "causes OpenTofu to overlook external changes."

## Review Notes
- The OpenTofu documentation explicitly notes that `-refresh=false` cannot be combined with `-refresh-only`. The post correctly treats these as alternatives rather than complementary flags, so this constraint is respected.
- Performance numbers (~3 minutes vs ~10 seconds for 200 resources) are illustrative; actual numbers vary heavily by provider, API latency, and parallelism settings, but the post frames them as an example which is appropriate.
- No version-specific caveats; the `-refresh` flag has been stable in both OpenTofu and Terraform for a long time.

# Validation Summary: Using tofu state rm in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu state rm`, `tofu state list`, `tofu plan`, `tofu import`, `tofu workspace`)
- OpenTofu state management
- HCL `removed` block (OpenTofu 1.7+)
- Bash scripting (for bulk removal example)
- AWS provider resource addresses (used as illustrative examples)

## Sources Consulted
- [OpenTofu — Command: state rm](https://opentofu.org/docs/cli/commands/state/rm/) — confirmed supported flags (`-dry-run`, `-backup`, `-lock`, `-lock-timeout`, `-state`, `-state-out`, `-ignore-remote-version`), the address-matching semantics, and that `tofu state rm 'module.foo'` removes all instances within the module.
- [OpenTofu — Removing resources / `removed` block](https://opentofu.org/docs/language/resources/syntax/#removing-resources) — confirmed the `removed { from = ...; lifecycle { destroy = false } }` syntax and behavior.
- [OpenTofu 1.7.0 release announcement](https://opentofu.org/blog/opentofu-1-7-0/) — confirmed that the `removed` block was introduced in OpenTofu 1.7 (April 2024).
- [OpenTofu — State documentation](https://opentofu.org/docs/language/state/) — general state management context.

## Issues Found
No technical issues found.

All command flags, resource addressing examples (basic, module-scoped, `count`-indexed, `for_each`-keyed), and the `removed` block example are consistent with the official OpenTofu documentation. Specifically:
- `-dry-run` and `-backup` flags exist for `tofu state rm`.
- `tofu state rm 'module.deprecated_module'` does remove all instances within the module.
- `tofu state rm` automatically creates a `terraform.tfstate.backup` file when using the local backend.
- The `removed` block with `lifecycle { destroy = false }` correctly removes a resource from state without destroying the underlying infrastructure (OpenTofu 1.7+).
- Example output strings (`Removed ...`, `Successfully removed N resource instance(s).`, `Would remove ...`) are plausible and consistent with the CLI's actual output format.

## Review Notes
- The post focuses on AWS resource examples, but the `tofu state rm` mechanics are provider-agnostic — readers should understand the same approach applies to any provider.
- The `removed` block is the recommended approach for team environments (as the post correctly notes), since it tracks the change in code rather than as an out-of-band CLI operation. Future OpenTofu versions may further expand this block (e.g., for module removal); readers should consult the docs for their installed version.
- The `-state`/`-state-out`/`-backup` flags are documented as legacy and only apply to the local backend — the post's use of `-backup` is accurate but worth noting that it has no effect on remote backends.
- The `tofu plan  # Should show no changes` comment in the "Abandoning Manual Resources" scenario assumes the resource block has been removed from `.tf` files (which the prior step in the example does); this is correctly sequenced.

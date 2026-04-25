# Validation Summary: How to Plan and Preview Imports Before Applying in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu CLI: `tofu plan`, `tofu show`, `tofu apply`
- OpenTofu `import` blocks
- OpenTofu `-generate-config-out`
- OpenTofu `lifecycle.ignore_changes`

## Sources Consulted
- [OpenTofu Docs: Import](https://opentofu.org/docs/language/import/)
- [OpenTofu Docs: Generating configuration](https://opentofu.org/docs/language/import/generating-configuration/)
- [OpenTofu Docs: Command: plan](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu Docs: Command: show](https://opentofu.org/docs/cli/commands/show/)
- [OpenTofu Docs: Command: apply](https://opentofu.org/docs/cli/commands/apply/)
- [OpenTofu Docs: Resource Behavior (`ignore_changes` syntax)](https://opentofu.org/docs/v1.11/language/resources/behavior/)
- [OpenTofu Docs: JSON Output Format](https://opentofu.org/docs/internals/json-format/)

## Issues Found
1. **Saved plan inspection command used a legacy form.** The post used `tofu show import.tfplan`. Current OpenTofu documentation recommends the explicit `tofu show -plan=import.tfplan` target-selection form, while the positional filename form is documented as legacy usage. Updated the command accordingly.

2. **`-generate-config-out` behavior was overstated.** The original text said it lets you "see exactly what attributes the resource has," which is not how the feature is documented. OpenTofu generates configuration only for import targets that do not already exist in configuration, writes it to a new file path, and describes that generated HCL as a starting point / best guess that may need edits. Updated the explanation and code comments to match current docs.

3. **Mismatch guidance was too absolute.** The original wording implied any post-import update means you should always change HCL to match the existing resource. In practice, OpenTofu can import a resource and then intentionally update it to match the desired configuration. I qualified that guidance so it specifically applies to the zero-change import workflow the post is advocating.

## Review Notes
- The core explanation that `import` blocks are processed during planning and executed during apply is correct.
- `tofu plan -out=import.tfplan` and `tofu apply import.tfplan` are valid current workflows.
- The `lifecycle.ignore_changes = [tags["LastModified"]]` syntax is valid; OpenTofu supports index notation for map and list elements in `ignore_changes`.
- Current OpenTofu docs still mark configuration-driven import processing and `-generate-config-out` as experimental. The commands are valid today, but this area may continue to evolve across minor releases.
- The local workspace did not have the `tofu` binary installed, so command verification was performed against current official OpenTofu documentation rather than local `--help` output.

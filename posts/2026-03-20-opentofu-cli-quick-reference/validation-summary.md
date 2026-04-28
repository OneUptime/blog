# Validation Summary: How to Use the OpenTofu CLI Quick Reference

## Status
validated

## Post Type
Reference / Cheat sheet

## Technologies Covered
- OpenTofu CLI (`tofu`)
- Infrastructure as Code (HCL)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `destroy` command: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu `state` commands: https://opentofu.org/docs/cli/commands/state/
- OpenTofu `workspace` commands: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu `fmt` command: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu 1.9 release notes (introduction of `-exclude` flag): https://github.com/opentofu/opentofu/releases

## Issues Found
No technical issues found. All commands, flags, and usage patterns shown match the current OpenTofu CLI:

- `tofu init` flags (`-upgrade`, `-backend-config`, `-get=false`) are correct.
- `tofu plan` flags (`-out`, `-var`, `-var-file`, `-target`, `-exclude`, `-destroy`, `-detailed-exitcode`) are correct, including the `-detailed-exitcode` exit code semantics (0 = no changes, 1 = error, 2 = changes).
- `-exclude` is a valid OpenTofu-specific flag (added in OpenTofu 1.9) that does not exist in Terraform — appropriately included in an OpenTofu-focused post.
- `tofu apply` flags (`-auto-approve`, `-replace`, `-parallelism`, `-refresh-only`) are correct, and `apply plan.tfplan` accepts a saved plan file.
- `tofu state` subcommands (`list`, `show`, `mv`, `rm`, `pull`, `push`) and the redirection idiom for `pull` are correct.
- `tofu workspace` subcommands (`list`, `new`, `select`, `show`, `delete`) are correct.
- `tofu output`, `tofu show`, `tofu graph`, `tofu version`, `tofu providers` are correct.
- `tofu validate`, `tofu fmt -check`, `tofu fmt -recursive` are correct.
- `tofu console` REPL behavior is correctly described.

## Review Notes
- The comment `# import state` next to `tofu state push terraform.tfstate` is mildly imprecise wording — `state push` overwrites the remote state with the contents of a local state file (it is not the same as `tofu import`, which imports existing infrastructure into state). The phrasing is understandable in context (it imports a state file into the backend) and is not technically incorrect, so no change was made.
- The comment `# Refresh state only (no changes)` for `tofu apply -refresh-only` refers to no infrastructure changes — the state file itself can be updated to reflect detected drift. This matches the documented behavior; the brief comment is acceptable for a cheat sheet.
- Single-dash flag style (`-out`, `-var`) is the canonical OpenTofu/Terraform CLI convention, even though double-dash also works. The post correctly uses the canonical style throughout.

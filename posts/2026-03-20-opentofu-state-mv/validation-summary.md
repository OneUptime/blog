# Validation Summary: Using tofu state mv in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform / OpenTofu state management
- HCL configuration language
- `moved` blocks
- AWS provider resources (used as examples)

## Sources Consulted
- OpenTofu official documentation: `tofu state mv` command — https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu documentation on `moved` blocks for refactoring

## Issues Found
No technical issues found.

All flags shown in the post (`-dry-run`, `-state`, `-state-out`, `-backup`) are supported by `tofu state mv` per the official documentation. The basic syntax `tofu state mv [options] SOURCE DESTINATION` is correct. Resource addressing syntax for indices (`aws_subnet.public[0]`), for_each keys (`aws_iam_user.developers["alice"]`), modules (`module.networking.aws_vpc.main`), and nested modules (`module.application.module.database`) is accurate. The `moved` block HCL syntax with `from` and `to` attributes is correct.

## Review Notes
- The `-dry-run` flag is indeed supported by `tofu state mv`, which is a notable difference from older Terraform versions where this flag was not always available — the post correctly attributes this to OpenTofu's `tofu` CLI.
- The recommendation to prefer `moved` blocks over imperative state manipulation in team environments aligns with current OpenTofu/Terraform best practices.
- The `-state` / `-state-out` flags only work with local backend state files, not remote backends — the post implicitly demonstrates this in its examples but does not call it out explicitly. Not technically incorrect, just a caveat readers may want to be aware of.
- Output text shown in code comments (e.g., "Successfully moved 1 object(s).") matches the typical OpenTofu output format.

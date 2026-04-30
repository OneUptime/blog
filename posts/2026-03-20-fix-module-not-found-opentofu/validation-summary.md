# Validation Summary: How to Fix 'Error: Module Not Found' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Git
- OpenTofu Module Registry
- Shell commands

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Blocks documentation: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu `tofu init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu Version Constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu Module Registry Protocol documentation: https://opentofu.org/docs/v1.8/internals/module-registry-protocol/
- Git `git ls-remote` documentation: https://git-scm.com/docs/git-ls-remote
- OpenTofu public registry versions endpoint for `terraform-aws-modules/vpc/aws`: https://registry.opentofu.org/v1/modules/terraform-aws-modules/vpc/aws/versions

## Issues Found
- The `tofu init -upgrade` example implied that `-upgrade` is the normal follow-up after adding a module source. OpenTofu's docs say you should re-run `tofu init` after adding, removing, or modifying module blocks, and use `-upgrade` only when you want already-installed modules updated. I corrected the command comments to match that behavior.
- The local-path explanation said paths are relative to the module file containing `source`, which is imprecise. OpenTofu evaluates module source paths relative to the calling module, so I changed the wording to say the path is relative to the module where the `module` block is declared.
- The local-directory verification note said the directory should contain `main.tf`, `variables.tf`, and `outputs.tf`. Those filenames are conventional but not required, so I changed the note to say the directory should contain the module's `.tf` or `.tofu` files.
- The private Git repository example used a GitHub-specific `oauth2:` URL rewrite that is not the general Git/OpenTofu recommendation and is not a correct universal GitHub pattern. OpenTofu's docs say Git sources use normal Git authentication, and SSH keys are a common option, so I replaced that snippet with an SSH-based connectivity check using `git ls-remote` before `tofu init`.

## Review Notes
- The registry source example `terraform-aws-modules/vpc/aws` and the registry API check were validated against the public OpenTofu registry.
- `tofu` is not installed in this workspace, so CLI behavior was verified against the official OpenTofu documentation rather than local command output.

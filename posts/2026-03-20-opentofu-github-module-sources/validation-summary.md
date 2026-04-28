# Validation Summary: How to Use GitHub Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (module sources)
- HCL (HashiCorp Configuration Language)
- Git / GitHub (HTTPS and SSH access)
- Git config (`url.<base>.insteadOf`)
- ssh-keygen / SSH config

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Generic Git Repository syntax (within above doc)
- General knowledge of GitHub deploy keys and `git config insteadOf` patterns

## Issues Found
No technical issues found.

Verified specifics:
- The `github.com/<owner>/<repo>` shorthand is officially supported and is auto-detected as a Git source.
- Subdirectory selector `//<path>` is correct, and the post correctly places `?ref=` after the subdirectory portion (e.g., `github.com/myorg/aws-modules//security-groups?ref=v1.5.0`).
- The equivalence claim between `github.com/myorg/my-module?ref=v1.0.0` and `git::https://github.com/myorg/my-module.git?ref=v1.0.0` is accurate per the OpenTofu docs ("treated as convenient aliases for the general Git repository address scheme").
- The `git config --global url."https://${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"` pattern for HTTPS token auth is valid and commonly recommended.
- The `ssh-keygen -t ed25519 -C "deploy-key" -f ~/.ssh/deploy_key` command is syntactically correct.
- The SSH `config` block (`Host github.com` / `IdentityFile` / `User git`) is valid SSH client configuration.
- `tofu init` is the correct OpenTofu CLI command.

## Review Notes
- One nuance worth flagging for future revisions: the `github.com/...` shorthand resolves to **HTTPS** by default. To force the deploy-key (SSH) path shown in the SSH section to be used with the shorthand source, readers typically also need a `git config --global url."git@github.com:".insteadOf "https://github.com/"` redirect, or to use the explicit SSH source form `git@github.com:owner/repo.git`. The post does not call this out, but the SSH key generation steps themselves are not incorrect — they just may not take effect for shorthand sources without an additional `insteadOf` line.
- The example `github.com/terraform-aws-modules/terraform-aws-vpc?ref=v5.0.0` references a real, well-maintained community module and a valid release tag.
- No version-specific caveats; the shorthand syntax is stable across current OpenTofu versions.

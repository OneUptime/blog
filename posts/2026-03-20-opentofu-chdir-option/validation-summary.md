# Validation Summary: How to Use the -chdir Global Option in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu CLI (`tofu`)
- Terraform (cross-compatibility)
- Bash scripting
- GitHub Actions (CI/CD example)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- Terraform CLI commands documentation: https://developer.hashicorp.com/terraform/cli/commands
- OpenTofu `init` documentation (for `-backend-config` flag verification)

## Issues Found
No technical issues found.

All major claims were verified:
- `-chdir` is a global option that must be placed before the subcommand — confirmed.
- `-chdir` changes OpenTofu's working directory without affecting the shell's working directory — confirmed.
- Paths passed to `-var-file` are resolved relative to the `-chdir` directory — confirmed.
- `-backend-config=path/to/file.hcl` is a valid flag for `tofu init` — confirmed.
- The bash script, monorepo example, and CI/CD usage are syntactically correct and reflect real-world patterns.
- The comparison with `cd` accurately describes the behavioral difference.

## Review Notes
- One nuance not covered by the post (but not incorrect): the `path.cwd` HCL value returns the *original* working directory at process start, not the `-chdir` directory. Authors targeting the module directory typically should prefer `path.root`. This is outside the scope of this post but worth being aware of in follow-up content.
- The `.hcl` extension shown for backend config files is valid; OpenTofu recommends `.tfbackend` but does not require it.
- The post's claim that `tofu plan -chdir=production` "will fail" is correct in practice — the option is parsed by the global parser before subcommand dispatch, so placing it after the subcommand is not honored.

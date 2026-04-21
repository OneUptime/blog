# Validation Summary: How to Use tofu fmt in Pre-Commit Hooks

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTofu CLI (`tofu fmt`)
- OpenTofu HCL configuration files
- pre-commit hooks
- antonbabenko/pre-commit-terraform
- GitHub Actions
- EditorConfig

## Sources Consulted
- OpenTofu `fmt` command documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `fmt` command source: https://github.com/opentofu/opentofu/blob/main/internal/command/fmt.go
- pre-commit documentation: https://pre-commit.com/
- pre-commit latest release metadata: https://api.github.com/repos/pre-commit/pre-commit/releases/latest
- pre-commit-terraform README and hook manifest: https://github.com/antonbabenko/pre-commit-terraform
- pre-commit-terraform latest release metadata: https://api.github.com/repos/antonbabenko/pre-commit-terraform/releases/latest
- opentofu/setup-opentofu README and releases: https://github.com/opentofu/setup-opentofu
- actions/checkout releases: https://github.com/actions/checkout/releases
- EditorConfig documentation: https://editorconfig.org/

## Issues Found
- The post described `tofu fmt -diff` as a dry run, but OpenTofu only says `-diff` displays diffs; writes are disabled by `-write=false`, `-check`, or stdin. Updated the dry-run examples to use `-diff -write=false`.
- The post gave exact `tofu fmt -check` exit codes as `0`, `1`, and `2`. Official docs only guarantee `0` for formatted input and non-zero otherwise, and current OpenTofu source returns `3` for formatting differences in check mode. Reworded the exit-code note to the documented behavior.
- The post and custom hooks only targeted `.tf` files. Current OpenTofu `fmt` processes `.tf`, `.tofu`, `.tfvars`, `.tftest.hcl`, and `.tofutest.hcl`. Updated the file comments, hook filters, staging commands, and team-adoption commands to cover the supported native-syntax file types.
- The `pre-commit-terraform` example claimed to use OpenTofu but did not set the documented `--hook-config=--tf-path=tofu`; with both binaries installed, the hook would prefer `terraform`. Added the OpenTofu binary override and updated the pinned hook revision to the latest verified release, `v1.105.0`.
- The custom hooks used `language: system`, which current pre-commit documentation identifies as the old name for `language: unsupported`. Updated both custom hook examples to the current language name.
- The auto-fix hook staged only `*.tf` files and used a filename-unsafe `xargs git add` pipeline. Replaced it with a NUL-delimited loop that stages the OpenTofu file types handled by `tofu fmt`.
- The GitHub Actions example used older major versions for `actions/checkout` and `opentofu/setup-opentofu`. Updated them to the current documented major versions, `actions/checkout@v6` and `opentofu/setup-opentofu@v2`.

## Review Notes
- The local environment did not have `tofu` or `pre-commit` installed, so CLI behavior was verified against official documentation, current upstream source, and upstream repository metadata.
- `opentofu/setup-opentofu@v1` still exists, but upstream examples now use `@v2`.
- The `terraform_fmt` hook id is still correct in the `pre-commit-terraform` example; the OpenTofu behavior comes from the `--hook-config=--tf-path=tofu` override.

# Validation Summary: How to Check Which OpenTofu Version You Are Running - Which Running

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- `tofuenv`
- `asdf`
- Bash shell scripting

## Sources Consulted
- OpenTofu CLI `version` docs (current line): https://opentofu.org/docs/v1.9/cli/commands/version/
- OpenTofu CLI `version` docs for 1.6.x, used to verify `-json` existed before 1.7: https://opentofu.org/docs/v1.6/cli/commands/version/
- `tofuenv` upstream README: https://github.com/tofuutils/tofuenv
- `tofuenv` version-file resolution source: https://github.com/tofuutils/tofuenv/blob/main/lib/tofuenv-version-file.sh
- `tofuenv` version-name resolution source: https://github.com/tofuutils/tofuenv/blob/main/lib/tofuenv-version-name.sh
- `tofuenv` list output source: https://github.com/tofuutils/tofuenv/blob/main/libexec/tofuenv-list
- `tofuenv` install path source: https://github.com/tofuutils/tofuenv/blob/main/libexec/tofuenv-install
- `asdf` getting started docs: https://asdf-vm.com/guide/getting-started.html
- `asdf` versions docs: https://asdf-vm.com/manage/versions.html
- `asdf` plugin shortname index, used to verify `opentofu` is a valid plugin name: https://github.com/asdf-vm/asdf-plugins

## Issues Found
- The post said `tofu version -json` required OpenTofu 1.7+, but OpenTofu 1.6 documentation already includes the `-json` flag. I removed the incorrect version gate.
- The sample JSON included `terraform_outdated`, but OpenTofu documents `tofu version -json` as omitting upgrade and security information and shows only `terraform_version`, `platform`, and `provider_selections`. I removed the unsupported field from the example.
- The `tofuenv` path examples were incorrect. Upstream `tofuenv` puts the wrapper on `PATH` at `~/.tofuenv/bin/tofu` and installs the selected binary at `~/.tofuenv/versions/<version>/tofu`, not under `shims` or `.../bin/tofu`. I corrected both example paths.
- The `tofuenv version-name` comment incorrectly implied it shows the controlling file, and the resolution order omitted `~/.opentofu-version`. Upstream `tofuenv` resolves from `TOFUENV_TOFU_VERSION`, then `.opentofu-version`, then falls back to home/default files. I corrected the explanation and added the missing checks.
- The `readlink -f` example was written as though it were universal, but that flag is Linux-specific. I scoped the wording accordingly.

## Review Notes
- The sample versions such as `1.9.0` are acceptable illustrative examples, but they should not be read as the latest available OpenTofu release as of May 6, 2026.

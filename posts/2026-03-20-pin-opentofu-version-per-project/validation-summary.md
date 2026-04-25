# Validation Summary: How to Pin an OpenTofu Version Per Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language (HCL)
- `tofuenv`
- `asdf`
- Docker
- GitHub Actions

## Sources Consulted
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- OpenTofu version constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI `version` command documentation: https://opentofu.org/docs/v1.8/cli/commands/version/
- OpenTofu v1.9.0 release page: https://github.com/opentofu/opentofu/releases/tag/v1.9.0
- `tofuenv` repository documentation: https://github.com/tofuutils/tofuenv
- `asdf` versions documentation: https://asdf-vm.com/manage/versions.html
- `asdf` upgrade guide for v0.16+: https://asdf-vm.com/guide/upgrading-to-v0-16.html
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` README: https://github.com/actions/checkout

## Issues Found
- The `asdf` example used `asdf local opentofu 1.9.0`, which is outdated for current `asdf` releases. I changed it to `asdf set opentofu 1.9.0` because `asdf local` was removed in `asdf` v0.16+.
- The sample `required_version` error text did not match actual OpenTofu behavior. I replaced it with an accurate error excerpt that reflects how OpenTofu reports an unsupported core version.
- The CI example used `opentofu/setup-opentofu@v1`, while the current official action documentation uses `@v2`. I updated the workflow example to `@v2`.

## Review Notes
- OpenTofu `1.9.0` is a valid release and the release asset URL pattern shown in the Docker example is correct.
- As of 2026-04-25, OpenTofu `1.9.0` is not the latest release series, but that does not make the post incorrect because the article is specifically about pinning a chosen project version.

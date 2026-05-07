# Validation Summary: How to Use asdf to Manage Multiple OpenTofu Versions

## Status
validated

## Post Type
Guide

## Technologies Covered
- `asdf`
- OpenTofu
- Shell
- GitHub Actions
- `.tool-versions`

## Sources Consulted
- asdf Getting Started: https://asdf-vm.com/guide/getting-started.html
- asdf Versions reference: https://asdf-vm.com/manage/versions.html
- asdf Upgrading to 0.16.0: https://asdf-vm.com/guide/upgrading-to-v0-16.html
- asdf GitHub Actions README: https://github.com/asdf-vm/actions
- asdf plugin shortname index: https://github.com/asdf-vm/asdf-plugins
- `virtualroot/asdf-opentofu` README: https://raw.githubusercontent.com/virtualroot/asdf-opentofu/main/README.md
- OpenTofu release `v1.7.3`: https://github.com/opentofu/opentofu/releases/tag/v1.7.3
- OpenTofu release `v1.8.5`: https://github.com/opentofu/opentofu/releases/tag/v1.8.5
- OpenTofu release `v1.9.0`: https://github.com/opentofu/opentofu/releases/tag/v1.9.0
- OpenTofu repository releases overview: https://github.com/opentofu/opentofu

## Issues Found
- The `asdf` installation section used the pre-0.16.0 shell-based install flow and labeled `v0.14.0` as the latest version. I updated it to the current official installation approach using Homebrew and the required shims-path configuration.
- The post used `asdf list-all`, which was removed in `asdf` 0.16.0. I changed it to `asdf list all`.
- The post used `asdf global` and `asdf local`, which were removed in `asdf` 0.16.0. I changed them to `asdf set -u` and `asdf set`.
- The sample output for `asdf list opentofu` showed `*latest -> 1.9.0`, which is not how current `asdf list` output works and was outdated relative to current OpenTofu releases. I replaced it with concrete installed versions.
- The CI example referenced `asdf-vm/actions/setup@v3`. I updated it to `asdf-vm/actions/setup@v4`, which is the current major version documented by the action repository.

## Review Notes
- The example OpenTofu versions `1.7.3`, `1.8.5`, and `1.9.0` are valid historical releases, but they are not current releases as of May 7, 2026.
- The `asdf install opentofu latest` example is technically correct, but any output showing the resolved version will age as new OpenTofu releases are published.

# Validation Summary: How to Install OpenTofu on Fedora

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Fedora Linux
- DNF/YUM
- RPM packages
- Bash
- HCL

## Sources Consulted
- OpenTofu installation overview: https://opentofu.org/docs/intro/install/
- OpenTofu RPM-based installation docs: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu standalone installation docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu CLI docs for shell autocompletion: https://opentofu.org/docs/cli/commands/
- Official OpenTofu releases: https://github.com/opentofu/opentofu/releases
- OpenTofu Registry API for the `hashicorp/local` provider: https://registry.opentofu.org/v1/providers/hashicorp/local/versions
- Fedora package metadata for `opentofu`: https://packages.fedoraproject.org/pkgs/opentofu/opentofu/

## Issues Found
- The `dnf config-manager --add-repo https://packages.opentofu.org/opentofu/tofu/config_file.repo?type=rpm-md` command pointed to a URL that now returns `404`. I removed that command and kept the manual repository file method that matches the current official RPM installation docs.
- The repository file content did not match the current official RPM documentation for YUM/DNF systems. I changed `repo_gpgcheck=1` to `repo_gpgcheck=0` and added the missing `[opentofu-source]` repository block so the example aligns with the official repo configuration.
- The direct RPM download filename was incorrect. GitHub releases publish the RPM as `tofu_<version>_amd64.rpm`, not `tofu_<version>_linux_amd64.rpm`, so I corrected the download and install commands.
- The pinned version `1.9.0` was outdated as of 2026-04-30. I updated the version examples and verification output to `1.11.6`, which is the latest official release at review time.
- The shell autocompletion section implied separate hardcoded Bash and Zsh reload commands. I simplified it to the current official guidance: run `tofu -install-autocomplete` for the current shell and then restart the shell or re-read the updated profile script.
- The prerequisite `Fedora 38 or later` referenced an old release line that is no longer appropriate in current docs. I changed it to `A supported Fedora release`.
- The conclusion referred to an `official DNF repository`, while the article’s actual method uses OpenTofu’s official RPM repository consumed by DNF/YUM. I corrected that wording.

## Review Notes
- Fedora also publishes an `opentofu` package in the Fedora repositories, documented by OpenTofu at `dnf install opentofu`. This post remains valid because it explicitly documents the separate official OpenTofu RPM repository path instead.
- The quick start HCL example is still valid with current OpenTofu docs: OpenTofu continues to use the `terraform {}` block and standard provider source addresses such as `hashicorp/local`.

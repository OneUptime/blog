# Validation Summary: How to Set a Default OpenTofu Version System-Wide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- tofuenv
- asdf
- Linux package management with apt, dnf, and yum
- Debian/RHEL alternatives management with update-alternatives
- System-wide shell configuration with /etc/profile.d
- System environment configuration with /etc/environment

## Sources Consulted
- OpenTofu installation overview: https://opentofu.org/docs/intro/install/
- OpenTofu standalone binary installation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu `tofu version` command reference: https://opentofu.org/docs/cli/commands/version/
- OpenTofu 1.9.0 release artifact index: https://get.opentofu.org/tofu/1.9.0/
- OpenTofu Debian package installation: https://opentofu.org/docs/intro/install/deb/
- OpenTofu Fedora package installation: https://opentofu.org/docs/intro/install/fedora/
- OpenTofu RPM package installation: https://opentofu.org/docs/intro/install/rpm/
- tofuenv README and command reference: https://github.com/tofuutils/tofuenv
- asdf versions reference: https://asdf-vm.com/manage/versions.html
- asdf 0.16 upgrade notes: https://asdf-vm.com/guide/upgrading-to-v0-16.html
- asdf plugin shortname repository for the OpenTofu plugin name: https://github.com/asdf-vm/asdf-plugins
- update-alternatives manual reference: https://man7.org/linux/man-pages/man1/update-alternatives.1.html

## Issues Found
- The description and introduction overstated that every process on the machine would use the selected version. System PATH and profile changes apply to users and shell sessions that inherit those settings, so the wording now reflects that.
- The tofuenv `/etc/profile.d` example used `chmod` without `sudo` immediately after creating a root-owned file with `sudo tee`. Updated it to `sudo chmod 755`.
- The package-manager section treated all RPM-based systems the same. Official OpenTofu docs use `dnf install opentofu` for Fedora, while the OpenTofu RPM repository package for RHEL-family systems is `tofu`. The commands and comments now distinguish those cases.
- The package-manager section implied `apt-get install tofu` works before repository setup. The comment now clarifies that the OpenTofu repository must be configured for apt-based systems.
- The asdf example and heading used `global` terminology, while `asdf global` was removed in asdf 0.16. Updated it to `asdf set -u opentofu 1.9.0`, which writes the current user's home `.tool-versions` file.
- The asdf notes referred generically to `/etc/environment` but did not name the environment variable asdf actually reads. Added `ASDF_OPENTOFU_VERSION=1.9.0`.
- The system-wide environment variable example used `OPENTOFU_VERSION`, which is not the tofuenv selector documented by tofuenv. Updated the tofuenv examples to use `TOFUENV_TOFU_VERSION`.
- The verification snippets used unquoted command substitution with `which`. Updated those checks to use `command -v` inside quotes.
- The conclusion implied apt and dnf automatically handle OpenTofu after a plain package-manager command. It now notes that the appropriate package or repository must be configured first.

## Review Notes
- OpenTofu 1.9.0 is a valid released version with Linux and macOS artifacts, but it is not the latest OpenTofu release as of this review. The post uses it as an example version, so no version change was required.
- The standalone binary download command is Linux AMD64-specific. macOS users need the corresponding `darwin_amd64` or `darwin_arm64` artifact.
- The standalone binary example does not verify checksums or signatures. OpenTofu's official standalone installation docs recommend integrity verification for downloaded release artifacts.
- tofuenv remains usable, but its README points users toward `tenv` as a successor version manager.

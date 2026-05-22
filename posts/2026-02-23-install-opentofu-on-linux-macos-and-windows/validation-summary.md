# Validation Summary: How to Install OpenTofu on Linux macOS and Windows

## Status
validated

## Post Type
Installation guide

## Technologies Covered
- OpenTofu CLI
- Terraform-compatible HCL configuration
- Debian/Ubuntu APT repositories
- RHEL/CentOS/AlmaLinux YUM repositories
- Fedora DNF packages
- macOS Homebrew, MacPorts, and standalone installation
- Windows Chocolatey, Scoop, winget, and manual installation
- tofuenv, asdf, and tenv version managers
- Docker/OCI container workflows
- Shell completion for Bash and Zsh

## Sources Consulted
- OpenTofu installation overview: https://opentofu.org/docs/intro/install/
- OpenTofu Debian/Ubuntu installation documentation: https://opentofu.org/docs/intro/install/deb/
- OpenTofu RPM-based Linux installation documentation: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu Fedora installation documentation: https://opentofu.org/docs/intro/install/fedora/
- OpenTofu Homebrew installation documentation: https://opentofu.org/docs/intro/install/homebrew/
- OpenTofu Windows installation documentation: https://opentofu.org/docs/intro/install/windows/
- OpenTofu standalone installation documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu Docker guidance: https://opentofu.org/docs/intro/install/docker/
- OpenTofu CLI version command documentation: https://opentofu.org/docs/cli/commands/version/
- OpenTofu CLI init and plan documentation: https://opentofu.org/docs/cli/commands/init/ and https://opentofu.org/docs/cli/commands/plan/
- OpenTofu language files documentation: https://opentofu.org/docs/language/files/
- Chocolatey OpenTofu package page: https://community.chocolatey.org/packages/opentofu
- MacPorts tenv package page: https://ports.macports.org/port/tenv/
- tenv official documentation: https://tofuutils.github.io/tenv/
- tofuenv repository documentation: https://github.com/tofuutils/tofuenv
- asdf OpenTofu plugin repository: https://github.com/virtualroot/asdf-opentofu
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases

## Issues Found
- Debian/Ubuntu repository setup used only one signing key and omitted the repository key and source-list permissions now shown in official OpenTofu docs. Added the `opentofu-repo.gpg` key, updated the `signed-by` list, included the `deb-src` entry, and added the source-list chmod step.
- The RPM section grouped Fedora with RHEL/CentOS but Fedora's official package is installed with `dnf install opentofu`, while the OpenTofu RPM repository installs package `tofu` for RHEL-like systems. Split Fedora into its own command and narrowed the YUM section to RHEL/CentOS/AlmaLinux.
- The RPM repository file command wrote to `/etc/yum.repos.d` without privilege escalation. Changed it to `sudo tee`.
- The RPM repository snippet omitted the source repository block from official OpenTofu docs. Added the `[opentofu-source]` block.
- Examples pinned OpenTofu `1.8.0`, which is outdated as of the current official docs and release page. Updated examples to `1.12.0`, and updated secondary version-manager examples to `1.11.0`.
- The MacPorts example used `sudo port install opentofu`, but MacPorts currently provides `tenv` rather than an `opentofu` port. Changed the section to install `tenv` via MacPorts and install/use OpenTofu through `tenv`.
- Scoop and winget commands did not match the current official OpenTofu Windows docs. Updated Scoop to `scoop bucket add main` plus `scoop install main/opentofu`, and winget to `winget install --exact --id=OpenTofu.Tofu`.
- The Windows manual PATH example appended `C:\OpenTofu` twice to the persisted user PATH. Changed it to read the existing user PATH before persisting the new entry.
- The asdf plugin command relied on registry lookup. Updated it to include the OpenTofu plugin repository URL for reproducibility.
- The Docker section recommended direct use of `ghcr.io/opentofu/opentofu:latest`, but OpenTofu docs state direct use of official images is no longer supported starting with OpenTofu 1.10. Replaced it with the documented multi-stage image pattern using `ghcr.io/opentofu/opentofu:minimal`.

## Review Notes
The standalone installer verifies downloaded files and requires cosign or GnuPG unless verification is skipped; the post's command remains valid but future improvements could mention that prerequisite explicitly. Chocolatey currently publishes a community OpenTofu package, but it may lag the latest OpenTofu release.

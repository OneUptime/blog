# Validation Summary: How to Install OpenTofu on Debian

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Debian APT package management
- Debian `.deb` packages
- Bash shell completion
- HCL / OpenTofu configuration language

## Sources Consulted
- OpenTofu Debian install docs: https://opentofu.org/docs/intro/install/deb/
- OpenTofu standalone install docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu CLI commands docs: https://opentofu.org/docs/cli/commands/
- OpenTofu language settings docs: https://opentofu.org/docs/language/settings/
- OpenTofu latest release assets: https://github.com/opentofu/opentofu/releases/latest
- `apt-get(8)` local manual page on the review system

## Issues Found
- The direct `.deb` download URL used `tofu_<version>_linux_amd64.deb`, but OpenTofu release assets use `tofu_<version>_amd64.deb`. Updated both the download and `dpkg -i` commands so the method points to a real release asset.
- The post pinned `TOFU_VERSION="1.9.0"` and showed `OpenTofu v1.9.0` in the verification output. Updated those version references to the current latest stable release, `1.11.6`, as of April 30, 2026.
- The update command used `apt-get upgrade tofu`, which in APT performs a system upgrade and treats a package argument as an install request before upgrading. Replaced it with `apt-get install -y --only-upgrade tofu` to accurately upgrade only the OpenTofu package.
- The APT repository setup omitted the final permission step from the official OpenTofu Debian instructions. Added `sudo chmod a+r /etc/apt/sources.list.d/opentofu.list` to match the documented repository setup.
- The removal section only matched the repository-based install path. Made the commands method-accurate by using `rm -f` for optional repository files and adding standalone binary removal for `/usr/local/bin/tofu`.
- The Bash completion comments were more specific than the official docs. Adjusted the wording so it accurately describes shell completion installation for Bash without implying the command always edits a specific file.

## Review Notes
- The HCL example is valid for OpenTofu. In OpenTofu v1.x, the `terraform` block remains the correct block for `required_version`.
- Method 2 works, but the official standalone install docs recommend verifying release checksums and note that packaged installs are easier to keep updated. This is a possible future improvement, not a blocking issue for validation.

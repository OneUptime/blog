# Validation Summary: How to Install OpenTofu on openSUSE

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- openSUSE Leap
- openSUSE Tumbleweed
- Zypper
- RPM packages
- HCL

## Sources Consulted
- OpenTofu installation overview: https://opentofu.org/docs/intro/install/
- OpenTofu RPM-based Linux installation guide: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu standalone installation guide: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu CLI documentation for `tofu -install-autocomplete`: https://opentofu.org/docs/cli/commands/
- OpenTofu latest release artifacts: https://github.com/opentofu/opentofu/releases/tag/v1.11.6
- openSUSE/SUSE `zypper` man page: https://manpages.opensuse.org/Leap-15.6/zypper/zypper.8.en.html

## Issues Found
- The RPM package filename in Method 2 was incorrect. The post used `tofu_${TOFU_VERSION}_linux_amd64.rpm`, but current OpenTofu release artifacts use `tofu_${TOFU_VERSION}_amd64.rpm` for RPM packages. I corrected the download and install commands to use the real artifact name.
- The pinned OpenTofu version in Methods 2 and 3 was outdated. I updated `TOFU_VERSION` from `1.9.0` to `1.11.6`, which is the current latest stable release as of April 30, 2026.
- The manually created zypper repo file was missing current OpenTofu repository settings for metadata signature checking and the secondary GPG key URL. I added `repo_gpgcheck=1` and the `https://packages.opentofu.org/opentofu/tofu/gpgkey` entry to match the current official RPM repository guidance.
- The Step 2 heading said “GPG Key” even though the commands import two keys. I corrected the heading to “GPG Keys.”

## Review Notes
The repository-based installation flow, `tofu -install-autocomplete`, and the sample `test.tf` configuration are technically valid. I also verified the sample configuration locally with OpenTofu v1.11.6 by running `tofu init` and `tofu apply`; it completed successfully and produced the expected output. The hard-coded release version in Methods 2 and 3 is accurate on April 30, 2026, but those examples will need periodic refreshes as new OpenTofu releases are published.

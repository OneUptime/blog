# Validation Summary: How to Install OpenTofu on Rocky Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Rocky Linux 8 and 9
- DNF / YUM package management
- RPM packages
- SELinux
- OpenTofu HCL
- AWS provider and S3 backend configuration

## Sources Consulted
- OpenTofu RPM installation docs: https://opentofu.org/docs/v1.9/intro/install/rpm/
- OpenTofu standalone installation docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- OpenTofu GitHub releases API (`latest`): https://api.github.com/repos/opentofu/opentofu/releases/latest
- OpenTofu GitHub release assets for `v1.11.6`: https://api.github.com/repos/opentofu/opentofu/releases/tags/v1.11.6

## Issues Found
- The Yum/DNF repository stanza used `repo_gpgcheck=1`, but OpenTofu's official RPM instructions for RHEL-like systems use `repo_gpgcheck=0`. I changed it to match the published repository configuration.
- The direct RPM download used the wrong asset name: `tofu_<version>_linux_amd64.rpm` does not exist in OpenTofu releases. I corrected it to `tofu_<version>_amd64.rpm`.
- The RPM install command used `dnf localinstall`, which DNF documents as a deprecated alias. I changed it to `dnf install -y "./tofu_<version>_amd64.rpm"`.
- The hardcoded release version `1.9.0` was outdated at review time. OpenTofu `v1.11.6` was the latest release on `2026-04-30`, published on `2026-04-08`, so I updated the pinned examples accordingly.
- The EPEL/CRB section was misleading for this post because OpenTofu's official RPM and standalone installation flows do not require EPEL on Rocky Linux 8 or 9. I removed that section to avoid unnecessary system changes.

## Review Notes
- The `terraform {}` block syntax is still correct in OpenTofu configurations, including the test and AWS backend examples.
- The `hashicorp/aws` provider source remains valid in OpenTofu.
- The S3 backend example is technically valid with `dynamodb_table`, but current OpenTofu documentation also supports `use_lockfile = true` for native S3 locking. That could be mentioned in a future revision.

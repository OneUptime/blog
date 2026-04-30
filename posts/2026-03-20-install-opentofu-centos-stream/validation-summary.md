# Validation Summary: How to Install OpenTofu on CentOS Stream

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- CentOS Stream
- DNF/YUM
- RPM
- SELinux
- HCL

## Sources Consulted
- OpenTofu RPM installation docs: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu standalone installation docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu `version` command docs: https://opentofu.org/docs/cli/commands/version/
- OpenTofu language settings docs: https://opentofu.org/docs/language/settings/
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- CentOS Stream 9 lifecycle page: https://www.centos.org/stream9/
- CentOS Stream 10 release notes: https://www.centos.org/centos10/
- CentOS page listing CentOS Stream 8 end of builds: https://www.centos.org/centos-linux/

## Issues Found
- The post said it applied to CentOS Stream 8 and 9. CentOS Stream 8 reached end of builds on May 31, 2024, so I updated the post to CentOS Stream 9 and 10.
- The RPM repository snippet used `repo_gpgcheck=1`. OpenTofu's current RPM installation docs use `repo_gpgcheck=0` for Yum/DNF-based systems, so I corrected the repository configuration to match the official instructions.
- The direct RPM download example used `tofu_${TOFU_VERSION}_linux_amd64.rpm`, but OpenTofu release assets use the `tofu_<version>_amd64.rpm` naming pattern. I corrected the filename and updated the install command to install the local RPM with `dnf install`.
- The manual download examples pinned `TOFU_VERSION` to `1.9.0`, which was outdated as of April 30, 2026. I updated the pinned version to `1.11.6`, the latest release available at validation time.

## Review Notes
- The official RPM repository method is the most maintainable option because it receives updates through the standard package manager workflow.
- The GitHub release download methods are valid, but the pinned version numbers will become outdated over time and should be rechecked periodically.

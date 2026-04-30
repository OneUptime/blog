# Validation Summary: How to Install OpenTofu on AlmaLinux

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AlmaLinux
- DNF/YUM RPM repositories
- RPM package installation
- Bash shell completion
- AWS EC2
- HCL

## Sources Consulted
- OpenTofu RPM installation docs: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu CLI commands docs (`-install-autocomplete`): https://opentofu.org/docs/cli/commands/
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases
- OpenTofu latest release metadata: https://api.github.com/repos/opentofu/opentofu/releases/latest
- AlmaLinux AWS AMI documentation: https://wiki.almalinux.org/cloud/AWS
- AWS provider `aws_ami` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS EC2 `DescribeImages` API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeImages.html

## Issues Found
- The repository configuration used `repo_gpgcheck=1`, but OpenTofu's official RHEL/AlmaLinux RPM repository instructions use `repo_gpgcheck=0`. I changed the value to match the published repo configuration.
- The direct RPM download URL used `tofu_${TOFU_VERSION}_linux_amd64.rpm`, which is not a published release asset. I changed it to `tofu_${TOFU_VERSION}_amd64.rpm`, which matches the official GitHub release artifacts.
- The post pinned install and verification examples to `1.9.0`, which was outdated as of the review date. I updated the version references to `1.11.6`, the latest release published on 2026-04-08.
- The shell completion reload step sourced `/etc/profile.d/bash_completion.sh`, which does not reload the user shell profile that `tofu -install-autocomplete` modifies. I changed it to `source ~/.bashrc` so the completion hook is actually loaded for Bash.
- The AWS AMI example filtered only by owner and name while launching a `t3.micro` instance. AlmaLinux publishes both `x86_64` and `aarch64` AMIs, so I added an `architecture = x86_64` filter to keep the example aligned with the instance type.

## Review Notes
The direct-download methods are technically correct after the fixes, but a future revision could improve supply-chain hygiene by showing checksum or signature verification using the release `SHA256SUMS` and signature files.

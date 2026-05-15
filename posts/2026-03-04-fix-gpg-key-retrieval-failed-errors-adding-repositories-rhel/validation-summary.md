# Validation Summary: How to Fix 'GPG Key Retrieval Failed' Errors When Adding Repositories on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF repository configuration
- RPM package signature keys
- GPG/OpenPGP public keys
- `/etc/yum.repos.d/*.repo` files

## Sources Consulted
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Red Hat Developer, "What's inside an RPM .repo file?": https://developers.redhat.com/articles/2022/10/07/whats-inside-rpm-repo-file
- RPMKEYS manual: https://rpm.org/docs/4.19.x/man/rpmkeys.8.html
- Red Hat Enterprise Linux documentation, "Configuring DNF": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/configuring-dnf

## Issues Found
- The opening explanation said the error happens when repository metadata is signed with a missing or unavailable GPG key. That is only true when `repo_gpgcheck=1` is enabled. DNF's `gpgcheck` setting verifies package signatures, while `repo_gpgcheck` verifies repository metadata signatures and stores those keys separately. I updated the sentence to distinguish package signature verification from repository metadata verification.

## Review Notes
The commands and configuration examples are technically valid for DNF/RPM-based RHEL systems. The `--nogpgcheck` workaround is correctly framed as temporary and risky because it skips package signature checks when RPM policy allows it. The example `https://example.com/RPM-GPG-KEY-example` is a placeholder URL, not a real repository key endpoint.

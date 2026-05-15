# Validation Summary: How to Fix 'GPG Check Failed' When Installing RPM Packages on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- RPM package manager
- DNF package manager
- GPG package signatures
- YUM/DNF repository configuration
- EPEL repository keys

## Sources Consulted
- RPM upstream rpmkeys manual: https://rpm.org/docs/4.20.x/man/rpmkeys.8
- RPM upstream rpm manual: https://rpm.org/docs/4.20.x/man/rpm.8
- RPM upstream rpmdb manual: https://rpm.org/docs/4.20.x/man/rpmdb.8.html
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF configuration reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- Red Hat Ansible Automation Platform RPM installation documentation, local repository example using gpgcheck and gpgkey: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/html-single/rpm_installation/rpm_installation
- Fedora EPEL FAQ, package signing and epel-release key behavior: https://fedoraproject.org/wiki/EPEL/FAQ
- Fedora EPEL 9 GPG key URL checked directly: https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9

## Issues Found
- The opening explanation said "GPG check FAILED" means the package signature does not match any trusted key. That was too narrow: the failure can be caused by a missing untrusted key, a bad signature, or failed digest verification. Updated the sentence to describe both missing trusted-key verification and signature/digest failure.

## Review Notes
- The local review environment did not have `rpm` or `dnf` installed, so command validation was performed against upstream RPM/DNF manuals and Red Hat/Fedora documentation.
- The `rpm --import`, `rpm --checksig`, `rpm -Kv`, `rpm --rebuilddb`, `dnf clean packages`, `dnf install --nogpgcheck`, and `rpm -ivh --nosignature` examples are technically valid.
- For EPEL, installing the `epel-release` package is often preferred because it installs repository configuration and keys together, but the direct EPEL 9 key URL used in the post is valid.

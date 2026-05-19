# Validation Summary: How to Install and Enable SELinux on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 LTS and 24.04 LTS
- SELinux
- AppArmor
- auditd and Linux audit utilities
- GRUB kernel command-line configuration
- SELinux policy management tools

## Sources Consulted
- Ubuntu Security Documentation: privilege restriction and SELinux support: https://documentation.ubuntu.com/security/security-features/privilege-restriction/
- Ubuntu Security Documentation: overview of security features: https://documentation.ubuntu.com/security/security-features/security-features-overview/
- Ubuntu Server Documentation: AppArmor disabling/re-enabling guidance: https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu package metadata for policycoreutils-python-utils: https://packages.ubuntu.com/noble/policycoreutils-python-utils
- Ubuntu manpage for SELinux config: https://manpages.ubuntu.com/manpages/noble/man5/selinux_config.5.html
- Ubuntu manpage for setenforce: https://manpages.ubuntu.com/manpages/noble/man8/setenforce.8.html
- Ubuntu manpage for semanage port: https://manpages.ubuntu.com/manpages/noble/man8/semanage-port.8.html
- Ubuntu manpage for semodule: https://manpages.ubuntu.com/manpages/noble/man8/semodule.8.html
- Ubuntu manpage for restorecon: https://manpages.ubuntu.com/manpages/noble/man8/restorecon.8.html
- Local Ubuntu 24.04 package metadata and package scripts for selinux-basics, policycoreutils, selinux-policy-default, policycoreutils-python-utils, auditd, and apparmor.

## Issues Found
- The post said Ubuntu provides SELinux packages in the main repository. Ubuntu documents SELinux userspace packages and policies as available through the universe repository, so this was changed to "universe repository."
- The AppArmor disable step was incomplete for Ubuntu 24.04 and later. Ubuntu documentation says fully disabling AppArmor now requires adding `apparmor=0` to the kernel command line and running `update-grub`, so those commands were added.
- The package list omitted `policycoreutils-python-utils`, even though later commands use `audit2why`, `audit2allow`, and `semanage`, which are provided by that package. The package was added explicitly.
- The post said `selinux-activate` should leave both `security=selinux` and `selinux=1` in `/etc/default/grub`. The Ubuntu `selinux-activate` script removes any existing `selinux=1` entry and adds `security=selinux`, so the expected verification comment was corrected.
- The sample `/etc/selinux/config` comment described `SELINUXTYPE=default` as equivalent to targeted policy. Ubuntu's generated config describes it as equivalent to the old strict and targeted policies, so that comment was corrected.

## Review Notes
- The remaining command examples match Ubuntu package manpages or local command/package metadata for the covered versions.
- SELinux status output, kernel policy version, and policy details can vary by Ubuntu point release, kernel, and installed SELinux package versions; the sample output should be read as representative rather than byte-for-byte guaranteed.

# Validation Summary: How to Configure Sudo Access on RHEL Using the Wheel Group

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sudo and sudoers
- wheel group administration
- Linux user and group management commands
- PAM and pam_wheel
- Linux Audit system

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Managing users and groups": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- sudo(8), sudoers(5), and visudo(8) local man pages
- usermod(8), useradd(8), gpasswd(1), and pam_wheel(8) local man pages
- Red Hat Enterprise Linux 9 STIG / OpenSCAP guidance for restricting su with pam_wheel: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cui.html

## Issues Found
- The sudo flow diagram showed PAM authentication before the sudoers policy authorization step. The sudo documentation describes the security policy as determining whether the user has privileges and whether authentication is required, so I updated the diagram to show the sudoers policy matching the `%wheel` rule before PAM authentication if required.
- The "Listing Current Wheel Members" examples described `getent group wheel` as showing all wheel members. That command shows the wheel group database entry and its listed supplementary members; it does not necessarily include accounts whose primary group is wheel. I updated the comments to say "supplementary members" for technical accuracy.

## Review Notes
- The sudoers examples are syntactically valid, including `%wheel ALL=(ALL) ALL`, `%wheel ALL=(ALL) NOPASSWD: ALL`, and the command-restricted examples.
- The sudoers.d file names used in the post do not contain dots or end in `~`, which is important because sudo skips such files when processing an included directory.
- The auditctl examples are valid transient audit rules. For persistent auditing, future revisions could mention placing equivalent rules in `/etc/audit/rules.d/`.

# Validation Summary: How to Practice SELinux Configuration Tasks for the RHCSA Exam

## Status
validated

## Post Type
Tutorial / certification practice guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHCSA / EX200 exam objectives
- SELinux modes
- SELinux file contexts
- SELinux booleans
- SELinux audit logs and troubleshooting tools

## Sources Consulted
- Red Hat Certified System Administrator exam objectives: https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam
- Red Hat Enterprise Linux 8, Using SELinux, changing SELinux states and modes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 8, Using SELinux, configuring applications and services with non-standard configurations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 8, Troubleshooting problems related to SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- Red Hat Enterprise Linux 7, SELinux contexts and labeling files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files

## Issues Found
- The post stated that "SELinux is always tested on the RHCSA exam." Red Hat's current EX200 objectives list specific SELinux tasks under "Manage security," but exam coverage can change. Changed this to "SELinux is part of the RHCSA exam objectives."
- The troubleshooting tools install command only installed `setroubleshoot-server`. Red Hat's SELinux troubleshooting documentation lists both `policycoreutils-python-utils` and `setroubleshoot-server` as prerequisites for denial analysis with `sealert`. Added `policycoreutils-python-utils`.
- The `ausearch` example searched only for `avc`. Red Hat's documented example searches for `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR` with `-ts recent`. Updated the command to match the documented message types and option form.

## Review Notes
The remaining commands and explanations are consistent with Red Hat guidance: `setenforce` changes do not persist across reboot, `getenforce` reports `Enforcing`, `Permissive`, or `Disabled`, `semanage fcontext` records persistent file-context mappings, `restorecon` applies those mappings, `chcon` changes do not survive relabeling or `restorecon`, and `setsebool -P` makes boolean changes persistent.

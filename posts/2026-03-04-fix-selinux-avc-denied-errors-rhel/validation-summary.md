# Validation Summary: How to Fix SELinux 'avc: denied' Errors on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- Linux Audit
- setroubleshoot
- SELinux policy modules
- Apache HTTP Server SELinux policy examples

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Troubleshooting problems related to SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/troubleshooting-problems-related-to-selinux
- Red Hat Enterprise Linux 8 documentation: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 7 documentation: SELinux contexts and file labeling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Red Hat Enterprise Linux 7 documentation: Apache HTTP Server SELinux booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- Linux audit userspace ausearch(8) manual page: https://www.man7.org/linux/man-pages/man8/ausearch.8.html
- SELinux semodule(8) manual page: https://man7.org/linux/man-pages/man8/semodule.8.html

## Issues Found
- The `ausearch` examples searched only `avc`. Red Hat's current SELinux troubleshooting guidance searches `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR`, so the examples were updated to include the full SELinux denial/error message set.
- The verification section described `semodule -B` as clearing the AVC cache. The `semodule(8)` manual documents `-B` as rebuilding policy and reloading it unless `-n` is used, so the comment was changed to describe rebuilding and reloading the SELinux policy store after module changes.

## Review Notes
The remaining examples are technically correct for RHEL-style SELinux troubleshooting. In future revisions, the post could mention `semanage boolean -l` from `selinux-policy-devel` for descriptions of booleans, and could note that `semanage` and `audit2allow` may require packages such as `policycoreutils-python-utils` depending on the RHEL version and installation profile.

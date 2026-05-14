# Validation Summary: How to Troubleshoot Apache 403 Forbidden Errors and SELinux on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4
- SELinux
- Linux file permissions
- Linux audit tools

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9, configuring SELinux for applications and services with non-standard configurations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/configuring-selinux-for-applications-and-services-with-non-standard-configurations_using-selinux
- Red Hat SELinux User's and Administrator's Guide, maintaining SELinux labels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-maintaining_selinux_labels_
- Apache HTTP Server 2.4 access control documentation: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server 2.4 mod_authz_core documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server 2.4 mod_dir documentation: https://httpd.apache.org/docs/2.4/mod/mod_dir.html
- Linux audit ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The home-directory SELinux gotcha said that files copied from a home directory often carry the wrong SELinux label. Plain `cp` normally creates a destination file using the target directory's default label unless context preservation is requested, while moved files keep their existing context. Updated the text and commands to use `mv` and `cp --preserve=context`, then adjusted the `restorecon` advice to match.

## Review Notes
The `semanage` examples are correct for RHEL 9, but systems may need the `policycoreutils-python-utils` package installed before `semanage` is available. The `setsebool -P` example is correct and persistent, but it can take time because it updates policy state.

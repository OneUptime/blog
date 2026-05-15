# Validation Summary: How to Fix 'Permission Denied' Errors Caused by SELinux on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- Linux Audit
- SELinux policy management tools
- Apache HTTP Server SELinux labels and booleans

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- Red Hat Enterprise Linux 9 Using SELinux single-page documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- Local command availability checks for `ausearch`, `audit2why`, `audit2allow`, `semanage`, `restorecon`, `setsebool`, `getsebool`, `sealert`, `getenforce`, and `setenforce`

## Issues Found
- The post used TCP port 8443 as the non-standard HTTP port example. RHEL 9 documentation lists 8443 as already included in the `http_port_t` port type, so `semanage port -a -t http_port_t -p tcp 8443` would not demonstrate adding a new non-standard port and may fail because the port is already defined. Changed the example to TCP port 3131, matching Red Hat's RHEL 9 SELinux troubleshooting example.
- The post used `audit2why`, `audit2allow`, and `semanage` without ensuring the RHEL 9 package that provides them is installed. Added `sudo dnf install -y policycoreutils-python-utils` before the audit analysis commands.

## Review Notes
The remaining commands and guidance align with Red Hat's RHEL 9 SELinux troubleshooting workflow: check enforcing mode, query AVC denials with `ausearch`, use `sealert`, prefer labels, booleans, and port mappings before generating a local policy module, and avoid disabling SELinux as a fix.

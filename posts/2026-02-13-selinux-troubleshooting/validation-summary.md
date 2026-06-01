# Validation Summary: How to Troubleshoot SELinux Permission Denials

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- SELinux
- Linux audit logs and AVC denials
- `setenforce`, `getenforce`, `ausearch`, `sealert`, `restorecon`, `semanage`, `getsebool`, `setsebool`, `audit2allow`, `audit2why`, `semodule`, and `matchpathcon`
- Apache HTTP Server SELinux policy examples

## Sources Consulted
- Red Hat Enterprise Linux 8 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index
- Red Hat Enterprise Linux 10 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/using_selinux/index
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Maintaining SELinux Labels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-maintaining_selinux_labels_
- Linux man-pages, `setenforce(8)`: https://www.man7.org/linux/man-pages/man8/setenforce.8.html
- Linux man-pages, `audit2allow(1)`: https://man7.org/linux/man-pages/man1/audit2allow.1.html
- Linux man-pages, `semanage-permissive(8)`: https://man7.org/linux/man-pages/man8/semanage-permissive.8.html

## Issues Found
- The post used `httpd_read_user_content` for "Allow httpd to read user home directories." Updated it to `httpd_enable_homedirs`, which is the documented boolean for home-directory access in Red Hat SELinux policy documentation.
- The port-label example used TCP port `8443`, but current Red Hat documentation lists `8443` as already included in `http_port_t`. Updated the example to use TCP port `9876`, matching the documented non-standard-port scenario.
- The copy-versus-move guidance stated that `cp` always inherits the destination label. Updated it to clarify that normal `cp` creates a new file labeled by destination defaults, while context-preserving copy options and `mv` can preserve the original label.

## Review Notes
The remaining commands and explanations matched the consulted documentation. Package availability can vary by distribution; on RHEL-family systems, some tools used later in the guide are provided by `policycoreutils-python-utils`, while `sealert` is provided by `setroubleshoot-server`.

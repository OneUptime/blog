# Validation Summary: How to Fix 'Permission Denied' Errors Caused by SELinux on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- Linux audit logs and AVC denials
- SELinux tools: getenforce, setenforce, ausearch, sealert, semanage, restorecon, getsebool, setsebool, audit2allow, semodule
- Apache HTTP Server SELinux policy examples

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Troubleshooting problems related to SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- Red Hat Enterprise Linux 9 documentation: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Customer Portal: Basic SELinux Troubleshooting in CLI: https://access.redhat.com/articles/2191331
- Red Hat Enterprise Linux 10 documentation: Getting started with SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/getting-started-with-selinux
- httpd_selinux(8) and related SELinux policy man-page references for Apache booleans.

## Issues Found
- The non-standard port example used TCP port 8443 with `semanage port -a -t http_port_t -p tcp 8443`. Red Hat's SELinux documentation lists 8443 as already assigned to `http_port_t` on RHEL, so adding it as a new custom port would fail. Changed the example to TCP port 9876, matching Red Hat's documented non-standard HTTP port example.

## Review Notes
The remaining commands and explanations match the documented RHEL SELinux troubleshooting workflow: temporarily testing permissive mode with `setenforce`, searching AVC denials with `ausearch`, using `sealert`, correcting persistent file contexts with `semanage fcontext` plus `restorecon`, enabling relevant booleans with `setsebool -P`, and treating `audit2allow` policy modules as a last resort after review.

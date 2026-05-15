# Validation Summary: How to Fix SELinux Preventing Apache Custom Directory on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- Apache HTTP Server / httpd
- semanage fcontext
- restorecon
- ausearch
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Apache HTTP Server types: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-types
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Apache configuration examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-configuration_examples
- Red Hat Enterprise Linux 8 Using SELinux, non-standard application configurations and labeling problems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index
- Red Hat Enterprise Linux 10 Using SELinux, changing Apache content directory labels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/pdf/using_selinux/Red_Hat_Enterprise_Linux-10-Using_SELinux-en-US.pdf
- Apache HTTP Server 2.4 Access Control documentation: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server 2.4 mod_authz_core documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- semanage-fcontext(8) manual page: https://www.man7.org/linux/man-pages/man8/semanage-fcontext.8.html
- ausearch(8) manual page: https://manpages.ubuntu.com/manpages/trusty/en/man8/ausearch.8.html

## Issues Found
- The CGI section said CGI scripts need the `httpd_sys_script_exec_t` context, but did not mention that RHEL SELinux policy also requires the `httpd_enable_cgi` boolean. Added `sudo setsebool -P httpd_enable_cgi on` because Red Hat documents both the script label and the boolean as required for CGI execution.

## Review Notes
The main static-content workflow is correct: use a persistent `semanage fcontext` rule for the custom document root and apply it with `restorecon`. The Apache 2.4 `Require all granted` directive is current. The post does not cover other SELinux cases such as non-default HTTP ports, NFS/CIFS-backed content, or missing Unix file permissions, but those are outside the scope of this specific labeling fix.

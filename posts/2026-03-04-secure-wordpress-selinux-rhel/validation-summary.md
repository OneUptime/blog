# Validation Summary: How to Secure a WordPress Installation with SELinux on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- Apache HTTP Server / httpd
- WordPress
- WP-CLI
- Linux audit tooling

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, SELinux Contexts / Labeling Files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Red Hat Enterprise Linux 6 Managing Confined Services, Apache HTTP Server SELinux types: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html-single/managing_confined_services/index
- WordPress Advanced Administration Handbook, Hardening WordPress: https://developer.wordpress.org/advanced-administration/security/hardening/
- WordPress Developer Resources, WP-CLI command reference: https://developer.wordpress.org/cli/commands/
- WordPress Developer Resources, wp core command: https://developer.wordpress.org/cli/commands/core/
- WordPress Developer Resources, wp plugin update command: https://developer.wordpress.org/cli/commands/plugin/update/
- WordPress Developer Resources, wp theme update command: https://developer.wordpress.org/cli/commands/theme/update/

## Issues Found
- The post labeled all of `/var/www/html/wp-content` as `httpd_sys_rw_content_t`, including plugins and themes, while the recommended practice later said to allow writes only to `wp-content/uploads/` and `wp-content/cache/`. Updated the SELinux `semanage fcontext` examples to label only uploads and cache as writable by httpd.
- The test section said to verify that WordPress can install plugins from the dashboard. That contradicted the hardened configuration where plugins and themes should not be writable by the web server. Updated the test note to expect dashboard plugin installation to be blocked and to use command-line maintenance instead.
- The WP-CLI examples used `sudo -u apache`, which can be misleading because maintenance updates should be run as the system user that owns the WordPress files, not necessarily the Apache service user. Updated the commands to use a placeholder `wordpress` owner account and clarified that it should be the file-owning system user.

## Review Notes
The SELinux command patterns, boolean names, file context types, audit commands, and WP-CLI command names/options are otherwise consistent with the consulted documentation. The post assumes Apache on RHEL and a WordPress path of `/var/www/html`; deployments using PHP-FPM, a non-default document root, or a different file owner should adapt the paths and user names.

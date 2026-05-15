# Validation Summary: How to Configure ModSecurity Web Application Firewall with Apache on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server (`httpd`)
- ModSecurity / `mod_security`
- OWASP Core Rule Set (`mod_security_crs`)
- ModSecurity rule and audit logging directives
- `dnf`, `systemctl`, `httpd`, `curl`, `grep`, and `tail`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Securing web applications on a web server using ModSecurity" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/
- OWASP ModSecurity Reference Manual v2.x - https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-%28v2.x%29
- OWASP ModSecurity project page - https://owasp.org/www-project-modsecurity/
- OWASP Core Rule Set project page - https://owasp.org/www-project-modsecurity-core-rule-set/
- Fedora package metadata for `mod_security_crs` - https://packages.fedoraproject.org/pkgs/mod_security_crs/mod_security_crs/

## Issues Found
1. The post stated that ModSecurity is available through EPEL and instructed users to install `epel-release`. Red Hat's RHEL 9 documentation installs `mod_security` and `mod_security_crs` directly from RHEL repositories. I removed the EPEL prerequisite and command, renamed the step to "Install ModSecurity", and changed the repository wording to "RHEL repositories".

## Review Notes
The remaining commands, package names, RHEL file paths, Apache module check, ModSecurity rule snippets, and audit logging directives are consistent with Red Hat's RHEL 9 guidance and the upstream ModSecurity reference manual. The SQL injection `curl` example is a reasonable smoke test, but the exact response depends on the loaded CRS version, local paranoia level, and any exclusions already configured.

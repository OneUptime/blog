# Validation Summary: How to Configure Apache with mod_security WAF on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server
- ModSecurity / `mod_security`
- OWASP Core Rule Set / `mod_security_crs`
- SELinux audit troubleshooting
- Linux shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying the ModSecurity web-based application firewall for Apache" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/assembly_securing-web-applications-on-a-web-server-using-modsecurity_setting-apache-http-server
- Red Hat Enterprise Linux 9 PDF, "Deploying web servers and reverse proxies" - https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/Red_Hat_Enterprise_Linux-9-Deploying_web_servers_and_reverse_proxies-en-US.pdf
- OWASP ModSecurity Reference Manual v2.x - https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-%28v2.x%29
- OWASP Core Rule Set documentation, false-positive tuning and exclusion placement - https://coreruleset.org/docs/
- Fedora package metadata for `mod_security` and `mod_security_crs` file layout - https://packages.fedoraproject.org/pkgs/mod_security/mod_security/ and https://packages.fedoraproject.org/pkgs/mod_security_crs/mod_security_crs/

## Issues Found
1. The post required EPEL and installed `epel-release`, but Red Hat's RHEL 9 documentation installs `mod_security` and `mod_security_crs` directly with `dnf`. I removed the EPEL prerequisite and command.
2. The configuration diagram referenced `modsecurity_crs_10_setup.conf`, which is an older CRS setup filename. Current RHEL/Fedora packaging uses `/etc/httpd/modsecurity.d/crs-setup.conf`, so I updated the diagram.
3. The post said ModSecurity has two modes, but `SecRuleEngine` supports `On`, `Off`, and `DetectionOnly`. I corrected the wording while keeping the DetectionOnly-to-On workflow.
4. The custom exclusion example mixed runtime `ctl:` exclusions with `SecRuleRemoveById` in one file described as loading after CRS. CRS documentation requires runtime `ctl:` exclusions before CRS and configure-time exclusions such as `SecRuleRemoveById` after CRS. I split the example into a before-CRS file and a local after-CRS file.
5. The original global `SecRuleRemoveById 942100` made the later targeted `ruleRemoveTargetById=942100;ARGS:search_query` example redundant. I changed the global removal example to CRS rule `941100` so the targeted SQL injection exclusion remains meaningful.

## Review Notes
The remaining commands and directives are consistent with RHEL 9 Apache/ModSecurity documentation and the ModSecurity v2.x reference. Response body inspection is technically valid but can have performance and false-positive implications, so it should be tuned per application in production.

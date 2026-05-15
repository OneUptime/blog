# Validation Summary: How to Enable Kerberos Single Sign-On for Web Applications on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server
- mod_auth_gssapi
- Kerberos / SPNEGO
- FreeIPA / Red Hat IdM
- Active Directory
- MIT Kerberos KDC tools
- SELinux
- firewalld
- Firefox enterprise policies
- Chrome enterprise policies
- curl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies, Kerberos authentication for Apache HTTP Server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/
- mod_auth_gssapi upstream documentation: https://github.com/gssapi/mod_auth_gssapi
- FreeIPA service and keytab documentation: https://www.freeipa.org/page/Administrators_Guide.html
- adcli manual page: https://www.mankier.com/8/adcli
- msktutil manual page: https://manpages.debian.org/trixie/msktutil/msktutil.1.en.html
- MIT Kerberos kadmin documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos kinit documentation: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html
- Apache mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache mod_proxy documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy.html
- Firefox enterprise policy documentation for Authentication and policies.json: https://firefox-admin-docs.mozilla.org/reference/policies/authentication/
- Chrome Enterprise policy documentation: https://chromeenterprise.google/policies/
- Local curl help output for `--negotiate` and `--user`

## Issues Found
- The Active Directory `adcli` example used `adcli add-service`, which is not an `adcli` subcommand. Changed it to `adcli update --add-service-principal=HTTP/web.example.com --host-keytab=/etc/httpd/http.keytab --show-details`, matching the documented `adcli update` options for adding service principals and writing a keytab.
- The SELinux section said `allow_httpd_mod_auth_pam` allows Apache to read the Kerberos keytab. That boolean is for PAM authentication through Apache modules, not for `mod_auth_gssapi` keytab access. Removed that command and kept the keytab SELinux context guidance.
- The Chrome policy example wrote to `/etc/opt/chrome/policies/managed/kerberos.json` without first creating the managed policy directory. Added `sudo mkdir -p /etc/opt/chrome/policies/managed`.
- The Chrome/Chromium comment implied the shown path applied equally to both browsers. Updated the comment to identify the path as Google Chrome's policy path.

## Review Notes
- Red Hat's RHEL 9 documentation recommends a GSS-Proxy based configuration for Apache Kerberos authentication. The post's direct `GssapiCredStore keytab:/etc/httpd/http.keytab` approach is supported by mod_auth_gssapi when Apache can read the keytab, but GSS-Proxy would be preferable for stricter privilege separation in future revisions.
- The Basic Auth fallback example should generally be used only over HTTPS, because it accepts user passwords through HTTP Basic authentication before acquiring Kerberos credentials.

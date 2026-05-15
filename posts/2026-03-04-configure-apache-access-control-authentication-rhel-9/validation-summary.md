# Validation Summary: How to Configure Apache Access Control and Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4 / httpd
- Apache authorization directives: `Require`, `<RequireAll>`, `<RequireAny>`
- Apache Basic authentication
- Apache Digest authentication
- `htpasswd`, `htdigest`, `apachectl`, and `systemctl`

## Sources Consulted
- Apache HTTP Server 2.4 Authentication and Authorization guide: https://httpd.apache.org/docs/2.4/howto/auth.html
- Apache HTTP Server 2.4 Access Control guide: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server 2.4 `mod_authz_core` documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server 2.4 `mod_auth_basic` documentation: https://httpd.apache.org/docs/2.4/mod/mod_auth_basic.html
- Apache HTTP Server 2.4 `mod_auth_digest` documentation: https://httpd.apache.org/docs/2.4/mod/mod_auth_digest.html
- Apache HTTP Server 2.4 `htpasswd` documentation: https://httpd.apache.org/docs/2.4/programs/htpasswd.html
- Apache HTTP Server 2.4 `htdigest` documentation: https://httpd.apache.org/docs/2.4/programs/htdigest.html
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Enterprise Linux 9 Package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index

## Issues Found
- The combined IP and password authentication examples placed `AuthType`, `AuthName`, and `AuthUserFile` inside `<RequireAll>` / `<RequireAny>` authorization containers. Apache documents these containers as authorization containers used to combine `Require` directives. I moved the authentication directives to the surrounding `<Directory>` blocks and left only `Require ip` and `Require valid-user` inside the containers.

## Review Notes
The examples use Apache 2.4-style authorization directives appropriate for RHEL 9 httpd. The Digest authentication guidance is consistent with Apache's documentation that Basic authentication over TLS is generally preferred to Digest authentication.

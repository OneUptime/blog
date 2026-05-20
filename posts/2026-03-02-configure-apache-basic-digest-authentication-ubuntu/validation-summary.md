# Validation Summary: How to Configure Apache Basic and Digest Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache HTTP Server 2.4
- Ubuntu Apache utilities
- Basic HTTP authentication
- Digest HTTP authentication
- htpasswd and htdigest
- Fail2ban
- curl

## Sources Consulted
- Apache HTTP Server 2.4 Authentication and Authorization documentation: https://httpd.apache.org/docs/2.4/howto/auth.html
- Apache mod_auth_basic documentation: https://httpd.apache.org/docs/2.4/mod/mod_auth_basic.html
- Apache mod_authn_file documentation: https://httpd.apache.org/docs/2.4/mod/mod_authn_file.html
- Apache mod_authz_user documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_user.html
- Apache mod_authz_groupfile documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_groupfile.html
- Apache mod_auth_digest documentation: https://httpd.apache.org/docs/2.4/mod/mod_auth_digest.html
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/programs/htpasswd.html
- Apache htdigest documentation: https://httpd.apache.org/docs/2.4/programs/htdigest.html
- Apache configuration file syntax documentation: https://httpd.apache.org/docs/2.4/configuring.html
- Ubuntu htpasswd manpage: https://manpages.ubuntu.com/manpages/questing/man1/htpasswd.1.html
- RFC 7617, The Basic HTTP Authentication Scheme: https://www.rfc-editor.org/rfc/rfc7617
- RFC 7616, HTTP Digest Access Authentication: https://www.rfc-editor.org/rfc/rfc7616
- Fail2ban manual: https://manpages.ubuntu.com/manpages/questing/man1/fail2ban.1.html

## Issues Found
- Basic authentication over HTTPS was described as "perfectly secure." Changed those references to say credentials are protected or secure in transit, which is more technically accurate because Basic auth still uses reusable credentials and depends on TLS for confidentiality.
- The Basic authentication module setup only mentioned `mod_auth_basic`. Added `mod_authn_file` and `mod_authz_user`, which are required for the shown `AuthUserFile` and `Require user`/`Require valid-user` configuration.
- The Digest authentication Apache snippet used an inline trailing `#` comment after `AuthName`. Apache configuration comments must be on their own line, so the comment was moved to a separate line.
- The post said there is no standard `htpasswd` option to verify a password. Replaced the workaround with `htpasswd -v`, which is the documented verification option.
- The post said `htpasswd` uses bcrypt by default on modern Ubuntu systems. Ubuntu's `htpasswd` manpage documents Apache MD5 as the default, so the text now says to use `-B` when bcrypt is desired.
- The post suggested `mod_ratelimit` for login attempt rate limiting. `mod_ratelimit` limits bandwidth, not authentication attempts, so the wording now recommends Fail2ban or firewall-based brute-force protection.

## Review Notes
The remaining commands and Apache directives are consistent with Apache 2.4 documentation. The examples assume the necessary Apache packages are installed, TLS is already configured for the `*:443` virtual host, and the example hostnames and paths are adjusted for the target server.

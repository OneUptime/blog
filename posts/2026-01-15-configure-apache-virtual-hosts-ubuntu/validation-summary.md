# Validation Summary: How to Configure Apache Virtual Hosts on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server 2.4 (Ubuntu `apache2` package)
- Ubuntu site/module helper tooling (`a2ensite`, `a2dissite`, `a2enmod`, `a2enconf`)
- Apache virtual hosts (name-based and IP-based)
- Apache directives (`ServerName`, `ServerAlias`, `DocumentRoot`, `Directory`, `AllowOverride`, `Options`, `Require`)
- mod_ssl / TLS configuration
- Let's Encrypt / Certbot (`python3-certbot-apache`)
- mod_rewrite, mod_expires, mod_headers, mod_deflate, mod_vhost_alias
- `.htaccess` configuration
- logrotate
- systemd (`systemctl`) and `apache2ctl`/`apachectl`

## Sources Consulted
- Apache HTTP Server 2.4 documentation — Virtual Hosts: https://httpd.apache.org/docs/2.4/vhosts/
- Apache 2.4 — Name-based vs IP-based virtual hosts: https://httpd.apache.org/docs/2.4/vhosts/name-based.html
- Apache 2.4 — `mod_log_config` (CustomLog / LogFormat): https://httpd.apache.org/docs/2.4/mod/mod_log_config.html
- Apache 2.4 — Access control / `Require` (`mod_authz_core`): https://httpd.apache.org/docs/2.4/howto/access.html
- Apache 2.4 — `mod_vhost_alias` (`VirtualDocumentRoot`, `%1`): https://httpd.apache.org/docs/2.4/mod/mod_vhost_alias.html
- Apache 2.4 — `mod_ssl` (SSLProtocol, SSLCipherSuite, SSLHonorCipherOrder): https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache 2.4 — `.htaccess` and AllowOverride: https://httpd.apache.org/docs/2.4/howto/htaccess.html
- Ubuntu Server Guide — Apache: https://ubuntu.com/server/docs/web-servers-apache
- Certbot Apache documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
- Mozilla SSL Configuration Generator (cipher/protocol guidance): https://ssl-config.mozilla.org/

## Issues Found
- **Duplicate `CustomLog` to the same access log in Example 1 (Full Production Setup).** The HTTPS vhost defined two `CustomLog` directives both writing to `/var/www/example.com/logs/access.log` — one unconditional and one gated by `env=!dontlog`. Apache honors every `CustomLog` directive, so each non-monitoring request would have been written to the log file twice, defeating the conditional-logging intent. Fixed by removing the unconditional `CustomLog` line and keeping the `env=!dontlog` version (retaining `ErrorLog` and `LogLevel`). This mirrors the correct pattern already shown in the standalone "Conditional Logging" section.

## Review Notes
- The `.htaccess` "Security Settings" example uses the Apache 2.2-era access-control syntax (`Order allow,deny` / `Deny from all`) while the rest of the post correctly uses Apache 2.4 syntax (`Require all denied`). This still works on Ubuntu because `mod_access_compat` is enabled by default, so it is not a functional error, but the 2.4 `Require` syntax is preferred for new configurations. Left as-is to avoid altering content beyond the genuine bug.
- `X-XSS-Protection "1; mode=block"` is shown in several examples. The header is deprecated and ignored by modern browsers; current guidance favors a strong Content-Security-Policy (and even `X-XSS-Protection: 0`). It is harmless and still commonly seen in tutorials, so not changed.
- `apache2 -V` (Testing section) can emit warnings about unset `APACHE_*` environment variables when run directly on Ubuntu; `apache2ctl -V` is the more reliable invocation. Not an error — output is still produced — so left unchanged.
- `<Files .htaccess>` protection in the WordPress example is redundant with Ubuntu's default global `<FilesMatch "^\.ht">` deny rule, but is valid and harmless.
- `SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1`, the cipher suite, certbot commands, `a2ensite`/`a2enmod` usage, directory permission commands, `VirtualDocumentRoot %1`, and the logrotate config are all syntactically correct and consistent with current official documentation.

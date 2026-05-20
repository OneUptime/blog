# Validation Summary: How to Configure Apache .htaccess Rules on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Apache packaging and service commands
- Apache HTTP Server 2.4 `.htaccess` configuration
- `mod_rewrite`
- `mod_alias`
- Apache 2.4 authorization with `Require`
- Basic authentication with `.htpasswd`
- `mod_headers`
- `mod_expires`
- `mod_deflate`
- Apache `Options` and `ErrorDocument`
- PHP per-directory configuration with `php_value` and `php_flag`
- CORS response headers

## Sources Consulted
- Apache HTTP Server 2.4 `.htaccess` tutorial: https://httpd.apache.org/docs/current/howto/htaccess.html
- Apache HTTP Server core directives (`AllowOverride`, `Options`, `ErrorDocument`): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server `mod_rewrite` documentation: https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache HTTP Server `mod_rewrite` and `.htaccess` guide: https://httpd.apache.org/docs/2.4/en/rewrite/htaccess.html
- Apache HTTP Server `mod_authz_core` documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server `mod_authn_file` documentation: https://httpd.apache.org/docs/current/mod/mod_authn_file.html
- Apache HTTP Server `htpasswd` documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Apache HTTP Server `mod_alias` documentation: https://httpd.apache.org/docs/2.4/mod/mod_alias.html
- Apache HTTP Server `mod_headers` documentation: https://httpd.apache.org/docs/current/mod/mod_headers.html
- Apache HTTP Server `mod_expires` documentation: https://httpd.apache.org/docs/current/en/mod/mod_expires.html
- Apache HTTP Server `mod_deflate` documentation: https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache HTTP Server `apachectl` documentation: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- PHP manual, changing configuration settings: https://www.php.net/manual/en/configuration.changes.php

## Issues Found
- The IP-blocking examples used `Require all granted` with `Require not ip` as adjacent directives. In Apache 2.4, negated `Require` directives cannot independently authorize or deny a request reliably unless combined with an explicit authorization container. Changed the examples to wrap the granted rule and negated IP rules in `<RequireAll>`.
- The clean URL example comment said it removed `.html` extensions from URLs, but the rule actually serves extensionless requests by internally rewriting them to matching `.html` files. Updated the comment to describe the behavior accurately.
- The testing section said `apache2ctl configtest` includes `.htaccess` parsing. Apache documents `configtest` as parsing the main configuration files; `.htaccess` rules are loaded during request processing. Updated the comment to say it tests Apache main configuration syntax.

## Review Notes
- The post is technically relevant and contains working Apache 2.4 configuration examples after the corrections above.
- Several snippets require the corresponding Apache module to be enabled and the matching `AllowOverride` category to be permitted, which the post notes in the relevant sections.
- The PHP `.htaccess` override example applies to mod_php-style setups; PHP-FPM deployments usually require pool, `.user.ini`, or application-level configuration instead.

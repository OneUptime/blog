# Validation Summary: How to Enable and Disable Apache Modules on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Apache2 packaging
- Apache HTTP Server 2.4 modules
- `a2enmod`, `a2dismod`, `a2enconf`, and `a2disconf`
- Apache module configuration files
- `mod_rewrite`, `mod_ssl`, `mod_headers`, `mod_deflate`, `mod_expires`, `mod_proxy`, `mod_proxy_balancer`, `mod_status`, `mod_userdir`, and `mod_autoindex`
- PHP-FPM integration with Apache
- ModSecurity and mod_evasive packages

## Sources Consulted
- Ubuntu Server documentation: How to use Apache2 modules - https://ubuntu.com/server/docs/how-to/web-services/use-apache2-modules/
- Ubuntu Server documentation: How to install Apache2 - https://ubuntu.com/server/docs/how-to/web-services/install-apache2/
- Ubuntu manpage for `a2enmod` and `a2dismod` - https://manpages.ubuntu.com/manpages/jammy/man8/a2enmod.8.html
- Apache HTTP Server 2.4 `apachectl` documentation - https://httpd.apache.org/docs/current/programs/apachectl.html
- Apache HTTP Server 2.4 `mod_rewrite` documentation - https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache HTTP Server 2.4 `mod_headers` documentation - https://httpd.apache.org/docs/current/mod/mod_headers.html
- Apache HTTP Server 2.4 `mod_deflate` documentation - https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache HTTP Server 2.4 `mod_expires` documentation - https://httpd.apache.org/docs/current/mod/mod_expires.html
- Apache HTTP Server 2.4 `mod_proxy` documentation - https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server 2.4 `mod_proxy_balancer` documentation - https://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html
- Apache HTTP Server 2.4 `mod_status` documentation - https://httpd.apache.org/docs/current/mod/mod_status.html
- Ubuntu package file list for `php8.3-fpm` in Ubuntu 24.04 - https://packages.ubuntu.com/noble/amd64/php8.3-fpm/filelist
- Ubuntu package details for `php-fpm` in Ubuntu 24.04 and 26.04 - https://packages.ubuntu.com/noble/php-fpm and https://packages.ubuntu.com/resolute/php-fpm
- Ubuntu package file list for `libapache2-mod-security2` - https://packages.ubuntu.com/jammy/riscv64/libapache2-mod-security2/filelist

## Issues Found
- The post said Apache reads everything in `mods-enabled/` at startup. Changed this to say Apache reads enabled `.load` and `.conf` files, matching Ubuntu's Apache include behavior.
- The `mod_rewrite` requirements list included Django URL routing. Removed Django because typical Django-on-Apache deployments use WSGI configuration rather than requiring `mod_rewrite`.
- The non-www redirect `RewriteRule` was presented for both VirtualHost and `.htaccess` contexts. Changed the rule to use an optional leading slash so it avoids double slashes in server/virtual-host context while still working in per-directory context.
- The PHP-FPM examples hard-coded PHP 8.1, which is only the default for Ubuntu 22.04 and is outdated for newer Ubuntu releases. Changed the examples to use `phpX.Y` / `phpX.Y-fpm` placeholders with comments to replace `X.Y` with the installed PHP version.
- The module configuration example used `sudo a2enconf security`, which enables Apache's packaged `security.conf` rather than a module-specific config for ModSecurity. Replaced it with the PHP-FPM config example.

## Review Notes
The remaining commands and configuration snippets are consistent with Ubuntu's Apache packaging and Apache HTTP Server 2.4 documentation. PHP package versions vary by Ubuntu release, so the placeholder form is more durable than a hard-coded version.

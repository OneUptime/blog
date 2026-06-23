# Validation Summary: How to Fix Nginx Serving PHP Files as Downloads

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx
- PHP
- PHP-FPM
- FastCGI
- Laravel
- WordPress
- Symfony
- Linux systemd and shell commands

## Sources Consulted
- Nginx `ngx_http_fastcgi_module` documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx `ngx_http_core_module` documentation for `try_files`, `default_type`, `types`, and location behavior: https://nginx.org/en/docs/http/ngx_http_core_module.html
- PHP-FPM configuration manual: https://www.php.net/manual/en/install.fpm.configuration.php
- Laravel deployment documentation, Nginx section: https://laravel.com/docs/13.x/deployment
- WordPress Advanced Administration Handbook, Nginx section: https://developer.wordpress.org/advanced-administration/server/web-server/nginx/
- Symfony web server configuration documentation: https://symfony.com/doc/current/setup/web_server_configuration.html
- MDN Web Docs for the deprecated `X-XSS-Protection` response header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- Local command help for `netstat`; Nginx, PHP-FPM, and `cgi-fcgi` binaries were not installed in the review environment.

## Issues Found
- The `default_type` explanation said Nginx may serve unknown files with a download header. Nginx sets a fallback `Content-Type`; browsers often download `application/octet-stream`, but this is not a `Content-Disposition` download header. Updated the wording and inline comment.
- The "Fix: Add PHP MIME Type Handling" heading was technically imprecise because PHP execution is handled by the FastCGI location, not by adding a PHP MIME type. Renamed it to "Fix: Add PHP FastCGI Handling".
- The `try_files` comment in the PHP location said it prevents downloading if PHP-FPM fails. If PHP-FPM fails, Nginx typically returns an upstream error such as 502; `try_files` verifies that the script exists before passing it to PHP-FPM. Updated the comment.
- The production configuration included `X-XSS-Protection: 1; mode=block`, which MDN marks as deprecated and no longer recommended for production. Removed that header from the example.
- The WordPress upload PHP deny rules appeared after the generic PHP regex location. Because Nginx uses the first matching regex location in configuration order, uploaded PHP files could be handled by PHP-FPM before the deny rules were reached. Moved the deny locations before the generic PHP handler.
- The socket permission troubleshooting row recommended adding the Nginx user to the `www-data` group, which is distribution-specific and incomplete. Updated it to recommend matching the Nginx user with the PHP-FPM socket owner/group.

## Review Notes
The examples use PHP 8.2 socket names, while current official framework examples may show PHP 8.3. This is acceptable as a version-specific example as long as readers substitute their installed PHP-FPM version and socket path.

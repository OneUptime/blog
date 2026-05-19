# Validation Summary: How to Configure PHP-FPM Pools for Multiple Sites on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- PHP 8.3
- PHP-FPM
- Nginx
- Linux system users and file permissions

## Sources Consulted
- PHP manual: FPM configuration directives, pool directives, process manager modes, socket permissions, slowlog, environment variables, and per-pool PHP settings: https://www.php.net/manual/en/install.fpm.configuration.php
- PHP manual: FPM status page configuration and security guidance: https://www.php.net/manual/en/fpm.status.php
- Nginx official documentation: FastCGI module, `fastcgi_pass`, and `fastcgi_param SCRIPT_FILENAME`: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Linux `useradd(8)` manual: `--system`, `--no-create-home`, and `--shell` behavior: https://man7.org/linux/man-pages/man8/useradd.8.html

## Issues Found
- The introduction and conclusion described PHP-FPM pools as providing broad security isolation. PHP's manual notes that pools are not a full security mechanism, so I changed this wording to filesystem isolation and avoided implying a complete security boundary.
- The pool directory path was presented as universal for Ubuntu. I clarified that `/etc/php/8.3/fpm/pool.d/` applies to Ubuntu systems using PHP 8.3.
- The default-pool section said disabling `www.conf` avoids orphaned processes. Renaming a pool file prevents keeping an unused shared pool; it does not create orphaned processes, so I corrected the wording.
- The log directory commands made `/var/log/php` group-writable by `www-data`, but the configured `php_admin_value[error_log]` files are used by the per-site pool users. I changed the commands to create the specific log files, assign each file to its matching pool user, and keep the directory owned by root.
- The status-page `curl` commands targeted `site1.example.com` while the Nginx location allowed only `127.0.0.1`. I changed the examples to curl `127.0.0.1` with the correct `Host` header.

## Review Notes
The PHP-FPM directives, process manager examples, Unix socket syntax, Nginx FastCGI socket configuration, `useradd` flags, and status-page configuration are otherwise consistent with the referenced documentation. The examples are version-specific to PHP 8.3; users on other Ubuntu releases or PPAs should replace `8.3` with their installed PHP-FPM version.

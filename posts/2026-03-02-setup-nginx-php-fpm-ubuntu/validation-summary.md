# Validation Summary: How to Set Up Nginx with PHP-FPM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (web server)
- PHP-FPM (FastCGI Process Manager)
- PHP 7.4, 8.0, 8.1, 8.3
- Ubuntu (apt package manager, systemd)
- FastCGI protocol
- Unix sockets
- ondrej/php PPA
- Let's Encrypt / TLS

## Sources Consulted
- Nginx FastCGI module docs — https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx HTTP core module (listen directive) — https://nginx.org/en/docs/http/ngx_http_core_module.html
- PHP-FPM configuration manual — https://www.php.net/manual/en/install.fpm.configuration.php
- PHP `php_sapi_name()` — https://www.php.net/manual/en/function.php-sapi-name.php
- PHP `phpinfo()` output format — https://www.php.net/manual/en/function.phpinfo.php (and PHP source `ext/standard/info.c`)
- Debian/Ubuntu PHP package layout — https://wiki.debian.org/PHP and Ubuntu `php-fpm` package
- ondrej/php PPA — https://launchpad.net/~ondrej/+archive/ubuntu/php
- Nginx pitfalls / try_files security pattern — https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/
- MDN HSTS reference — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security

## Issues Found
1. **`grep -i "fpm-fcgi"` against `phpinfo()` output would not match.** The post had:
   ```
   curl http://example.com/phpinfo.php | grep -i "fpm-fcgi"
   ```
   `phpinfo()` displays the SAPI module's `pretty_name`, which for PHP-FPM is `FPM/FastCGI`, not the internal SAPI name `fpm-fcgi`. The literal string `fpm-fcgi` does not appear in phpinfo HTML output (it is only returned by `php_sapi_name()` and exposed via the `PHP_SAPI` constant, neither of which phpinfo prints directly). Fixed by changing the grep to `"FPM/FastCGI"` and updating the accompanying comment to match. The second test using `php_sapi_name()` was already correct and was left as-is.

## Review Notes
- `listen 443 ssl http2;` is technically deprecated since Nginx 1.25.1 in favor of `listen 443 ssl; http2 on;`, but the older form is still accepted and works on all currently supported Ubuntu releases (which ship Nginx 1.18–1.24 in stable, 1.26 in 24.04). No change made.
- Unix socket path `/run/php/php8.3-fpm.sock`, pool config path `/etc/php/8.3/fpm/pool.d/www.conf`, default user/group `www-data`, and default socket mode `0660` all match the Debian/Ubuntu `php8.3-fpm` package layout.
- The PHP-FPM pool directives (`pm`, `pm.max_children`, `pm.start_servers`, `pm.min_spare_servers`, `pm.max_spare_servers`, `pm.max_requests`, `listen`, `listen.owner`, `listen.group`, `listen.mode`, `php_admin_value[...]`, `php_admin_flag[...]`) are all valid and current.
- The Nginx config patterns (`try_files $uri =404;` before `fastcgi_pass`, `fastcgi_split_path_info`, `SCRIPT_FILENAME $realpath_root$fastcgi_script_name`, denying `.php` inside upload directories) follow the long-standing recommended security pattern.
- The `ondrej/php` PPA still ships php7.4, 8.0, 8.1, 8.2, 8.3, and 8.4 packages, so the multiple-versions section is accurate. Note that PHP 7.4, 8.0, and 8.1 are all past end-of-life upstream as of 2026 — they are valid for legacy app support but should not be used for new deployments. Not flagged in the post itself since the section explicitly frames 7.4 as "legacy application" use.
- HSTS `max-age=63072000` (2 years) matches the commonly recommended value.

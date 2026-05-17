# Validation Summary: How to Troubleshoot Apache '500 Internal Server Error' on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Apache HTTP Server (Ubuntu `apache2` package)
- PHP 8.3 (CLI, mod_php directives, PHP-FPM)
- Ubuntu system tooling: `systemctl`, `journalctl`, `logrotate`
- AppArmor (`aa-complain`, `aa-enforce`, `aa-logprof`)
- `.htaccess` directives (`RewriteEngine`, `Options`, `AllowOverride`, `FollowSymLinks`, `SymLinksIfOwnerMatch`)
- CGI scripts
- `curl` for HTTP testing

## Sources Consulted
- Apache HTTP Server documentation — `mod_rewrite`, `Options`, `AllowOverride`, `FollowSymLinks` directives: https://httpd.apache.org/docs/2.4/mod/core.html and https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Ubuntu manpages for `apache2ctl(8)`, `a2enmod(8)`, `systemctl(1)`, `journalctl(1)`, `logrotate(8)`
- PHP manual — `php -l`, `display_errors`, `error_reporting`, `E_ALL` integer value (32767 in PHP 8.x): https://www.php.net/manual/en/errorfunc.constants.php
- Ubuntu package archive — verified `php8.3-mysql`, `php8.3-common`, and confirmed `php8.3-pdo` is NOT a separate package (PDO core ships in `php8.3-common`): https://packages.ubuntu.com/
- AppArmor wiki — `aa-complain`/`aa-enforce`/`aa-logprof` usage: https://gitlab.com/apparmor/apparmor/-/wikis/home
- PHP-FPM documentation — pool configuration and socket paths

## Issues Found
- **`sudo apt install php8.3-mysql php8.3-pdo`** (section 6, "Missing Required PHP Extensions"): `php8.3-pdo` is not a real Ubuntu/Debian package — `apt install` would fail. The PDO core is included with `php8.3-common` (a dependency of base PHP), and PDO drivers ship inside the per-database packages (e.g., `pdo_mysql` is included in `php8.3-mysql`, `pdo_pgsql` in `php8.3-pgsql`). Fixed by removing `php8.3-pdo` from the apt install command and adding a brief inline note explaining that the driver package provides PDO support.

## Review Notes
- The `php_flag` / `php_value` directives in the VirtualHost example (in "Enabling Detailed Error Messages for Debugging") only work with `mod_php`; under PHP-FPM the equivalent is `php_admin_value`/`php_admin_flag` set in the FPM pool config. The post does not explicitly call this out, but the surrounding context already covers editing `php.ini` for FPM separately, so the example remains accurate for mod_php installs.
- `error_reporting 32767` is the correct integer value of `E_ALL` for PHP 8.x (E_STRICT was removed in PHP 8.0 but the numeric value of E_ALL did not change).
- `mysql_connect()` is referenced as an example error message; the function itself was removed in PHP 7.0, but it remains a realistic error string a user might encounter in legacy code, so this is fine as illustrative text.
- The combined `tail -f` example references `/var/log/php/error.log`, which doesn't exist by default on Ubuntu; the `2>/dev/null` redirect makes this harmless and the path varies by site configuration anyway.
- Permission recommendations (644 files / 755 directories, `www-data:www-data` ownership) match Ubuntu's default Apache configuration.
- PHP 8.3 is current and supported at time of review, so version-specific paths (`/etc/php/8.3/...`, `php8.3-fpm.sock`) are accurate.

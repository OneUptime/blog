# Validation Summary: How to Install Multiple PHP Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- PHP 7.4, 8.2, 8.3
- Ondrej Sury PPA (`ppa:ondrej/php`)
- PHP-FPM
- Nginx (FastCGI / `fastcgi_pass`)
- Apache (`mod_proxy_fcgi` / `SetHandler`)
- systemd / systemctl
- apt / apt-cache
- update-alternatives

## Sources Consulted
- Ondrej Sury PPA on Launchpad: https://launchpad.net/~ondrej/+archive/ubuntu/php
- Apache `mod_proxy_fcgi` documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_fcgi.html
- Apache HTTPD wiki on PHP-FPM: https://cwiki.apache.org/confluence/display/HTTPD/PHP-FPM
- Nginx FastCGI module documentation
- Debian/Ubuntu PHP package layout (deb.sury.org)
- PHP.Watch installation guides for Debian/Ubuntu
- oerdnj/deb.sury.org GitHub repository (issue tracker)

## Issues Found
No technical issues found.

All technical claims were verified:
- `ppa:ondrej/php` is the correct PPA name and provides co-installable PHP versions.
- All package names (`php8.3`, `php8.3-fpm`, `php8.3-cli`, `php8.3-mysql`, `php8.3-redis`, `php8.3-curl`, `php8.3-gd`, `php8.3-mbstring`, `php8.3-xml`, `php8.3-zip`, `php8.3-opcache`, `php7.4-imagick`, etc.) are valid in the Ondrej PPA.
- Socket paths (`/run/php/phpX.Y-fpm.sock`), config paths (`/etc/php/X.Y/{fpm,cli}/php.ini`, `/etc/php/X.Y/fpm/pool.d/www.conf`), and systemd service names (`phpX.Y-fpm`) are correct.
- Apache `SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"` syntax is correct for `mod_proxy_fcgi` (supported since Apache 2.4.9).
- Nginx `fastcgi_pass unix:...` configuration is syntactically and semantically correct.
- `update-alternatives --list php` works because Ondrej packages register `/usr/bin/phpX.Y` under the `php` alternative.
- `php -l` (lint), `php -m` (modules), and `systemctl is-active` commands are correct.

## Review Notes
- `php8.3-opcache` is currently a separate package in the Ondrej PPA, but note that starting with PHP 8.5, OPcache is bundled into the base package and no separate `php8.5-opcache` package exists. The PHP versions discussed (7.4, 8.2, 8.3) all still ship opcache as a separate package, so the post is correct for those versions.
- PHP 7.4 reached end-of-life in November 2022, but the Ondrej PPA continues to host packages for legacy compatibility. The post correctly frames PHP 7.4 as a "legacy" target.
- The Apache section does not mention enabling `proxy_fcgi` and `setenvif` modules (`sudo a2enmod proxy_fcgi setenvif`), which are required for `SetHandler "proxy:unix:..."` to work. This is a completeness gap, not a technical error.
- The `php7.4-imagick` package has known dependency quirks on some Ubuntu releases (pulling in PHP 8.x deps); not a fault of the post but worth being aware of.

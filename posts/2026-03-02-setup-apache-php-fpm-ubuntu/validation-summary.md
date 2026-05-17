# Validation Summary: How to Set Up Apache with PHP-FPM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt package manager)
- Apache HTTP Server (apache2)
- Apache MPM modules (mpm_event, mpm_prefork)
- Apache modules: proxy_fcgi, setenvif, mod_php
- PHP 7.4, 8.0, 8.1, 8.3
- PHP-FPM (FastCGI Process Manager)
- PHP-FPM pool configuration (www.conf)
- ondrej/php PPA
- systemd (systemctl, journalctl)

## Sources Consulted
- PHP official documentation on FPM: https://www.php.net/manual/en/install.fpm.php
- PHP-FPM pool configuration reference: https://www.php.net/manual/en/install.fpm.configuration.php
- Apache mod_proxy_fcgi documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_fcgi.html
- Apache mod_http2 / Event MPM documentation: https://httpd.apache.org/docs/2.4/howto/http2.html
- Debian/Ubuntu php-fpm package configuration template (php8.3-fpm.conf as shipped via apt)
- DigitalOcean and other community guides confirming standard layout of `/etc/apache2/conf-available/php8.3-fpm.conf`

## Issues Found
- **Incorrect inline comment in Apache config snippet**: The post showed the comment `# Enable HTTP/1.1 Upgraded requests` above the `SetEnvIfNoCase ^Authorization$ ...` directive. That directive actually exists to pass HTTP Authorization headers through to PHP (a common CGI/FastCGI quirk), not to enable HTTP/1.1 upgrade requests. The comment shipped by the Debian/Ubuntu `php8.3-fpm` package is `# Enable http authorization headers`. Updated the comment in the snippet to match the package's actual content and to accurately describe what the directive does.

## Review Notes
- Package install commands (`apt install apache2`, `apt install php8.3-fpm`, the extension list, and the ondrej/php PPA) are correct for current Ubuntu releases.
- The Event MPM / HTTP/2 / `mod_php` story is correctly summarized for practical purposes. Technically, modern `mod_http2` will run with `mpm_prefork` but issues warnings and serializes requests per connection, which defeats the point of HTTP/2 — so the post's "PHP-FPM is required for HTTP/2 support" framing is reasonable shorthand for the recommended setup.
- Pool configuration (`pm = dynamic`, `pm.max_children`, `pm.start_servers`, `pm.min_spare_servers`, `pm.max_spare_servers`, `php_admin_value[...]`, `php_admin_flag[...]`, `listen`, `listen.owner/group/mode`) all match the FPM configuration reference.
- Using `listen.owner = www-data` / `listen.group = www-data` while running the pool as a different user (`user = www-example`) is intentional and correct — the socket needs to be readable by Apache (which runs as `www-data`) even though the PHP workers run as a less-privileged user.
- The `<FilesMatch "^\.ph(ar|p|ps|tml)$">` block denying access to dotfiles like `.php` is correctly preserved from the upstream config.
- The `pm.status_path = /status` example is a small simplification — accessing it from `curl` also requires an Apache `<Location>` (or `ProxyPass`) entry pointing at the FPM socket. This is a common omission in guides but not strictly wrong as presented (it's flagged as "requires enabling in pool config").
- The `<IfModule !mod_php8.c>` outer guard matches what the Debian/Ubuntu `php8.3-fpm` package ships for PHP 8.x.
- The `echo "<?php ... " | sudo tee` snippets intentionally omit the closing `?>` tag, which is valid (and in fact preferred) PHP.

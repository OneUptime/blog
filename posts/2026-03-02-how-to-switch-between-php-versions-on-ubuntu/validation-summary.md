# Validation Summary: How to Switch Between PHP Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu (apt package management)
- PHP (versions 7.4, 8.2, 8.3)
- update-alternatives (Debian/Ubuntu alternatives system)
- Apache (mod_php and PHP-FPM with a2enmod/a2dismod)
- Nginx (FastCGI via PHP-FPM socket)
- PHP-FPM (systemd service management)
- phpbrew (PHP version manager)
- Bash aliases / shell configuration

## Sources Consulted
- Debian `update-alternatives(1)` man page: https://manpages.debian.org/bookworm/dpkg/update-alternatives.1.en.html
- Ondřej Surý PPA package contents for PHP (Ubuntu): https://launchpad.net/~ondrej/+archive/ubuntu/php
- Apache `a2enmod`/`a2dismod` documentation: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Nginx Ubuntu/Debian packaging conventions (sites-available/sites-enabled): https://nginx.org/en/docs/
- phpbrew GitHub repository: https://github.com/phpbrew/phpbrew
- PHP-FPM official docs and Ubuntu systemd unit naming: https://www.php.net/manual/en/install.fpm.php

## Issues Found
1. **Nginx sed glob pattern** — The command `sudo sed -i 's|...|...|g' /etc/nginx/sites-enabled/*.conf` would miss site files in Ubuntu's default nginx layout, where sites in `/etc/nginx/sites-enabled/` are typically named without a `.conf` extension (e.g. `default`). The default `nginx.conf` on Ubuntu uses `include /etc/nginx/sites-enabled/*;`, so files don't require the extension. Changed the glob from `*.conf` to `*` so it works with both naming conventions. The Apache equivalent earlier in the post was left as `*.conf` because Apache on Ubuntu requires the `.conf` extension on enabled sites.

## Review Notes
- The example output of `update-alternatives --config php` is accurate in format and matches what real systems display.
- The `/usr/bin/phpize8.2`, `/usr/bin/php-config8.2`, `/usr/bin/pear8.2`, and `/usr/bin/phar8.2` paths are accurate for the Sury PPA on Ubuntu, which provides these versioned binaries.
- `phpbrew install 8.3 +default+mysql+curl` works as a shorthand — phpbrew accepts major.minor and resolves to the latest patch version.
- The Apache module names (`php7.4`, `php8.2`) and PHP-FPM service names (`php8.2-fpm`) are correct for the Sury PPA.
- PHP 7.4 reached end-of-life in November 2022 and PHP 8.2 reached end of active support in December 2024 (security support continues through December 2026). The use of 7.4 / 8.2 / 8.3 as examples is reasonable for a transition-focused post, but readers should consult php.net/supported-versions for current recommendations.
- The post correctly distinguishes CLI version (managed by update-alternatives) from web server version (managed per-site via FPM socket or per-server via mod_php), which is the key conceptual point.

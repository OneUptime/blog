# Validation Summary: How to Install Multiple PHP Versions Side by Side on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- EPEL
- Remi RPM repository
- PHP SCL packages
- PHP-FPM
- Nginx FastCGI configuration
- Linux alternatives

## Sources Consulted
- Remi RPM repository configuration: https://blog.remirepo.net/pages/Config-en
- Remi RPM repository FAQ: https://blog.remirepo.net/pages/English-FAQ
- Remi PHP workstation guide: https://blog.remirepo.net/post/2022/02/17/My-PHP-Workstation
- Remi configuration wizard: https://rpms.remirepo.net/wizard/
- PHP supported versions: https://www.php.net/supported-versions.php
- Red Hat EPEL guidance: https://access.redhat.com/solutions/3358
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Remi package metadata via rpmfind for php82/php84 CLI and FPM package file paths: https://rpmfind.net/linux/rpm2html/search.php?query=php82-php-cli

## Issues Found
- The repository setup omitted the RHEL 9 CodeReady Builder repository, which EPEL/Remi dependencies may require. Added the `subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms` command before installing EPEL.
- The examples installed PHP 8.1, which is no longer supported upstream as of 2026-05-15. Replaced the PHP 8.1 package, verification, PHP-FPM pool, and service examples with PHP 8.4.
- The post used PHP 7.4 for the legacy example without warning that it is upstream end-of-life. Added a short caveat that PHP 7.4 should be used only when required by a legacy application.

## Review Notes
The Remi SCL-style package names, `/etc/opt/remi/php##/php-fpm.d/www.conf` configuration paths, `/var/opt/remi/php##/run/php-fpm/www.sock` socket paths, `php##` CLI wrapper commands, systemd service names, and Nginx `fastcgi_pass` Unix socket syntax were consistent with the consulted documentation and package metadata.

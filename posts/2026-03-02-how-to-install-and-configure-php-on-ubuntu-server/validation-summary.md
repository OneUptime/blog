# Validation Summary: How to Install and Configure PHP on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- PHP and PHP-FPM
- PHP CLI
- OPcache
- Nginx FastCGI configuration
- Apache mod_php and PHP-FPM integration
- APT package installation

## Sources Consulted
- Ubuntu Server documentation: Install PHP - https://ubuntu.com/server/docs/how-to/web-services/install-php/
- PHP manual: Core php.ini directives - https://www.php.net/manual/en/ini.core.php
- PHP manual: OPcache runtime configuration - https://www.php.net/manual/en/opcache.configuration.php
- PHP manual: PHP-FPM configuration - https://www.php.net/manual/en/install.fpm.configuration.php
- PHP official supported versions - https://www.php.net/supported-versions.php
- Nginx official documentation: try_files and FastCGI examples - https://nginx.org/en/docs/http/ngx_http_core_module.html
- Apache HTTP Server documentation: mod_proxy_fcgi - https://httpd.apache.org/docs/2.4/mod/mod_proxy_fcgi.html

## Issues Found
- The post said to install PHP 8.3 "or whatever the current stable version is." PHP 8.3 is still a supported branch, but it is not the current stable branch as of this review date. Changed the wording to say the examples use PHP 8.3 and that readers can replace `8.3` with a newer supported version.
- The php.ini validation commands used `php --ini` and `php -r "phpinfo();" | head -5`, which show CLI configuration information but do not validate the PHP-FPM configuration. Added `sudo php-fpm8.3 -t` and kept `php --ini` as a configuration-file discovery command.
- The Nginx PHP location comment claimed `fastcgi_split_path_info` prevented processing PHP files in an uploads directory. That directive only splits path info. Updated the PHP location regex to allow PATH_INFO requests, added `try_files $fastcgi_script_name =404;`, and changed the comments to accurately describe checking for existing PHP files and supporting PATH_INFO.
- The Apache PHP-FPM option installed `libapache2-mod-fcgid`, but the shown configuration uses Apache `mod_proxy_fcgi`, not `mod_fcgid`. Changed the package command to install `php8.3-fpm` and kept `a2enmod proxy_fcgi setenvif` plus `a2enconf php8.3-fpm`.
- The multi-line `apt install` command for extensions placed comments after trailing backslashes. In shell, that breaks line continuation and would not run as intended. Moved the extension descriptions into regular comments above the command and left only package names in the continued command.

## Review Notes
- The tutorial is version-specific to PHP 8.3 package names. That is technically valid for systems where PHP 8.3 packages are available, especially via the Ondrej Sury PPA, but future updates could consider using placeholders such as `phpX.Y` for maintainability.
- The phpinfo test page warning is correct and important; exposing phpinfo output publicly should remain temporary only.

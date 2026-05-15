# Validation Summary: How to Install WordPress with Apache and MySQL on RHEL (LAMP Stack)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Apache HTTP Server
- MySQL
- PHP and PHP-FPM
- WordPress
- SELinux
- firewalld

## Sources Consulted
- WordPress requirements: https://wordpress.org/about/requirements/
- WordPress wp-config.php documentation: https://developer.wordpress.org/apis/wp-config-php/
- Red Hat RHEL 9 MySQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- Red Hat RHEL 9 PHP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/installing_and_using_dynamic_programming_languages
- Red Hat RHEL 9 Apache documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Apache HTTP Server 2.4 virtual host documentation: https://httpd.apache.org/docs/2.4/vhosts/
- Apache HTTP Server 2.4 core directives documentation: https://httpd.apache.org/docs/2.4/mod/core.html

## Issues Found
- The post referred generically to RHEL, but the package names and service commands match RHEL 9. I updated the description and intro to state RHEL 9 explicitly.
- The service startup commands did not include `php-fpm`. On RHEL 9, Apache runs PHP through FastCGI Process Manager by default, so I added `php-fpm` to the install list and enabled it with `httpd` and `mysqld`.
- The PHP package list included packages that are not appropriate for the RHEL 9 package set, such as a separate `php-json` package and `php-zip`. I removed `php-json`, replaced `php-zip` with `php-pecl-zip`, and kept the package list aligned with Red Hat's documented PHP packaging.
- The SELinux write-access comment incorrectly described both booleans as allowing Apache to write to WordPress directories, and the `chcon` command was not persistent across relabels. I changed the guidance to use `httpd_can_network_connect` for outbound HTTP connections and `semanage fcontext` plus `restorecon` for a persistent writable label on `wp-content`.

## Review Notes
- The guide is technically valid for the RHEL 9 package layout. RHEL 10 uses different MySQL package naming, such as `mysql8.4-server`, so a future version-specific update may be useful if the post should target RHEL 10 directly.
- The guide opens HTTP only. WordPress recommends HTTPS for production installs, so adding TLS configuration would improve production readiness in a future revision.

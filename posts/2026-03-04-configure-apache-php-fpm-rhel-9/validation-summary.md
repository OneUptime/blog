# Validation Summary: How to Configure Apache with PHP-FPM on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server
- PHP
- PHP-FPM
- FastCGI
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages, "Using PHP with the Apache HTTP Server" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, "Infrastructure services" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_infrastructure-services_considerations-in-adopting-rhel-9
- Apache HTTP Server 2.4 documentation: mod_proxy_fcgi - https://httpd.apache.org/docs/2.4/mod/mod_proxy_fcgi.html
- Apache HTTP Server 2.4 documentation: Multi-Processing Modules - https://httpd.apache.org/docs/current/en/mpm.html
- PHP manual: PHP-FPM configuration - https://www.php.net/manual/en/install.fpm.configuration.php
- PHP manual: PHP-FPM status page - https://www.php.net/manual/en/fpm.status.php

## Issues Found
- The post described `pm = dynamic` as creating processes on demand. PHP-FPM's `dynamic` mode adjusts the child count using `pm.start_servers`, `pm.min_spare_servers`, and `pm.max_spare_servers`; true on-demand spawning is `pm = ondemand`. Updated the explanation.
- The TCP section said to use TCP when PHP-FPM runs on a different server, but the example configured `listen = 127.0.0.1:9000`, which only listens on localhost. Updated the wording to describe same-server TCP usage.
- The PHP-FPM status page Apache snippet used `SetHandler` with a status-path backend URL. The PHP manual documents using `ProxyPass` in a `LocationMatch` for the status endpoint. Updated the snippet to match the documented Apache/FPM status configuration and used `Require local`.

## Review Notes
RHEL 9 uses PHP-FPM by default for Apache PHP execution, and the mod_php package is no longer available in RHEL 9. The post's guidance is consistent with that model after the corrections above. The Apache `SetHandler` examples rely on `mod_proxy` and `mod_proxy_fcgi`, which RHEL's packaged PHP/Apache integration normally configures, but installations with heavily customized module loading should confirm those modules are loaded.

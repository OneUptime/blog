# Validation Summary: How to Configure Nginx with PHP-FPM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx
- PHP-FPM
- FastCGI
- SELinux
- systemd
- dnf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing and using dynamic programming languages": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring NGINX": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- PHP manual, "FastCGI Process Manager (FPM) Configuration": https://www.php.net/manual/en/install.fpm.configuration.php
- PHP manual, "FPM Status Page": https://www.php.net/manual/en/fpm.status.php
- Nginx official documentation, "ngx_http_fastcgi_module": https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx documentation, "Serving Static Content": https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/

## Issues Found
- The SELinux section used `semanage` without ensuring the required SELinux management tools were installed. Added `sudo dnf install -y policycoreutils-python-utils` before the `semanage fcontext` commands, matching Red Hat guidance that these tools are required for SELinux management commands.
- The TCP example said it was for PHP-FPM on a separate server but configured both PHP-FPM and Nginx with `127.0.0.1:9000`. Loopback addresses only work when both services are on the same host. Updated the PHP-FPM listener to bind to a reachable interface, added `listen.allowed_clients`, and changed the Nginx `fastcgi_pass` example to use the PHP-FPM server's private IP.

## Review Notes
- The main RHEL 9 package, service, Nginx FastCGI, PHP-FPM pool, and SELinux file-context examples are technically valid after the fixes.
- The guide intentionally uses `phpinfo()` for testing and correctly tells readers to remove it afterward.
- For a production follow-up, the PHP location could also include stricter request filtering such as `try_files $uri =404;`, but the existing snippet is syntactically valid and common for front-controller PHP applications.

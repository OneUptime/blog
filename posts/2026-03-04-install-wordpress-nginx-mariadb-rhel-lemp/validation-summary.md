# Validation Summary: How to Install WordPress with Nginx and MariaDB on RHEL (LEMP Stack)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Nginx
- MariaDB
- PHP-FPM
- WordPress
- SELinux
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages, PHP with nginx: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers, MariaDB installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_using_database_servers/installing-mysql_assembly_using-mysql
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring NGINX: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- MariaDB Server documentation: mariadb-secure-installation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- PHP manual: FastCGI Process Manager configuration: https://www.php.net/manual/en/install.fpm.configuration.php
- WordPress Hosting Handbook: Server Environment: https://make.wordpress.org/hosting/handbook/server-environment/
- Red Hat SELinux User's and Administrator's Guide: Apache HTTP Server SELinux types: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-types
- NGINX documentation: Serving static content and try_files: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/

## Issues Found
- Updated `mysql_secure_installation` to `mariadb-secure-installation` and `mysql` to `mariadb` because MariaDB documentation identifies the MariaDB-prefixed commands as current, with the older MySQL names retained mainly for compatibility.
- Replaced PHP-FPM pool edits that targeted fixed `apache` and uncommented `listen.owner`/`listen.group` lines with broader `user`, `group`, and `listen.acl_users` edits. RHEL's PHP-FPM package is preconfigured for nginx, and PHP-FPM documents `listen.acl_users` as the socket ACL setting.
- Added `sudo mkdir -p /var/www` before extracting WordPress so the tar extraction target exists when using a custom Nginx document root.
- Moved the recursive ownership change until after `wp-config.php` is created so the generated configuration file is included in the final ownership update.
- Replaced the non-persistent `chcon` command with `semanage fcontext` and `restorecon`, and added the package that provides `semanage`. This makes the SELinux content and writable-content labels survive a relabel.

## Review Notes
- The guide remains a basic HTTP-only setup. A production deployment should add HTTPS, adjust credentials, and consider stricter ownership and update workflows, but those are outside the scope of the original post.

# Validation Summary: How to Set Up Laravel with Nginx on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Laravel
- PHP 8.2
- PHP-FPM
- Nginx
- Composer
- SELinux
- firewalld

## Sources Consulted
- Laravel deployment documentation: https://laravel.com/docs/11.x/deployment
- Laravel installation documentation: https://laravel.com/docs/12.x/installation
- Composer download documentation: https://getcomposer.org/download/
- Composer CLI documentation: https://getcomposer.org/doc/03-cli.md
- Red Hat Enterprise Linux 9 PHP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 NGINX documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/Red_Hat_Enterprise_Linux-9-Deploying_web_servers_and_reverse_proxies-en-US.pdf
- Red Hat Enterprise Linux SELinux httpd type documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-types
- Red Hat Enterprise Linux SELinux httpd boolean documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
- The dependency installation comment said PHP 8.2 would be installed, but the command did not enable the `php:8.2` module stream. Added `dnf module reset` and `dnf module enable php:8.2` for RHEL 9.
- The package list included non-RHEL package names such as `php-zip` and `php-tokenizer`. Replaced them with RHEL package names and packages that provide the required PHP functionality, including `php-common`, `php-pdo`, and `php-pecl-zip`.
- The Composer installer command wrote to `/usr/local/bin` without privilege. Added `sudo` to the installer invocation.
- The SELinux commands used `chcon`, which works temporarily but does not survive relabeling or `restorecon`. Replaced them with `semanage fcontext` and `restorecon`, and added `policycoreutils-python-utils` to provide `semanage`.
- The firewall commands depend on `firewall-cmd`. Added `firewalld` to the dependency installation command.

## Review Notes
The Nginx configuration matches Laravel's documented deployment pattern for `root`, `try_files`, and FastCGI `SCRIPT_FILENAME`, though Laravel's full example also includes extra hardening headers and a narrower `index.php` FastCGI location that could be added in a future editorial update.

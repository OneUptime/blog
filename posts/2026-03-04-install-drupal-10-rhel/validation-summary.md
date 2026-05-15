# Validation Summary: How to Install Drupal 10 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Drupal 10
- Apache HTTP Server
- PHP 8.2
- Remi RPM repository
- MySQL
- Composer
- SELinux
- firewalld

## Sources Consulted
- Drupal PHP requirements: https://www.drupal.org/docs/getting-started/system-requirements/php-requirements
- Drupal database server requirements: https://www.drupal.org/docs/getting-started/system-requirements/database-server-requirements
- Drupal Composer project template documentation: https://www.drupal.org/docs/develop/using-composer/starting-a-site-using-drupal-composer-project-templates
- Composer download and installer documentation: https://getcomposer.org/download/
- Remi PHP 8.2 repository instructions for Enterprise Linux: https://blog.remirepo.net/post/2023/04/19/Install-PHP-8.2-on-Fedora-RHEL-CentOS-Alma-Rocky-or-other-clone
- Red Hat Enterprise Linux 9 MySQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/assembly_using-mysql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/

## Issues Found
- The Remi PHP 8.2 setup omitted required Enterprise Linux repository prerequisites. Added EPEL and CodeReady Builder enablement before enabling the Remi PHP module stream.
- The Composer installer command attempted to install into `/usr/local/bin` without elevated privileges. Added `sudo` to the installer command.
- The Drupal project creation command ran Composer as the `apache` user in `/var/www` before that user had permission to create the target directory. Added creation and ownership of `/var/www/drupal`, then ran `composer create-project` against that writable path.
- The SELinux command used `chcon`, which is not persistent across relabels. Replaced it with `semanage fcontext` and `restorecon`, and added the required SELinux management package.

## Review Notes
The post assumes RHEL 9 because it uses `remi-release-9.rpm` and RHEL 9 repository names. The Drupal 10 PHP, MySQL, Composer, Apache document root, firewall, and PHP configuration examples are otherwise consistent with the consulted documentation.

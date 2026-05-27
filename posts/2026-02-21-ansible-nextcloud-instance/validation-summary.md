# Validation Summary: How to Use Ansible to Set Up a Nextcloud Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nextcloud
- MariaDB/MySQL
- Redis
- PHP-FPM
- Nginx
- Certbot/Let's Encrypt

## Sources Consulted
- Nextcloud Administration Manual: command-line installation: https://docs.nextcloud.com/server/latest/admin_manual/installation/command_line_installation.html
- Nextcloud Administration Manual: Nginx configuration: https://docs.nextcloud.com/server/latest/admin_manual/installation/nginx.html
- Nextcloud Administration Manual: memory caching and Redis: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/caching_configuration.html
- Nextcloud Administration Manual: occ command configuration syntax: https://docs.nextcloud.com/server/stable/admin_manual/occ_command.html
- Nextcloud Maintenance and Release Schedule: https://github.com/nextcloud/server/wiki/Maintenance-and-Release-Schedule
- Nextcloud Releases and PHP versions: https://github.com/nextcloud/server/wiki/Releases-and-PHP-versions
- Ansible ansible.mysql.mysql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible community.mysql/mysql_user module documentation and rename notice: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Certbot User Guide and command-line options: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- The post pinned Nextcloud `28.0.1`, which is end-of-life as of the 2026-05-27 review date. Updated the example to `33.0.3`, the current supported Nextcloud 33 maintenance release listed in the official schedule.
- The MySQL tasks used short module names and installed `python3-mysqldb`. Updated the tasks to use the current `ansible.mysql.mysql_db` and `ansible.mysql.mysql_user` FQCNs, added the documented Unix socket parameter for local MariaDB connections, and installed `python3-pymysql`, which the current Ansible MySQL module docs list as the Python dependency.
- The PHP package list did not explicitly install the PHP CLI binary even though the playbook uses `php occ` and a `php -f` cron job. Added `php{{ nextcloud_php_version }}-cli`.
- The Redis cache class names were over-escaped for YAML single-quoted strings. Changed them to single backslash values so `occ config:system:set` receives `\OC\Memcache\APCu` and `\OC\Memcache\Redis`.
- The Nginx template was missing several current Nextcloud webroot routing and header directives, including the front-controller fallback, expanded `/.well-known` handling, `front_controller_active`, and the `/remote` redirect. Updated the snippet to align with Nextcloud's current Nginx guidance while keeping the post's compact template format.

## Review Notes
- PHP 8.2 is still supported for Nextcloud 33 according to the official PHP version matrix, so the PHP version default remains valid.
- The Certbot command flags are current, but a production role should also handle renewal testing and email address customization outside this minimal tutorial.

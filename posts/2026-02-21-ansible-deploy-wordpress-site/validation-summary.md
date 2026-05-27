# Validation Summary: How to Use Ansible to Deploy a WordPress Site

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Vault
- WordPress
- WP-CLI
- MySQL
- PHP-FPM
- Nginx
- Ubuntu package management

## Sources Consulted
- Ansible `community.mysql.mysql_user` module documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/index.html
- Ansible logging and `no_log` documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- WP-CLI `wp core download` documentation: https://developer.wordpress.org/cli/commands/core/download/
- WP-CLI `wp core install` documentation: https://developer.wordpress.org/cli/commands/core/install/
- WordPress `wp-config.php` documentation: https://developer.wordpress.org/apis/wp-config-php/
- WordPress HTTPS administration documentation: https://developer.wordpress.org/advanced-administration/security/https/
- WordPress hardening documentation: https://developer.wordpress.org/advanced-administration/security/hardening/
- Nginx `try_files` documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html

## Issues Found
- The `wp-config.php.j2` template referenced eight vault variables for WordPress authentication keys and salts that were not shown in `vault.yml`. Added matching placeholder variables so the template can render.
- The MySQL tasks switched from local socket authentication to root password authentication after setting the root password. On Ubuntu MySQL deployments, local socket authentication is the documented and more reliable method for local administrative tasks. Updated the database, user, anonymous-user removal, and test-database removal tasks to use `login_unix_socket`.
- Password-bearing MySQL and WP-CLI tasks could expose secrets in Ansible output or logs. Added `no_log: true` to tasks that include root, database, or WordPress admin passwords.
- The WordPress install command used `--url=https://{{ wp_domain }}` and the template forced `FORCE_SSL_ADMIN`, but the shown Nginx virtual host only listened on port 80 and did not configure TLS. Changed the initial install URL to HTTP, removed the unconditional `FORCE_SSL_ADMIN` constant, and noted enabling it after SSL is added.
- The task that inserts `DISALLOW_FILE_EDIT` targeted the standard `/* That's all... */` marker, but the shown template did not include that marker. Added the standard marker before the `ABSPATH` block so the insertion lands before WordPress loads settings.
- The wrap-up described the deployment as production-ready while SSL was explicitly left as future work. Adjusted the wording to describe it as an automated deployment baseline instead.

## Review Notes
- The snippets use short Ansible module names, which can work in many playbooks but the current Ansible documentation recommends fully qualified collection names for clarity and to avoid collection name conflicts.
- The WP-CLI download URL matches the WP-CLI project's published PHAR location, but a future improvement would be to pin or verify the download with a checksum.
- The Nginx configuration is suitable as a basic WordPress server block, but a complete production deployment should add TLS, redirects, backups, monitoring, and update strategy details.

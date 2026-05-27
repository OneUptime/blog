# Validation Summary: How to Use Ansible to Set Up a MediaWiki Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MediaWiki
- MariaDB/MySQL
- PHP-FPM
- Nginx
- Certbot/Let's Encrypt
- GNU find
- Cron

## Sources Consulted
- MediaWiki version lifecycle: https://www.mediawiki.org/wiki/Version_lifecycle
- MediaWiki 1.45 release notes/download information: https://www.mediawiki.org/wiki/MediaWiki_1.45
- MediaWiki installation requirements: https://www.mediawiki.org/wiki/Manual:Installation_requirements
- MediaWiki install.php documentation: https://www.mediawiki.org/wiki/Manual:Install.php
- MediaWiki maintenance scripts documentation: https://www.mediawiki.org/wiki/Manual:Maintenance_scripts
- MediaWiki VisualEditor extension documentation: https://www.mediawiki.org/wiki/Extension:VisualEditor
- MediaWiki SyntaxHighlight extension documentation: https://www.mediawiki.org/wiki/Extension:SyntaxHighlight
- MediaWiki Nginx short URL configuration guidance: https://www.mediawiki.org/wiki/Manual:Short_URL/Page_title_-_nginx,_Root_Access,_PHP_as_a_CGI_module
- Ansible ansible.mysql.mysql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible ansible.mysql.mysql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_user_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Nginx try_files documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- Local GNU find help output for `-mindepth`, `-maxdepth`, and `-mtime`.

## Issues Found
- The post pinned MediaWiki 1.41.0, which is end-of-life. Updated the defaults to MediaWiki 1.45.3, the current stable release identified in official MediaWiki documentation.
- The installer command used `php maintenance/install.php`. Since MediaWiki 1.40, maintenance scripts should be invoked through `maintenance/run.php`, so the command now uses `php maintenance/run.php install`.
- The MariaDB tasks used unqualified `mysql_db` and `mysql_user` module names. Updated them to `ansible.mysql.mysql_db` and `ansible.mysql.mysql_user`, and added `login_unix_socket` for the default MariaDB socket on Debian/Ubuntu systems.
- The Nginx PHP location did not check that requested PHP files exist before passing them to PHP-FPM. Added `try_files $uri @rewrite;`.
- The Nginx configuration exposed sensitive MediaWiki directories and files from a document root pointed at the MediaWiki install directory. Added deny rules for `maintenance`, `includes`, `vendor`, `LocalSettings.php`, and Composer metadata.
- The backup cleanup command could delete `/opt/mediawiki-backups` itself after it aged past 14 days. Added `-mindepth 1` so only dated child backup directories are removed.
- The running instructions used external Ansible collections but did not install them. Added an `ansible-galaxy collection install ansible.mysql community.general` command before running the playbook.
- The text called the Ansible role a module. Changed that wording to "role".
- The infrastructure example used `community.general.ufw`, whose official requirements include the `ufw` package, but the package list did not install it. Added `ufw`.
- The infrastructure example used `ansible.builtin.timezone`, but the current module namespace is `community.general.timezone`. Updated the task accordingly.

## Review Notes
The tutorial remains a simplified example. In production, credentials should be supplied through Vault or another secret manager, backups should include authenticated database dump options if root socket authentication is unavailable, and TLS issuance requires public DNS and inbound HTTP access for the target domain.

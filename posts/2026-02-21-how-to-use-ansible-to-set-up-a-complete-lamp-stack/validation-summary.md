# Validation Summary: How to Use Ansible to Set Up a Complete LAMP Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Apache HTTP Server
- MySQL
- PHP
- Ubuntu/Debian APT packages
- YAML
- Jinja2 templates
- Mermaid diagrams

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.apt_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.apache2_module` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apache2_module_module.html
- Ansible `community.mysql.mysql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `community.mysql.mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html
- Apache HTTP Server 2.4 `mod_headers` documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- PHP supported versions: https://www.php.net/supported-versions.php

## Issues Found
- The Apache role installed `libapache2-mod-php{{ php_version }}` even though the PHP role later edits `/etc/php/{{ php_version }}/apache2/php.ini`. Because the playbook runs the PHP role before the Apache role, the Apache PHP configuration file might not exist when the PHP settings task runs. I moved the Apache PHP module package into the PHP role and left the Apache role responsible for installing Apache and enabling modules.
- The Apache role referenced an `apache2.conf.j2` template that the tutorial never provided. I removed that task so the shown project no longer depends on an omitted file.
- The MySQL role referenced a `mysqld.cnf.j2` template and notified a `restart mysql` handler that the tutorial never provided. I removed that task so the role can run from the code shown.
- The PHP role installed PHP-FPM but the Apache configuration used mod_php and did not configure proxying to PHP-FPM. I removed the unused PHP-FPM package from the example and updated the architecture diagram from `mod_php / PHP-FPM` to `mod_php`.
- The test PHP page read `vault_mysql_app_password` directly instead of using the configured `mysql_users[0].password` value. I changed it to use the same user password variable that creates the database user.
- The introduction called the playbook production-ready while the tutorial deploys a diagnostic PHP page. I changed the wording to describe it as a reusable deployment.

## Review Notes
PHP 8.2 is still supported as of 2026-05-26, but it is in security support only until 2026-12-31 according to php.net. The example is Ubuntu/Debian-oriented because it uses APT packages, a PPA, Debian Apache helper commands, and Debian Apache paths.

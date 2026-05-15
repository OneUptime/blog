# Validation Summary: How to Deploy a LAMP Stack with Ansible on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible playbooks
- Apache HTTP Server
- PHP and PHP-FPM
- MariaDB
- firewalld
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing and using dynamic programming languages": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 9 documentation, "Configuring and using database servers": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters
- Ansible documentation, ansible.builtin.dnf module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation, ansible.posix.firewalld module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation, ansible.posix.seboolean module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible documentation, community.mysql.mysql_user module: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible documentation, community.mysql.mysql_db module: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html

## Issues Found
- The playbook set `php_version: "8.1"` but installed PHP with plain `dnf install php`. On RHEL 9, PHP 8.0 is provided by the non-modular `php` RPM package, while PHP 8.1 is provided by the `php:8.1` module stream. I added a DNF task to install `@php:{{ php_version }}` before installing the PHP packages.
- The playbook used `ansible.posix.firewalld` and `ansible.posix.seboolean` without ensuring their managed-host requirements were installed. I added `firewalld`, `python3-firewall`, and `python3-libsemanage` to the playbook's system dependency installation.
- The firewalld task used `immediate: true`, which requires the `firewalld` service to be running. I added a task to enable and start `firewalld` before opening HTTP and HTTPS services.

## Review Notes
- The playbook uses `community.mysql` and `ansible.posix` collection modules, so the Ansible control node must have those collections installed. This is correct for environments using the full `ansible` package, but users running only `ansible-core` may need to install the collections separately.
- The PHP-FPM socket path and RHEL 9 PHP-FPM behavior are consistent with Red Hat documentation, which describes PHP running through FastCGI Process Manager by default.

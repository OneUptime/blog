# Validation Summary: How to Use Ansible to Install MariaDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MariaDB
- Debian/Ubuntu APT repositories
- RHEL/Rocky Linux YUM/DNF repositories
- Linux systemd
- community.mysql Ansible collection

## Sources Consulted
- Ansible `apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `deb822_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible `community.mysql.mysql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `community.mysql.mysql_info` module documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_info_module.html
- MariaDB Package Repository Setup and Usage: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/mariadb-package-repository-setup-and-usage
- MariaDB Installing with YUM/DNF documentation: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/rpm/yum
- MariaDB `mariadb-secure-installation` documentation: https://mariadb.com/kb/en/mariadb-secure-installation/
- MariaDB server system variables documentation: https://mariadb.com/docs/server/server-management/variables-and-modes/server-system-variables
- MariaDB InnoDB system variables documentation: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables

## Issues Found
- The Debian/Ubuntu repository setup used `apt_key` plus `apt_repository`. Ansible documents that `apt_key` relies on deprecated `apt-key`, so the example was updated to use `deb822_repository` with `signed_by`.
- The APT repository URL always used the Ubuntu repository path, so it would be wrong for Debian hosts. The URL now uses `{{ ansible_distribution | lower }}` so Debian uses `/repo/debian` and Ubuntu uses `/repo/ubuntu`.
- The new `deb822_repository` task requires the Python Debian library on the managed host. Added `python3-debian` to the Debian/Ubuntu prerequisites.
- The RHEL/Rocky secure tasks inherited the Debian socket path. Added a RHEL fact override for `/var/lib/mysql/mysql.sock`, which matches common RPM-family MariaDB packaging.
- The post-installation configuration path was Debian-specific. Added `mariadb_config_file` with a Debian/Ubuntu default and a RHEL override of `/etc/my.cnf.d/99-custom.cnf`.
- The example playbook set `mariadb_bind_address`, but the configuration example did not apply it. Added `bind-address` and `port` to the sample server configuration.
- The tuning snippet included `innodb_flush_method = O_DIRECT`, which MariaDB documents as deprecated from MariaDB 11.0. Removed that line from the MariaDB 11.4 example.

## Review Notes
The `deb822_repository` module is available in ansible-core 2.15 and newer. The MariaDB repository URLs and signing key URL were checked for plausibility, including live HTTP responses for Ubuntu, Debian, and RHEL 11.4 repository metadata.

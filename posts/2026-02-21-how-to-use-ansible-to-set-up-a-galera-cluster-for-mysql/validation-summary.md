# Validation Summary: How to Use Ansible to Set Up a Galera Cluster for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MariaDB
- Galera Cluster
- MariaDB Backup / mariabackup SST
- MySQL/MariaDB user management
- YAML
- Jinja2 templates

## Sources Consulted
- MariaDB documentation: Getting Started with MariaDB Galera Cluster, https://mariadb.com/docs/galera-cluster/galera-management/installation-and-deployment/getting-started-with-mariadb-galera-cluster
- MariaDB documentation: Configuring MariaDB Galera Cluster, https://mariadb.com/docs/galera-cluster/galera-management/configuration/configuring-mariadb-galera-cluster
- MariaDB documentation: Galera Cluster Address, https://mariadb.com/docs/galera-cluster/galera-management/configuration/galera-cluster-address
- MariaDB documentation: mariadb-backup SST Method, https://mariadb.com/docs/galera-cluster/high-availability/state-snapshot-transfers-ssts-in-galera-cluster/mariadb-backup-sst-method
- MariaDB documentation: Understanding Quorum, Monitoring, and Recovery, https://mariadb.com/docs/galera-cluster/high-availability/understanding-quorum-monitoring-and-recovery
- Ansible documentation: ansible.builtin.import_playbook, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible documentation: ansible.builtin.apt, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: community.mysql.mysql_user, https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html

## Issues Found
- The opening explanation said Galera has "no split-brain scenarios." This was too absolute. Updated it to explain that Galera's quorum model helps prevent split-brain by allowing only a Primary Component to process writes.
- The inventory variables included `mariadb_version: "10.11"`, but the playbook did not use that variable to configure repositories or package versions. Removed the unused variable so the example does not imply version pinning that is not implemented.
- The package list configured `wsrep_sst_method=mariabackup` but did not install `socat`, which MariaDB documents as required for the mariadb-backup SST method. Added `socat` to the installed packages.
- The SST user privileges used `REPLICATION CLIENT`. For MariaDB 10.11 mariadb-backup SST manual user configuration, MariaDB documents `BINLOG MONITOR` with `RELOAD`, `PROCESS`, and `LOCK TABLES`. Updated the privilege string accordingly.
- The Galera verification commands used `SHOW STATUS` for wsrep variables. MariaDB documentation uses `SHOW GLOBAL STATUS` for Galera wsrep status variables. Updated the cluster sync and verification commands to use `SHOW GLOBAL STATUS`.

## Review Notes
Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`. The snippets were reviewed manually against official Ansible and MariaDB/Galera documentation. The tutorial remains a simplified deployment example; a production version should also document firewall ports, repository setup for specific MariaDB versions, credential handling for `wsrep_sst_auth`, and load balancing/client routing.

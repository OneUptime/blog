# Validation Summary: How to Set Up Galera Cluster for MySQL on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- MariaDB Server
- Galera Cluster / Galera 4
- HAProxy
- UFW
- MariaDB Backup / mariabackup
- Percona Toolkit pt-heartbeat
- Bash
- SQL

## Sources Consulted
- MariaDB Galera Cluster configuration documentation: https://mariadb.com/docs/galera-cluster/galera-management/configuration/configuring-mariadb-galera-cluster
- MariaDB Galera Cluster system variables documentation: https://mariadb.com/docs/galera-cluster/reference/galera-cluster-system-variables
- MariaDB `wsrep_provider_options` documentation: https://mariadb.com/docs/galera-cluster/reference/wsrep-variable-details/wsrep_provider_options
- MariaDB mariadb-backup SST method documentation: https://mariadb.com/docs/galera-cluster/high-availability/state-snapshot-transfers-ssts-in-galera-cluster/mariadb-backup-sst-method
- MariaDB full backup and restore documentation: https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/full-backup-and-restore-with-mariadb-backup
- HAProxy health check documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Ubuntu package contents for `galera-4`, `galera-arbitrator-4`, and `mariadb-backup` via `apt download` and `dpkg-deb -c`

## Issues Found
- The post overstated Galera consistency by saying all nodes have the same data at any given moment and that there is no replication delay. Updated the explanation to describe virtually synchronous certification, global transaction ordering, and the possibility of apply queues unless causal reads are enforced.
- The InnoDB configuration used `innodb_flush_log_at_trx_commit=2` while describing commit-time flushing for durability. Changed the examples to `innodb_flush_log_at_trx_commit=1`, which matches the durability comment and MariaDB Galera guidance.
- The InnoDB doublewrite comment said the setting disabled the doublewrite buffer while the value `innodb_doublewrite=1` enabled it. Updated the comment to say the doublewrite buffer remains enabled for crash recovery.
- The HAProxy install guidance said HAProxy could run on a database node while binding to port 3306, which would conflict with MariaDB on that same IP and port. Added a caveat to use a separate server or a different bind IP/frontend port.
- The `wsrep_provider_options` quorum examples used multiline quoted values with inline comments. MariaDB documents this option as a semicolon-separated list on a single line, so the examples were changed to one-line values.
- The flow-control tuning example used deprecated `gcs.fc_master_slave`. Replaced it with `gcs.fc_single_primary`, which is the current Galera 4 option.
- The garbd configuration path used `/etc/default/garbd`, but Ubuntu's `galera-arbitrator-4` package ships `/etc/default/garb`. Updated the path.
- The restore script used `sudo rm -rf "${MYSQL_DATA}/*"`, which quotes the glob and would not empty the data directory. Changed it to `sudo rm -rf "${MYSQL_DATA:?}/"*`.

## Review Notes
- The Galera provider path `/usr/lib/galera/libgalera_smm.so` is valid on current Ubuntu because `galera-4` ships it as a symlink to `/usr/lib/libgalera_smm.so`.
- The `mariadb-backup` package on current Ubuntu still provides `mariabackup` as a symlink, so the post's backup commands remain valid.
- The tutorial is technically relevant and contains substantial commands, SQL, and configuration snippets, so it was reviewed as a code/implementation guide.

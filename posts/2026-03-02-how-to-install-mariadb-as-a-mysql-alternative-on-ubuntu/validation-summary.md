# Validation Summary: How to Install MariaDB as a MySQL Alternative on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- MariaDB Server (11.4 LTS referenced)
- MySQL 8 (for comparison/migration)
- Ubuntu (apt package management, systemd)
- InnoDB storage engine
- Aria storage engine
- Galera Cluster (mentioned)
- System-Versioned Tables (MariaDB temporal tables)
- Dynamic Columns
- mysqldump (for migration)

## Sources Consulted
- [MariaDB Package Repository Setup and Usage](https://mariadb.com/docs/server/release-notes/mariadb_es_repo_setup/)
- [MariaDB InnoDB Buffer Pool documentation](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-buffer-pool)
- [MariaDB InnoDB System Variables](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables)
- [MariaDB `mariadb-secure-installation` docs](https://mariadb.com/kb/en/mariadb-secure-installation/)
- [MariaDB System-Versioned Tables docs](https://mariadb.com/kb/en/system-versioned-tables/)
- [MariaDB Dynamic Columns docs](https://mariadb.com/kb/en/dynamic-columns/)
- [MariaDB Aria Storage Engine docs](https://mariadb.com/kb/en/aria-storage-engine/)
- MariaDB downloads page (https://mariadb.org/download/)

## Issues Found
1. **Invalid SHA256 checksum on `mariadb_repo_setup`** — The post included `echo "6948ead6d5a7d9516b1e3fba66b16fbc1a3b1ac3  mariadb_repo_setup" | sha256sum -c -`. The given hash is only 40 hex characters (SHA-1 length), so `sha256sum -c -` would always fail on it. The actual published SHA-256 also changes whenever MariaDB rebuilds the script. Replaced the hard-coded line with a commented placeholder that directs the reader to fetch the current SHA-256 from MariaDB's official "MariaDB Package Repository Setup and Usage" documentation. Also updated the download URL from the legacy `downloads.mariadb.com/MariaDB/mariadb_repo_setup` to the current canonical `r.mariadb.com/downloads/mariadb_repo_setup` (the old path still redirects, but the new one is what MariaDB documents today).

2. **Deprecated/removed `innodb_buffer_pool_instances` recommendation** — The configuration example set `innodb_buffer_pool_instances = 2`. Per MariaDB documentation, this variable is deprecated and ignored from MariaDB 10.5.1 and was removed entirely in MariaDB 10.6. Since the post explicitly recommends MariaDB 11.4 (LTS) and ships an Ubuntu repo install that delivers 10.6+, recommending this option is misleading. Removed the variable and its accompanying comment.

## Review Notes
- `expire_logs_days = 7` still works in MariaDB 11.x but is deprecated in favor of `binlog_expire_logs_seconds`. Left as-is because the directive remains functional and the existing form is widely used in production configs.
- The historical claim that MariaDB started as a fork in 2009 "when Oracle acquired Sun Microsystems" is approximately right — the Oracle/Sun acquisition was announced in April 2009 and closed in January 2010, and MariaDB was founded in 2009 in response. Acceptable as a high-level summary.
- `mysql --version` resolving to MariaDB is accurate on Ubuntu, where the `mysql` client is provided by the `mariadb-client` package as a compatibility wrapper.
- Default authentication for the `root@localhost` account is indeed `unix_socket` on Debian/Ubuntu MariaDB packages, so the `sudo mariadb` / `sudo mysql` instructions are correct.
- The Dynamic Columns example (`COLUMN_CREATE` / `COLUMN_GET`) and System-Versioned Tables syntax (`WITH SYSTEM VERSIONING`, `FOR SYSTEM_TIME AS OF`) match the MariaDB Knowledge Base.
- Configuration paths under `/etc/mysql/mariadb.conf.d/` are correct for the Debian/Ubuntu packaging of MariaDB.

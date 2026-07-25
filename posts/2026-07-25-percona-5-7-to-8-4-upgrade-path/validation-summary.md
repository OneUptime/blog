# Validation Summary: Percona Server 5.7 to 8.4: Why You Must Upgrade Through MySQL 8.0

## Status

validated

## Post Type

Technical upgrade guide

## Technologies Covered

- Percona Server for MySQL 5.7, 8.0, and 8.4 LTS
- MySQL Server upgrade and downgrade paths
- MySQL Shell Upgrade Checker Utility
- MySQL asynchronous replication and GTIDs
- MySQL authentication plugins
- MySQL backups, restores, and side-by-side migrations

## Sources Consulted

- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL 8.0 upgrade paths](https://dev.mysql.com/doc/refman/8.0/en/upgrade-paths.html)
- [MySQL Innovation and LTS release model](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html)
- [Percona Server 5.7 to 8.0 upgrade overview](https://docs.percona.com/percona-server/8.0/upgrade.html)
- [Percona Server 5.7 to 8.0 in-place upgrade guide](https://docs.percona.com/percona-server/8.0/in-place-upgrade-guide.html)
- [Percona Server 8.0 to 8.4 upgrade overview](https://docs.percona.com/percona-server/8.4/upgrade.html)
- [Percona Server 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [Percona Server 8.4 upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [MySQL Shell Upgrade Checker Utility](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html)
- [MySQL 8.0 upgrade prerequisites](https://dev.mysql.com/doc/refman/8.0/en/upgrade-prerequisites.html)
- [MySQL 8.4 upgrade prerequisites](https://dev.mysql.com/doc/refman/8.4/en/upgrade-prerequisites.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL upgrading or downgrading a replication topology](https://dev.mysql.com/doc/refman/8.4/en/replication-upgrade.html)
- [MySQL 8.4 downgrade paths](https://dev.mysql.com/doc/refman/8.4/en/downgrading.html)
- [Percona Server 8.4 downgrade options](https://docs.percona.com/percona-server/8.4/downgrade.html)
- [MySQL native pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- [MySQL automatic upgrade behavior and `mysql_upgrade`](https://dev.mysql.com/doc/refman/8.0/en/mysql-upgrade.html)
- [Percona release lifecycle overview](https://www.percona.com/release-lifecycle-overview/)

## Issues Found

- The post called MySQL 8.0 an LTS series. The current MySQL upgrade-path documentation classifies 8.0 as the predecessor bugfix series and 8.4 as the LTS series. The wording was corrected.
- The upgrade diagram and preparation text referred to a "supported" 5.7 release even though Percona Server 5.7 is EOL, and Percona Server 8.0 is also EOL as of publication. The wording now refers to applicable GA releases and explains that 8.0 is a required compatibility hop rather than a new steady state.
- The MySQL Shell examples omitted the account privileges and option-file path needed for a complete check. The required `RELOAD`, `PROCESS`, and `SELECT` privileges were documented, `configPath` was added to both examples, and the MySQL 5.7 requirement for the `sysVarsNewDefaults` check was noted.
- The rollback discussion stated categorically that replication from 8.4 to 8.0 is unsupported. Current MySQL and Percona documentation permits logical dump/load or replication from 8.4 to 8.0 only as a rollback-only downgrade method when no new server functionality has been applied to the data. The post now distinguishes this constrained exception from the unsupported newer-source-to-older-replica direction during a standard rolling upgrade, and links to the official downgrade documentation.

## Review Notes

- The baseline SQL queries, native-password account inventory query, and `SET GLOBAL innodb_fast_shutdown = 0` statement are syntactically valid for the releases where the post uses them.
- Automatic server-side upgrade work and the guidance not to invoke `mysql_upgrade` for current 8.0 targets are correct; the server took over those tasks in MySQL 8.0.16.
- The `8.0.x` and `8.4.x` values are explicit placeholders. Operators must replace them with exact targets supported by their installed MySQL Shell version. The example `/etc/mysql/my.cnf` path must likewise be adapted to the server.
- The replica-first, bottom-up rolling order and the side-by-side cutover guidance match the official MySQL and Percona procedures.

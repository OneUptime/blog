# Validation Summary: Percona Server vs Oracle MySQL: Is It a Drop-In Replacement?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Percona Server for MySQL 8.4
- Oracle MySQL 5.7, 8.0, and 8.4
- MySQL client/server protocol, SQL, InnoDB, plugins, and components
- MySQL GTID replication, upgrades, cutover, and rollback
- Percona MyRocks, thread pool, user statistics, encryption, and telemetry
- Ubuntu and Debian APT package management

## Sources Consulted

- [Percona Server for MySQL 8.4 documentation](https://docs.percona.com/percona-server/8.4/index.html)
- [Percona Server and MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [Percona Server version numbers](https://docs.percona.com/percona-server/8.4/server-version-numbers.html)
- [Percona Server 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
- [Percona Server APT repository instructions](https://docs.percona.com/percona-server/8.4/apt-repo.html)
- [Percona Server DEB package list](https://docs.percona.com/percona-server/8.4/apt-files.html)
- [Percona Server user statistics](https://docs.percona.com/percona-server/8.4/user-stats.html)
- [Percona Server thread pool](https://docs.percona.com/percona-server/8.4/threadpool.html)
- [Percona Server telemetry and data collection](https://docs.percona.com/percona-server/8.4/telemetry.html)
- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL 8.4 native pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- [Changes in MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/upgrading-from-previous-series.html)
- [MySQL 8.4 downgrade paths](https://dev.mysql.com/doc/refman/8.4/en/downgrading.html)
- [Performance Schema system variable tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variable-tables.html)
- [MySQL functions used with GTIDs](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html)

## Issues Found

- The post twice stated that MySQL does not support replication from a later-release source to an earlier-release replica. The MySQL 8.4 documentation says this direction might work in limited cases, particularly with compatible row-based events, but is generally not supported. Both statements were changed to preserve the warning without presenting the rule as absolute.

## Review Notes

- The cited `8.4.10-10` example is current for the validation date. Percona released it on June 30, 2026, based on MySQL 8.4.10 and including MySQL 8.4.9 fixes.
- The SQL inventory queries use valid MySQL 8.4 variables and metadata tables. The APT inspection and simulation commands use valid package names and options.
- Percona's installation-time and continuous telemetry systems are optional but enabled by default and require separate opt-out controls, consistent with the post's warning.
- MySQL 8.4 disables `mysql_native_password` by default and removes deprecated replication statements that use older master/slave terminology, as described in the post.
- The 5.7 to 8.4 path is correctly presented as two upgrades: 5.7 to 8.0, then 8.0 to 8.4.

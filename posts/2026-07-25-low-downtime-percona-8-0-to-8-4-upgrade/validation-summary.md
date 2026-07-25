# Validation Summary: How to Plan a Low-Downtime Percona Server 8.0-to-8.4 Upgrade with Replicas

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Percona Server for MySQL 8.0 and 8.4 LTS
- MySQL asynchronous replication
- Global Transaction Identifiers (GTIDs) and GTID auto-positioning
- MySQL Shell Upgrade Checker
- MySQL authentication plugins
- TLS-secured replication
- systemd service and journal management
- High-availability source fencing and replica promotion

## Sources Consulted
- [Percona Server 8.0 to 8.4 upgrade overview](https://docs.percona.com/percona-server/8.4/upgrade.html)
- [Percona Server 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [Percona Server 8.4 upgrade procedures](https://docs.percona.com/percona-server/8.4/upgrade-procedures.html)
- [Percona Server upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [Percona Server MySQL upgrade paths and supported methods](https://docs.percona.com/percona-server/8.4/mysql-upgrade-paths.html)
- [Percona Server breaking and incompatible changes in 8.4](https://docs.percona.com/percona-server/8.4/8.4-breaking-changes.html)
- [Percona Server compatibility and removed items in 8.4](https://docs.percona.com/percona-server/8.4/8.4-compatibility-and-removed-items.html)
- [Percona Server defaults and tuning guidance for 8.4](https://docs.percona.com/percona-server/8.4/8.4-defaults-and-tuning.html)
- [Percona Server authentication methods](https://docs.percona.com/percona-server/8.4/authentication-methods.html)
- [Percona Server plugin-to-component upgrade guidance](https://docs.percona.com/percona-server/8.4/upgrade-components.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL upgrading or downgrading a replication topology](https://dev.mysql.com/doc/refman/8.4/en/replication-upgrade.html)
- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL Shell Upgrade Checker Utility](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html)
- [MySQL GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html#function_wait-for-executed-gtid-set)
- [MySQL `CHANGE REPLICATION SOURCE TO`](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [systemd `journalctl`](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)

## Issues Found
- The cutover procedure used `WAIT_FOR_EXECUTED_GTID_SET()` and `SOURCE_AUTO_POSITION=1` without explicitly requiring a GTID-enabled topology. Added an entry criterion requiring `GTID_MODE=ON` on every node for this procedure, or a separate file/position cutover runbook. This prevents readers with file/position replication from attempting commands whose documented prerequisites are not met.

## Review Notes
- The rolling order is correct: upgrade the farthest replicas first, upgrade every replica before promotion, and keep the writable source on 8.0 until no 8.0 replica remains downstream.
- `WAIT_FOR_EXECUTED_GTID_SET()` returns `0` on success and `1` on timeout; operators should treat only `0` as successful catch-up.
- The unqualified examples are suitable for a single default replication channel. Multi-source deployments must apply lifecycle and source-change commands to the intended channel with `FOR CHANNEL` and validate every channel separately.
- `SOURCE_SSL_VERIFY_SERVER_CERT=1` is valid in MySQL 8.4 and requires the certificate identity to match `SOURCE_HOST`, as the post's TLS-identity validation implies.
- All external documentation links in the post resolved to the intended official Percona or MySQL pages at review time.

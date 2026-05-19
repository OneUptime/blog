# Validation Summary: How to Configure Cross-Site Replication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- PostgreSQL 14 streaming replication
- PostgreSQL WAL archiving and recovery settings
- WireGuard VPN
- Linux traffic control (`tc`)
- Bash monitoring scripts

## Sources Consulted
- PostgreSQL 14 documentation: Replication configuration - https://www.postgresql.org/docs/14/runtime-config-replication.html
- PostgreSQL 14 documentation: Log-shipping standby servers and streaming replication - https://www.postgresql.org/docs/14/warm-standby.html
- PostgreSQL 14 documentation: `pg_hba.conf` authentication methods - https://www.postgresql.org/docs/14/auth-pg-hba-conf.html
- PostgreSQL 14 documentation: Monitoring statistics and `pg_stat_wal_receiver` - https://www.postgresql.org/docs/14/monitoring-stats.html
- PostgreSQL 14 documentation: `pg_ctl promote` - https://www.postgresql.org/docs/14/app-pg-ctl.html
- WireGuard official quick start - https://www.wireguard.com/quickstart/
- Linux `tc-tbf(8)` manual page - https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- GitHub profile link for the author - https://github.com/nawazdhandala

## Issues Found
- The split-brain description implied that both PostgreSQL sites continue accepting writes automatically when the WAN link fails. Updated it to clarify that a physical standby remains read-only unless promoted, and that split-brain occurs when a promoted standby and the old primary both accept writes.
- The WireGuard key generation commands wrote directly to `/etc/wireguard` without `sudo`, which would fail for a normal user. Added creation of the directory with secure permissions and used `sudo tee`/`sudo chmod`.
- The WireGuard example included forwarding and NAT rules even though the PostgreSQL example connects directly between WireGuard interface addresses. Removed the unnecessary rules.
- The primary PostgreSQL configuration omitted `listen_addresses`, so the standby might not be able to connect over the VPN. Added the VPN address to the setting.
- The post referenced a replication user but did not create it. Added a `CREATE ROLE ... WITH REPLICATION LOGIN` command.
- The `pg_hba.conf` example used `md5`; for PostgreSQL 14, changed it to `scram-sha-256` to match current password authentication guidance.
- The standby setup omitted the `standby.signal` file required by modern PostgreSQL standby configuration. Added the command to create it and changed the edited config path to the Debian/Ubuntu PostgreSQL config path.
- The `restore_command` was changed so it checks for the archived WAL file before copying, matching PostgreSQL's requirement that missing archive files return immediately.
- The `hot_standby_feedback` comment incorrectly said it slows down feedback to reduce primary overhead. Updated it to explain that it reduces standby query conflicts but can cause bloat on the primary.
- The network partition section implied a standby keeps operating with data independently. Updated it to clarify that it remains read-only and stops receiving new WAL until connectivity returns.
- The `tc` example attempted to throttle WAL receiver traffic on the standby, which would not limit inbound WAL traffic. Replaced it with a `tc tbf` example applied to outbound WireGuard traffic on the primary.
- The WAL archive command could overwrite an existing remote WAL archive file. Added `--ignore-existing` to avoid overwriting archived WAL files.

## Review Notes
The post is now technically valid as a practical PostgreSQL 14 cross-site streaming replication guide. Future improvements could include adding a complete `pg_basebackup` example, showing replication slots as an alternative to `wal_keep_size`, and recommending a tested failover manager or fencing mechanism for production automated failover.

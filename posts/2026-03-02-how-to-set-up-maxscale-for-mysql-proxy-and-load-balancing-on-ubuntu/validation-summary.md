# Validation Summary: How to Set Up MaxScale for MySQL Proxy and Load Balancing on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation & Configuration Guide

## Technologies Covered
- MariaDB MaxScale (database proxy / load balancer)
- MariaDB / MySQL replication (primary + replicas)
- `mariadbmon` monitor module (auto_failover, auto_rejoin, switchover)
- `readwritesplit` router (read/write splitting, slave selection)
- `readconnroute` router (read-only listener)
- `MariaDBClient` / `MariaDBBackend` protocols
- `maxctrl` admin CLI
- Ubuntu (apt, systemd)
- TLS/SSL between MaxScale and backend servers
- MariaDB official package repository (`r.mariadb.com`)

## Sources Consulted
- MaxScale 24.02 Configuration Guide: https://mariadb.com/docs/maxscale/maxscale-archive/archive/mariadb-maxscale-24-02/maxscale-24-02getting-started/mariadb-maxscale-2402-maxscale-2402-mariadb-maxscale-configuration-guide
- MaxScale 24.02 MariaDB Monitor (`mariadbmon`): https://mariadb.com/docs/maxscale/maxscale-archive/archive/mariadb-maxscale-24-02/maxscale-24-02monitors/mariadb-maxscale-2402-maxscale-2402-mariadb-monitor
- MaxScale 24.02 Hintfilter (routing hints): https://mariadb.com/docs/maxscale/maxscale-archive/archive/mariadb-maxscale-24-02/maxscale-24-02filters/mariadb-maxscale-2402-maxscale-2402-hintfilter
- MaxScale 23.08 readwritesplit reference: https://mariadb.com/kb/en/mariadb-maxscale-2308-readwritesplit/
- MariaDB Package Repository Setup and Usage: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/mariadb-package-repository-setup-and-usage
- `maxctrl` reference (server maintenance, alter maxscale, show/list commands)

## Issues Found
1. **Wrong CLI flag for configuration validation** — The post used `sudo maxscale --configtest`. The MaxScale binary does not have a `--configtest` option; the correct flag is `--config-check` (short form `-c`). Running `--configtest` would fail with an unrecognized-option error. Updated the command to `sudo maxscale --config-check`.

2. **Invalid `[maxscale]` parameter `log_error=true`** — Errors in MaxScale are always written to the log; there is no `log_error` toggle. Only `log_info`, `log_warning`, `log_notice`, and `log_debug` are valid boolean toggles in the `[maxscale]` global section. Removed the `log_error=true` line so the config doesn't trip an unknown-parameter warning.

3. **Monitor user grants insufficient for `auto_failover`** — The original `CREATE USER` block granted only `REPLICATION CLIENT`, but the same post enables `auto_failover=true`, `auto_rejoin=true`, `enforce_read_only_slaves=true`, and `switchover_timeout`. The `mariadbmon` module requires additional privileges to perform those operations (set `read_only`, change replication source, reload, read replica status, etc.). Expanded the grant to include `BINLOG ADMIN`, `READ_ONLY ADMIN`, `RELOAD`, `REPLICATION SLAVE ADMIN`, `REPLICATION SLAVE`, `REPLICATION CLIENT`, `PROCESS`, and `EVENT`, matching the documented privilege set for `mariadbmon` failover on modern MariaDB (10.5+).

4. **Incorrect routing-hint mechanism** — The "Force a read on primary" example used `SET @master_read=1;`, which is a fabricated mechanism — MaxScale does not inspect application session variables for routing. The documented way to force a query to the primary through `readwritesplit` is a comment-based hint (`-- maxscale route to master`, `# maxscale route to master`, or `/* maxscale route to master */`), and it requires the `hintfilter` to be loaded on the service. Replaced the example with the correct comment-based hint and noted the `hintfilter` requirement.

5. **`connection_timeout=10s` is not a valid readwritesplit service parameter** — The post included this in the connection-pool block. It is not a documented readwritesplit / service-level parameter; the equivalent client/idle timeout is typically managed via `wait_timeout` or session-level settings. Removed the line so the example config is accepted by MaxScale.

## Review Notes
- `enforce_read_only_slaves` is still a valid `mariadbmon` parameter in MaxScale 24.02 — it has *not* been renamed to `enforce_read_only_servers` (both exist as distinct parameters with different scope). Left as-is.
- The MariaDB repository setup URL `https://r.mariadb.com/downloads/mariadb_repo_setup` is the official short URL and is correct. Piping it into `sudo bash` works because the script accepts sensible defaults; users who want a specific MariaDB series can download the script first and pass `--mariadb-server-version`.
- `protocol=MariaDBBackend` and `protocol=MariaDBClient` are the current protocol module names (`MySQLBackend` / `MySQLClient` were renamed years ago). Correct.
- `monitor_interval=2000ms` uses the modern duration-suffix form accepted by MaxScale ≥ 2.3. Older releases required a bare millisecond integer, but for the versions this guide targets the suffix form is correct.
- `max_slave_connections=100%` and `slave_selection_criteria=LEAST_CURRENT_OPERATIONS` are valid readwritesplit parameters/values.
- `transaction_replay=true` and `transaction_replay_max_size=1Mi` are valid; the binary-prefix size suffix (`Mi`) is accepted.
- All `maxctrl` commands shown (`list servers`, `show service`, `list sessions`, `show maxscale`, `show filters`, `show server`, `set server <name> maintenance`, `clear server <name> maintenance`, `alter maxscale log_info true`) match current `maxctrl` syntax.
- The SSL block uses the current parameter names (`ssl=true`, `ssl_ca`, `ssl_cert`, `ssl_key`); modern MaxScale also accepts `ssl_version` and stricter verification options that the post does not cover, which is acceptable for an introductory guide.
- Future maintenance: terminology in MaxScale is gradually shifting from "master/slave" to "primary/replica" in CLI output and some parameter names. If MariaDB renames `enforce_read_only_slaves` or `slave_selection_criteria` in a later release, this post will need a small refresh.

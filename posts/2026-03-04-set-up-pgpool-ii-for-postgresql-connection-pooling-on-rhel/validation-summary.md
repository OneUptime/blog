# Validation Summary: How to Set Up pgpool-II for PostgreSQL Connection Pooling on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- PostgreSQL 16
- Pgpool-II 4.5
- DNF/RPM packages
- systemd
- firewalld
- Pgpool-II connection pooling, load balancing, authentication, health checks, and failover

## Sources Consulted
- Pgpool-II 4.5.0 RPM installation documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/install-rpm.html
- Pgpool-II 4.5.0 backend settings documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/runtime-config-backend-settings.html
- Pgpool-II 4.5.0 connection pooling documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/runtime-config-connection-pooling.html
- Pgpool-II 4.5.0 load balancing documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/runtime-config-load-balancing.html
- Pgpool-II 4.5.0 health check documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/runtime-config-health-check.html
- Pgpool-II 4.5.0 failover documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/runtime-config-failover.html
- Pgpool-II 4.5.0 pg_md5 documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/pg-md5.html
- Pgpool-II 4.5.0 SHOW POOL_NODES documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/sql-show-pool-nodes.html
- Pgpool-II 4.5.0 SHOW POOL_POOLS documentation: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/sql-show-pool-pools.html
- Pgpool-II official YUM repository listing: https://www.pgpool.net/yum/rpms/4.5/redhat/rhel-9-x86_64/
- Pgpool-II official cluster example for RPM paths and service usage: https://www.pgpool.net/docs/pgpool-II-4.5.0/en/html/example-cluster.html

## Issues Found
- The install command downloaded a single Pgpool-II binary RPM directly and described it as the PostgreSQL repository. Changed it to install the official Pgpool-II release repository RPM first, then install `pgpool-II-pg16`, matching the official RPM installation flow.
- The optional install command used generic package names that do not match the official Pgpool-II RPM package naming for PostgreSQL-version-specific builds. Changed it to `pgpool-II-pg16-extensions`.
- The PostgreSQL 16 data directory examples used `/var/lib/pgsql/data`, which does not match the PGDG PostgreSQL 16 RPM layout used by the selected Pgpool-II package. Changed them to `/var/lib/pgsql/16/data`.
- The load balancing text implied all SELECT queries are distributed. Changed it to "eligible SELECT queries" because Pgpool-II routes some SELECT statements to the primary depending on transaction state and query contents.
- The sequence function list omitted `lastval`. Added it because Pgpool-II documentation recommends treating `nextval`, `setval`, `lastval`, and `currval` as primary-routed functions to avoid load balancing sequence-related calls.
- The `pg_md5` commands omitted the explicit pgpool configuration file path. Added `--config-file=/etc/pgpool-II/pgpool.conf` / `-f /etc/pgpool-II/pgpool.conf` so `pool_passwd` is written relative to the intended RPM configuration.
- The failover script mapped `failover_command` placeholders incorrectly and assumed node 0 is always the primary. Updated the script to compare the failed node to `%P` and promote `%H` using `%R` when the old primary fails.
- The failover script used a generic `pg_ctl` path. Updated it to `/usr/pgsql-16/bin/pg_ctl`, matching PostgreSQL 16 RPM installations.
- The systemd unit was shown as `pgpool-II`, but Pgpool-II RPM examples use `pgpool.service`. Updated the command to `sudo systemctl enable --now pgpool.service`.
- The load balancing verification used `SHOW pool_node_id`, which is not a documented Pgpool-II SHOW command. Replaced it with repeated `SELECT 1` queries followed by `SHOW pool_nodes` to inspect `select_cnt` and `load_balance_node`.

## Review Notes
The article remains a compact setup guide. A production deployment would usually need more detail around SSH keys for failover, PCP authentication, watchdog/virtual IP design, replication slot handling, and secure password storage, but those are deployment-hardening topics rather than correctness errors in the corrected examples.

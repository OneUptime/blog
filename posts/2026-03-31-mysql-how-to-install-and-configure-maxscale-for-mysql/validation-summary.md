# Validation Summary: How to Install and Configure MaxScale for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MariaDB MaxScale (database proxy)
- MySQL / MariaDB replication
- readwritesplit router
- readconnroute router
- mariadbmon monitor
- maxctrl CLI
- systemd service management

## Sources Consulted
- MariaDB MaxScale 6 mariadbmon documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-mariadb-monitor/
- MariaDB MaxScale 6 readwritesplit documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-readwritesplit/
- MariaDB MaxScale 6 readconnroute documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-readconnroute/
- MariaDB MaxScale 6 configuration guide: https://mariadb.com/kb/en/mariadb-maxscale-6-configuration-guide/
- MariaDB repository setup documentation: https://mariadb.com/kb/en/mariadb-package-repository-setup-and-usage/

## Issues Found

1. **Monitor user grants incomplete for auto_failover** — The monitor user was granted `REPLICATION CLIENT, SUPER, RELOAD` but the configuration enables `auto_failover=true` and `auto_rejoin=true`, which require three additional privileges: `PROCESS` (to verify event scheduler status during failover), `SHOW DATABASES` (to list scheduled events across databases), and `EVENT` (to disable/enable scheduled events on the old and new primary during failover). Fixed by adding `PROCESS, SHOW DATABASES, EVENT` to the monitor user's global GRANT statement.

2. **MariaDB repository setup URL outdated** — The installation commands used `https://downloads.mariadb.com/MariaDB/mariadb_repo_setup`, which is the legacy URL. The current official URL is `https://r.mariadb.com/downloads/mariadb_repo_setup`. Updated both the Ubuntu/Debian and RHEL/CentOS installation sections.

## Review Notes
- The `SUPER` privilege is used for the monitor user, which is correct for MariaDB servers. For MySQL 8.0+ servers, `SUPER` is deprecated in favor of more granular dynamic privileges (e.g., `REPLICATION SLAVE ADMIN`, `CONNECTION ADMIN`), but the post does not claim MySQL 8.0 compatibility and MaxScale is a MariaDB product, so this is acceptable.
- The `master_accept_reads` parameter and `router_options=slave` still use legacy master/slave terminology. MaxScale documentation retains these parameter names even though the prose increasingly uses primary/replica. No change needed as these are the actual configuration parameter names.
- The post uses example passwords in plain text in the configuration file. In production, MaxScale supports encrypted passwords via `maxkeys` and `maxpasswd` utilities. This is acceptable for a tutorial but worth noting.
- The `readconnroute` section with `router_options=slave` is correct — valid values are `master`, `slave`, `synced`, and `running`.

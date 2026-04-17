# Validation Summary: How to Debug ClickHouse Server Startup Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse server
- systemd / systemctl
- Linux CLI tools: ss, lsof, df, xmllint, tail, find, chown
- XML configuration (config.xml, users.xml)

## Sources Consulted
- ClickHouse server source: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/Server.cpp
- ClickHouse shipped config: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- ClickHouse network ports reference: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse issue #7966 (feature request for `nginx -t`-style config validation): https://github.com/ClickHouse/ClickHouse/issues/7966
- Altinity KB on logging: https://kb.altinity.com/altinity-kb-setup-and-maintenance/logging/

## Issues Found
- **Incorrect `--check-config` flag.** The post recommended `clickhouse-server --config /etc/clickhouse-server/config.xml --check-config` as a way to validate configuration. The `clickhouse-server` binary does not implement `--check-config` (the CLI only documents `--help` and `--version`); feature request #7966 for this capability is still open as of 2026. Running the command fails or silently ignores the flag and starts the server. I removed the incorrect command and reworded the section to state that ClickHouse has no built-in validator, keeping the already-correct `xmllint` approach and adding `system.server_settings` as the way to verify applied values.

## Review Notes
- Default log paths (`/var/log/clickhouse-server/clickhouse-server.log` and `.err.log`), default ports (8123 HTTP, 9000 native TCP, 9009 interserver HTTP, 9440 TLS TCP), and the `clickhouse:clickhouse` owner are all correct for standard Debian/RPM package installs.
- The metadata section is directionally correct but slightly simplified: for modern `Atomic` databases (default since v20.10), table `.sql` files physically live under `/var/lib/clickhouse/store/<uuid-prefix>/<uuid>/`, and the files under `/var/lib/clickhouse/metadata/<db>/` are symlinks. The `find -size 0 -name "*.sql"` approach still works because it follows symlinks, so the guidance is not wrong — just worth knowing when investigating further.
- The advice to `rm` a metadata `.sql` file is a destructive workaround; readers should back up `/var/lib/clickhouse` before doing so. The post could be strengthened by mentioning `<force_restore_data>` or a backup step, but this is a stylistic suggestion rather than a technical error.

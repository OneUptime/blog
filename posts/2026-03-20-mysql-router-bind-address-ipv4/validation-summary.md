# Validation Summary: How to Configure MySQL Router bind_address for IPv4 Connection Routing

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Router 8.0+
- MySQL InnoDB Cluster
- MySQL Group Replication (GR)
- MySQL classic protocol and X Protocol
- systemd / systemctl
- `ss` (socket statistics)
- INI-format configuration files

## Sources Consulted
- MySQL Router 8.0 Reference Manual — Configuration File Options: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html
- MySQL Router 8.0 — Bootstrap section: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-bootstrap.html
- MySQL Router 8.0 — Routing Plugin: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html#mysql-router-conf-options-routing
- MySQL Router 8.0 — Metadata Cache Plugin: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html#mysql-router-conf-options-metadata-cache
- MySQL InnoDB Cluster docs: https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html

## Issues Found
No technical issues found.

Verified specifics:
- `bind_address` is a valid directive both in `[DEFAULT]` (as a global default for routing sections) and as a per-routing override.
- Default routing ports — 6446 (R/W classic), 6447 (R/O classic), 6448 (R/W X protocol) — match the MySQL Router conventions/bootstrap defaults.
- `routing_strategy` values used (`first-available`, `round-robin-with-fallback`) are valid; `round-robin-with-fallback` is the recommended default for read-only routing.
- `destinations = metadata-cache://<cluster>/?role=PRIMARY|SECONDARY` is the documented destinations URL format.
- `cluster_type = gr` is correct for a Group-Replication-based InnoDB Cluster.
- `auth_cache_ttl = -1` correctly disables expiration (cache never expires).
- `protocol = classic` and `protocol = x` are the only valid values.
- `mysqlrouter --bootstrap`, `--user`, `--conf-use-sockets`, and `--directory` flags are valid and current.

## Review Notes
- When using `mysqlrouter --bootstrap --directory /etc/mysqlrouter`, the bootstrap creates a self-contained deployment with its own `start.sh`/`stop.sh` scripts under that directory. The post then suggests `systemctl enable --now mysqlrouter`, which works only when a system-wide systemd unit (typically from the distro package) manages Router. This combination works in practice when MySQL Router is installed from a distribution package (the unit reads `/etc/mysqlrouter/mysqlrouter.conf` by default), but readers using a fully self-contained `--directory` install may need to use the generated `start.sh` or create a custom systemd unit. Not a technical error in the post, but worth being aware of.
- The Mermaid diagram uses `\n` for line breaks inside node labels. Mermaid renderers generally accept `\n` (it is rendered as a `<br/>` internally), so this is functional.
- Post targets MySQL Router 8.0+; configuration option names, plugin names, and ports are stable in 8.0. In MySQL 8.4 (LTS), the same config options remain valid.

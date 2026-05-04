# Validation Summary: How to Configure InfluxDB to Listen on IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- InfluxDB 1.x (TOML configuration)
- InfluxDB 2.x (YAML configuration, `influxd` daemon)
- IPv6 networking (bracket notation for addresses, `::` and `::1`)
- `influx` CLI (config create, write, query, bucket commands)
- `curl` HTTP testing (with `-6` flag)
- `ss` socket statistics tool
- `systemctl` service management
- Python `influxdb-client` library
- Flux query language

## Sources Consulted
- InfluxDB 2.x configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- InfluxDB 1.x configuration: https://docs.influxdata.com/influxdb/v1/administration/config/
- `influx config create` CLI reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/config/create/
- InfluxDB Python client docs: https://influxdb-client.readthedocs.io/en/stable/usage.html
- IPv6 bracket notation per RFC 3986 / RFC 2732 (literal IPv6 addresses in URLs)

## Issues Found
No technical issues found.

Verified items:
- InfluxDB 1.x `[http]` section uses `bind-address` key — correct.
- InfluxDB 1.x default config path `/etc/influxdb/influxdb.conf` on Linux — correct.
- InfluxDB 2.x YAML key `http-bind-address` — correct.
- `influxd` flags `--http-bind-address`, `--bolt-path`, `--engine-path` — all valid.
- IPv6 bracket-with-port format `[2001:db8::10]:8086` — correct per RFC 3986.
- `curl -6` flag forces IPv6 — correct.
- `ss -6 -tlnp` for listing IPv6 TCP listeners — correct.
- `/ping` returning `204 No Content` — matches InfluxDB documented behavior.
- `/api/v2/write` and `/api/v2/query` endpoints with `Authorization: Token <token>` header — correct.
- `Content-Type: application/vnd.flux` for raw Flux queries — correct.
- `influx config create` flags (`--config-name`, `--host-url`, `--org`, `--token`, `--active`) — all valid.
- Python `influxdb_client` imports and `SYNCHRONOUS` write option usage — correct.

## Review Notes
- The Python example imports `WriteOptions` but never uses it, and creates `write_api` twice (the second call overwrites the first with `SYNCHRONOUS` options). These are minor style/redundancy concerns, not technical errors, so left untouched per the "fix only what is wrong" instruction.
- The `2001:db8::/32` prefix used in examples is the documentation-only range from RFC 3849 — appropriate choice for a tutorial.
- The InfluxDB 2.x config file path comment (`/etc/influxdb/config.yml`) is shown as an example location; per docs, `influxd` actually searches the working directory by default and respects `INFLUXD_CONFIG_PATH`. The example path is a reasonable convention many users follow.
- For InfluxDB 2.x, listening on `[::]` will accept both IPv6 and IPv4-mapped connections on most Linux configurations (depends on `net.ipv6.bindv6only` sysctl); the post's "IPv4 and IPv6" comment in the 1.x section reflects this default behavior accurately.

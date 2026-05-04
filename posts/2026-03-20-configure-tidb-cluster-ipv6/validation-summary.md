# Validation Summary: How to Configure TiDB Cluster with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- TiDB (distributed MySQL-compatible SQL database, v7.5.0)
- TiKV (distributed key-value store)
- PD (Placement Driver)
- TiUP (TiDB deployment/management tool)
- IPv6 networking
- ip6tables (Linux IPv6 firewall)
- MySQL client / Python pymysql connection strings

## Sources Consulted
- TiDB 6.5.1 Release Notes (IPv6 support announcement): https://docs.pingcap.com/tidb/stable/release-6.5.1/
- TiUP Cluster Topology Reference: https://docs.pingcap.com/tidb/stable/tiup-cluster-topology-reference/
- PD Configuration File: https://docs.pingcap.com/tidb/stable/pd-configuration-file/
- TiKV Configuration File: https://docs.pingcap.com/tidb/stable/tikv-configuration-file/
- TiDB config.toml.example (release-7.5): https://github.com/pingcap/tidb/blob/release-7.5/pkg/config/config.toml.example
- TiUP Overview / Install: https://docs.pingcap.com/tidb/stable/tiup-overview/
- tiup cluster deploy reference: https://docs.pingcap.com/tidb/stable/tiup-component-cluster-deploy/
- TiDB Monitoring API: https://docs.pingcap.com/tidb/stable/tidb-monitoring-api/

## Issues Found
1. **Incorrect TiDB server (tidb.toml) configuration structure.** The post placed `host`, `port`, and `status-port` under a `[server]` section header, and used a `[pd]` section with `endpoints = [...]`. None of these match the actual TiDB configuration schema:
   - TiDB's `config.toml.example` has no `[server]` section. `host` and `port` are top-level keys.
   - `status-port` and `status-host` live under the `[status]` section.
   - TiDB does not use a `[pd]` section with an `endpoints` array. PD addresses are specified via the top-level `path` key (comma-separated host:port list) when `store = "tikv"`.

   **Fix applied:** Restructured the `tidb.toml` snippet to put `host`, `port`, `store`, and `path = "[2001:db8::1]:2379"` at the top level, and moved `status-port` under `[status]`. Verified against the upstream `pingcap/tidb` `release-7.5` `config.toml.example`.

All other checks passed:
- IPv6 support exists across PD, TiKV, and TiDB (added in TiDB 6.5.1, so v7.5.0 is well-covered).
- TiUP topology YAML (`pd_servers` with `client_port`/`peer_port`, `tikv_servers`/`tidb_servers` with `port`/`status_port`, dotted `config:` keys) is correct.
- PD `pd.toml` field names (`name`, `data-dir`, `client-urls`, `advertise-client-urls`, `peer-urls`, `advertise-peer-urls`, `initial-cluster`, `initial-cluster-state`) all match official docs.
- TiKV `tikv.toml` `[server]` (`addr`, `advertise-addr`, `status-addr`) and `[pd]` `endpoints` are correct.
- IPv6 bracketed URL/host:port notation (`[2001:db8::1]:2379`, `http://[2001:db8::1]:2379`) is RFC 3986 compliant and correct.
- Default ports (2379, 2380, 4000, 10080, 20160, 20180) match official defaults.
- TiUP install command, `tiup cluster deploy/start/display` syntax, and PD HTTP API paths (`/pd/api/v1/health`, `/pd/api/v1/stores`) are correct.
- TiDB status endpoint `/status` on port 10080 is correct.

## Review Notes
- IPv6 support across all TiDB components landed in v6.5.1; the post's choice of v7.5.0 is fully supported.
- The `--yes` flag on `tiup cluster deploy` works (auto-confirms prompts) though it isn't called out in the canonical command reference; this is acceptable common usage.
- For production, readers should consider deploying at least 3 PD nodes for Raft quorum; the topology example only shows 1 PD which works but is not HA. This is a stylistic/best-practice note rather than a technical error.

# Validation Summary: How to Set Up Collectd for System Statistics on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Collectd (system statistics collection daemon)
- Ubuntu (apt, systemd)
- RRDtool
- MySQL, Apache (mod_status), Nginx (stub_status) collectd plugins
- SMART / smartmontools
- InfluxDB 1.x (collectd UDP input)
- Graphite (write_graphite plugin)
- Prometheus (write_prometheus plugin)
- Collectd exec plugin (PUTVAL protocol)
- collectdctl (unixsock client)

## Sources Consulted
- [Plugin Write Prometheus — collectd wiki](https://github.com/collectd/collectd/wiki/Plugin-Write-Prometheus)
- [Plugin Write HTTP — collectd wiki](https://github.com/collectd/collectd/wiki/Plugin-Write-HTTP)
- [Plugin UnixSock — collectd wiki](https://github.com/collectd/collectd/wiki/Plugin-UnixSock)
- [collectd-unixsock(5) manpage](https://manpages.ubuntu.com/manpages/jammy/man5/collectd-unixsock.5.html)
- [collectdctl(1) — Debian manpages](https://manpages.debian.org/testing/collectd-utils/collectdctl.1.en.html)
- [CollectD protocol support in InfluxDB OSS v1](https://docs.influxdata.com/influxdb/v1/supported_protocols/collectd/)
- [Configure InfluxDB OSS v1](https://docs.influxdata.com/influxdb/v1/administration/config/)
- [prometheus/collectd_exporter README](https://github.com/prometheus/collectd_exporter)
- [Prometheus Pushgateway documentation](https://github.com/prometheus/pushgateway)

## Issues Found

1. **`collectdctl ping` is not a valid subcommand.** The collectdctl utility (collectd-utils ≥ 5.0) only exposes `getval`, `listval`, `putval`, and `flush`. Replaced the `collectdctl ping` line in the Troubleshooting section with a `collectdctl listval | head -20` example that actually verifies the daemon is responsive, and clarified that this requires the unixsock plugin.

2. **`unixsock` plugin was never loaded, so collectdctl examples wouldn't have worked.** Added a `LoadPlugin unixsock` block (with SocketFile, SocketGroup, SocketPerms, DeleteSocket) to the core configuration so that the `collectdctl listval` / `getval` examples later in the post actually function.

3. **The "Exposing Metrics via HTTP (for Prometheus)" section was fundamentally incorrect.** It loaded `write_http` with `Format "JSON"` and pointed it at a Prometheus Pushgateway URL (`/metrics/job/...`). The Pushgateway only accepts the Prometheus text exposition format, not JSON, so this configuration silently fails. Collectd's JSON output is consumable by `prometheus/collectd_exporter`, not by the Pushgateway. Replaced the entire example with the correct `write_prometheus` plugin (Port "9103"), which starts an internal HTTP server exposing `/metrics` in Prometheus text format, and added a matching `prometheus.yml` scrape_config snippet.

4. **The InfluxDB receiver configuration comment used Telegraf syntax, not InfluxDB syntax.** The original showed `[[inputs.collectd]]` with snake_case keys (`bind_address`, `retention_policy`) — that is Telegraf input plugin style. InfluxDB 1.x's native `influxdb.conf` uses `[[collectd]]` with dashed keys (`bind-address`, `retention-policy`, `enabled`, `security-level`). Corrected the commented configuration block accordingly.

## Review Notes

- The `collectd-write-http` package install line (`sudo apt install -y collectd-write-http 2>/dev/null || true`) was removed along with the write_http/Pushgateway block. The `write_prometheus` plugin is shipped with the core `collectd` package on current Ubuntu releases, so no extra install step is needed.
- The post's PUTVAL identifier format `exec-openfiles/gauge-count` parses correctly as `plugin=exec`, `plugin_instance=openfiles`, `type=gauge`, `type_instance=count`. `gauge` is defined in the default `types.db`, so the example is valid (though slightly unconventional — many users put the application name as the plugin instance and use a custom data-set type).
- Collectd 6.x removed/renamed several legacy options and is not yet the default in Ubuntu LTS releases; the configuration in this post matches collectd 5.x as shipped in Ubuntu 22.04 and 24.04. If a reader is on collectd 6.x they should consult the upstream migration notes.
- `FQDNLookup true` combined with a manually set `Hostname` is harmless but the FQDNLookup setting is only consulted when Hostname is not set; this is not an error, just a no-op nuance.
- The MySQL plugin example uses `root` with a placeholder password — appropriate for a tutorial but worth flagging that in production a dedicated, least-privilege monitoring user is preferred.

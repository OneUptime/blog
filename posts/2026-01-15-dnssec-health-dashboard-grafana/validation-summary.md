# Validation Summary: How to Build a DNSSEC Health Dashboard with Grafana

## Status
validated

## Post Type
Tutorial / Guide (hands-on walkthrough for building a Grafana monitoring dashboard)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- Grafana (dashboard panels, value mappings, thresholds, gauges)
- Prometheus (metrics scraping, PromQL, alerting rules)
- `prometheus-dnssec-exporter` (by chrj)
- Telegraf / InfluxDB line protocol (custom metrics)
- `dig`, `delv`, `dnssec-dsfromkey` (BIND DNS tooling)
- Bash scripting
- OneUptime (DNS monitoring / alert webhook integration)

## Sources Consulted
- prometheus-dnssec-exporter repository and README — https://github.com/chrj/prometheus-dnssec-exporter
  - Verified the three exposed metrics and their exact labels:
    - `dnssec_zone_record_days_left` (labels: zone, record, type)
    - `dnssec_zone_record_earliest_rrsig_expiry` (labels: resolver, zone, record, type)
    - `dnssec_zone_record_resolves` (labels: resolver, zone, record, type)
  - Verified CLI flags (`-config`, `-listen-address`, `-resolvers`, `-timeout`), default port `:9204`, and default config path `/etc/dnssec-checks`.
  - Verified the TOML config format against `config.sample` (`[[records]]` blocks with `zone`, `record`, `type` fields).
- Prometheus histogram / `histogram_quantile` and recording-rule conventions (the `_seconds` base-unit naming convention) — Prometheus docs.
- BIND DNS utility behavior for `dig` (`+dnssec`, `+trace`, `+short`, RRSIG rdata field ordering), `delv +rtrace`, and `dnssec-dsfromkey -f -`.

## Issues Found
- **Panel 4 (DNS Response Time) unit/threshold mismatch — fixed.** The panel used `"unit": "ms"` with thresholds `100`/`500`, but its PromQL query operates on `dnssec_query_duration_seconds_bucket` and `histogram_quantile` returns a value in **seconds** (consistent with Alert 4, which uses `> 0.5` to mean 500ms). With unit `ms`, Grafana would have rendered a seconds-valued result mislabeled (off by 1000×). Changed the panel to `"unit": "s"` and thresholds to `0.1` (100ms) and `0.5` (500ms) so the panel is internally consistent with the metric's base unit and with the alert threshold.

## Review Notes
- The exporter's `dnssec_zone_record_days_left` metric does not carry a `resolver` label (it is computed from the first configured resolver); the post documents this correctly, and the alert/panel queries that reference it do not rely on a `resolver` label.
- The install command was modernized vs. the upstream README: the post uses `go install github.com/chrj/prometheus-dnssec-exporter@latest`, which is the current, correct approach. The repo README still shows the deprecated `go get -u` form, so the post is actually more up to date here. No change needed.
- The custom validation check `[[ "$validation_result" =~ "ad" ]]` (Option 2 script) is functional but fragile — a bare `ad` substring match against full `dig` output is less precise than the `grep -c "flags:.*ad"` approach used later in the Multi-Resolver Validation script. Not incorrect, but the AD-flag-specific match is the more robust pattern; worth standardizing in a future revision.
- The Summary "Alert Thresholds" table lists Response Latency warning at 200ms, while Panel 4 uses 100ms and Alert 4 uses 500ms. These are advisory recommendations across different contexts rather than a single enforced value, so they were left as-is.
- Custom metrics in Option 2 (`dnssec_dnskey_count`, `dnssec_ds_count`, `dnssec_query_duration_seconds_bucket`) are illustrative — the post correctly flags throughout (via Notes on Panels 4/5 and Alerts 3/4) that these require the custom script/instrumentation and are not provided by `prometheus-dnssec-exporter`.
- Grafana value-mapping JSON (`type: "value"`), threshold `steps` with a leading `null` value, and the 9.0+ version requirement are all valid for current Grafana.

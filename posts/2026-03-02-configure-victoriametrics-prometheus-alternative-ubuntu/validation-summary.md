# Validation Summary: How to Configure VictoriaMetrics as a Prometheus Alternative on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- VictoriaMetrics single-node server
- Prometheus scrape configuration and remote write
- Prometheus TSDB snapshot API
- vmctl
- systemd
- Grafana

## Sources Consulted
- VictoriaMetrics quick start and binary installation docs: https://docs.victoriametrics.com/victoriametrics/quick-start/
- VictoriaMetrics single-node server docs and command-line flags: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- VictoriaMetrics vmctl docs: https://docs.victoriametrics.com/victoriametrics/vmctl/
- VictoriaMetrics Prometheus integration docs: https://docs.victoriametrics.com/victoriametrics/integrations/prometheus/
- VictoriaMetrics Grafana integration docs: https://docs.victoriametrics.com/victoriametrics/integrations/grafana/
- Prometheus HTTP API docs for TSDB snapshots: https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot
- VictoriaMetrics v1.143.0 and v1.99.0 release assets on GitHub: https://github.com/VictoriaMetrics/VictoriaMetrics/releases
- Local checks with `victoria-metrics-prod --help`, `vmctl-prod prometheus --help`, and `-promscrape.config.dryRun`.

## Issues Found
- The post used `VM_VERSION="v1.99.0"`, which is an old release. Updated it to `v1.143.0`, matching the current official quick-start examples and supported-release guidance.
- The introduction overstated compatibility by saying VictoriaMetrics responds to the same HTTP API endpoints. Clarified this to Prometheus-compatible HTTP query API endpoints.
- The alerting statement said only Alertmanager or another tool should be used. Updated it to mention `vmalert`, Prometheus, or another alerting tool, since Alertmanager receives alerts but does not evaluate rules by itself.
- The scrape configuration included `global.evaluation_interval`, which VictoriaMetrics rejects under the default strict scrape config parser. Removed the unsupported field and clarified that Prometheus rule-evaluation settings are not used in VictoriaMetrics scrape config.
- The `vmctl prometheus` example used the non-existent `--prom-snapshot-dir` flag. Replaced it with the documented `--prom-snapshot` flag.
- The Prometheus snapshot command omitted the requirement that the Prometheus admin API be enabled. Added the `--web.enable-admin-api` prerequisite.
- The authentication section created an unused `auth.yml` file and generated a bcrypt hash even though single-node VictoriaMetrics basic auth is configured with `-httpAuth.username` and `-httpAuth.password`. Replaced it with a password file and `file://` flag usage supported by the binary.
- The summary implied existing Alertmanager setups continue unchanged after replacing Prometheus. Clarified that scrape jobs and Grafana dashboards require minimal changes, while alerting rules should run in vmalert, Prometheus, or another alerting tool.

## Review Notes
- The corrected scrape configuration was validated with `victoria-metrics-prod -promscrape.config.dryRun` for VictoriaMetrics v1.143.0.
- The VictoriaMetrics binary and vmutils release URLs were checked for the updated version.

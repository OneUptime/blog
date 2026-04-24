# Validation Summary: How to Configure Prometheus Federation Across IPv4 Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus federation
- Prometheus configuration (`prometheus.yml`)
- Prometheus HTTP API
- `curl`
- Thanos Receive
- VictoriaMetrics

## Sources Consulted
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- curl man page: https://curl.se/docs/manpage.html
- Prometheus Remote Write 1.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- Thanos Receive documentation: https://thanos.io/tip/components/receive.md/
- VictoriaMetrics documentation: https://docs.victoriametrics.com/victoriametrics/

## Issues Found
- The introduction described federation as scraping aggregated metrics. Prometheus documents federation as scraping selected time series from another Prometheus server, so this was corrected to "selected metrics."
- The regional `external_labels` comment and the takeaway implied those labels are attached to all local metrics. Prometheus documents `external_labels` as labels added when communicating with external systems such as federation, remote storage, and Alertmanager, so the wording was corrected.
- The `/federate` `curl` example omitted `-g`/`--globoff`, even though the URL contains `[]`, which curl treats as globbing syntax. The command was updated to use `curl -g` and standard PromQL label quoting.
- The target-health verification example was tightened to query `/api/v1/targets?state=active` and to describe the result as inspecting the health of active federation targets.

## Review Notes
- No remaining technical issues after the corrections above.
- Current Prometheus documentation notes that federating native histograms requires `scrape_native_histograms: true` on the scraping Prometheus. The post does not cover native histograms, so no content change was required.

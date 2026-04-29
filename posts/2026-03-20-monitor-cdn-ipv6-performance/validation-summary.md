# Validation Summary: How to Monitor CDN IPv6 Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 / IPv4 networking
- Prometheus Blackbox Exporter
- Prometheus (scrape config, recording, alerting rules)
- PromQL
- Grafana
- Cloudflare Analytics REST API (zone analytics/dashboard endpoint)
- curl (`-4`, `-6`, `-w` write-out variables)
- Bash scripting
- W3C Navigation Timing API (`PerformanceNavigationTiming`)
- `navigator.sendBeacon`

## Sources Consulted
- Prometheus Blackbox Exporter configuration documentation: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus multi-target exporter guide (blackbox metric names): https://prometheus.io/docs/guides/multi-target-exporter/
- MDN `PerformanceNavigationTiming`: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
- curl manual (write-out variables: `time_namelookup`, `time_connect`, `time_starttransfer`, `time_total`, `http_code`)
- Cloudflare API reference for zone analytics dashboard endpoint

## Issues Found
No technical issues found.

Verified specifically:
- Blackbox exporter `http` prober options: `preferred_ip_protocol` accepts `ip4`/`ip6`; `ip_protocol_fallback`, `valid_status_codes`, and `fail_if_not_ssl` are all valid options with the values used.
- Prometheus scrape config for blackbox uses the standard relabel pattern (`__address__` → `__param_target` → `instance` → blackbox `__address__`); correct.
- PromQL metrics referenced (`probe_success`, `probe_http_duration_seconds` with `phase` label, `probe_dns_lookup_time_seconds`) are valid metrics emitted by the blackbox exporter.
- curl flags `-4`/`-6` force IPv4/IPv6 respectively; the `-w` format variables used are all valid.
- W3C Navigation Timing properties (`domainLookupStart/End`, `connectStart/End`, `requestStart`, `responseStart`, `loadEventEnd`, `startTime`) are valid on `PerformanceNavigationTiming`.
- Alert rule expressions are syntactically valid PromQL.

## Review Notes
- The Cloudflare zone analytics `dashboard` REST endpoint (`/client/v4/zones/{zone_id}/analytics/dashboard`) is the legacy analytics API. It still functions, but Cloudflare recommends the GraphQL Analytics API for new integrations and has been deprecating the REST analytics endpoints over time. The integer `since`/`until` values (in minutes, e.g. `-10080` for 7 days) used in the example are valid for the legacy endpoint. Readers building new pipelines may want to use the GraphQL Analytics API instead.
- The RUM IPv6-detection technique relies on `api.ipify.org` to report the client's egress IP. The IP version returned reflects how the browser reaches `api.ipify.org`, which can differ from how it reached the original CDN host (e.g., Happy Eyeballs, separate DNS responses, dual-stack). For stricter correctness, `api64.ipify.org` or a same-origin endpoint that records the connection's address family server-side would be more reliable. Not a code error — just a methodology caveat.
- `fail_if_not_ssl: true` will cause probes against plain-HTTP redirects to fail; combined with `valid_status_codes: [200, 301, 302]`, this is intentional and consistent.

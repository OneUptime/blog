# Validation Summary: How to Configure Loki for IPv6 Log Queries

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana
- Promtail
- Docker
- IPv6

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki install with Docker: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki labels guidance: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki label best practices: https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/
- Grafana Promtail template stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Promtail labels stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana LogQL log queries: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana LogQL metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana LogQL IP matching: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/loki/ip/
- Grafana Promtail status and migration guidance: https://grafana.com/docs/loki/latest/send-data/promtail/

## Issues Found
- The Loki config snippet omitted `auth_enabled: false`, even though Loki enables multi-tenant auth by default. Without disabling auth in this single-binary example, the Promtail client example would not be able to push logs unless it also sent an `X-Scope-OrgID` header. I added `auth_enabled: false`.
- The Loki config snippet omitted `common.ring.kvstore.store: inmemory`. The documented default ring backend is `consul`, so the original single-binary config was not self-contained. I added the in-memory ring configuration used for local single-binary setups.
- The Promtail template stage used `contains` with reversed arguments. Promtail template stages use Sprig functions, and `contains` expects the substring first and the input string second. I corrected the template to `contains ":" .remote_addr`.
- The post recommended storing `remote_addr` as a Loki label. Grafana's label guidance explicitly warns against high-cardinality labels such as IP addresses. I removed `remote_addr` from ingestion labels and updated the aggregate queries to extract it at query time with `| regexp`.
- The "specific IPv6 address" content query used a plain substring match. Loki documents native `ip()` matching for exact IP, range, and CIDR matching. I changed the exact-address and range examples to use `ip(...)`.
- The "per minute" rate description was incorrect because `rate()` returns per-second values in LogQL. I corrected the text to "per second".
- The 5xx error query used a broad substring filter. I changed it to an explicit 5xx regex so the query matches the described error-response intent.
- The post used Promtail examples without noting that Promtail reached end-of-life on March 2, 2026. I added a short note recommending Grafana Alloy for new deployments while keeping the Promtail example for existing installs.

## Review Notes
- The Docker command still uses `grafana/loki:3.0.0`. The syntax shown remains consistent with current Loki documentation, but Grafana's current install examples use newer 3.7.x images.
- The post now follows Loki's label-cardinality guidance more closely by keeping `ip_version` as an ingestion label and extracting `remote_addr` at query time.

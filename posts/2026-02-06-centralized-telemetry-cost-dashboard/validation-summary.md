# Validation Summary: How to Build a Centralized Telemetry Cost Dashboard That Shows Per-Team,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector count connector
- OpenTelemetry Collector Prometheus exporter
- Prometheus recording and alerting rules
- PromQL
- Grafana dashboard JSON
- Python requests
- Slack incoming webhooks

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector count connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- Requests documentation: https://requests.readthedocs.io/

## Issues Found
- The OpenTelemetry Collector count connector snippet used `traces:` as a custom count section. The count connector custom sections are `spans`, `spanevents`, `metrics`, `datapoints`, and `logs`, so I changed it to `spans:`.
- The Collector snippet attempted to define `spans.bytes` using the count connector. The count connector counts telemetry items and does not calculate byte size, and the metric was not used later in the post, so I removed it.
- The datapoint counter was under `metrics:` even though the post queries metric data point counts. I changed the custom count section to `datapoints:` so it counts data points rather than metric streams.
- The custom metric names used dotted names ending in `.total`, which would be translated by the Prometheus exporter into names that do not match the later PromQL. I renamed the OpenTelemetry count metrics to `spans`, `logs`, and `datapoints` so the default Prometheus translation exports `spans_total`, `logs_total`, and `datapoints_total`.
- The total cost recording rule added vectors with different label sets, which could drop unmatched teams or services. I changed it to aggregate all three ingestion recording-rule series by metric-name regex.
- The Grafana "Top 10 Most Expensive Services" panel queried `telemetry:cost:projected:monthly`, but that recording rule only retains `team_name`. I added a service-level projected monthly recording rule and updated the panel to use it.
- The high-cardinality alert used `{__name__=~".*"}`, which is an illegal PromQL selector because it can match the empty string. I changed it to `{__name__=~".+"}`.

## Review Notes
- The embedded JSON and Python snippets passed local syntax checks.
- The YAML snippets passed local YAML parsing. `promtool` and an OpenTelemetry Collector binary were not available in this workspace, so Prometheus and Collector validation was performed against official documentation and local checked-out Collector component schemas.
- The cost rates and average byte sizes are illustrative assumptions. In production, they should be replaced with the backend's actual pricing model and retention policy.

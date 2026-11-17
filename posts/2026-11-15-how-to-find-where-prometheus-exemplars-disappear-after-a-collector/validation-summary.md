# Validation Summary: How to Find Where Prometheus Exemplars Disappear After a Collector

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

OpenTelemetry, Prometheus

## Sources Consulted

- https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.120.0/exporter/prometheusexporter/README.md
- https://prometheus.io/docs/prometheus/latest/querying/api/
- https://prometheus.io/docs/prometheus/latest/feature_flags/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Parsed exporter YAML and shell commands; boundary requirements reviewed against official docs. No live scrape, exemplar API request, or Grafana interaction occurred.

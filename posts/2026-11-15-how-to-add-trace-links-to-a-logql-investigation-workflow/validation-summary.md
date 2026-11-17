# Validation Summary: How to Add Trace Links to a LogQL Investigation Workflow

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Loki, Grafana, OpenTelemetry

## Sources Consulted

- https://grafana.com/docs/grafana/latest/datasources/loki/configure/
- https://grafana.com/docs/loki/latest/query/log_queries/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- JSON examples parsed with the standard JSON decoder.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Parsed JSON and provisioning YAML; LogQL and derived-field approach reviewed against official Grafana documentation. No Grafana provisioning or Loki query was executed.

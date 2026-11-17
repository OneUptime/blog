# Validation Summary: How to Check Whether Loki Query Splitting Uses Read Replicas

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Loki, Kubernetes

## Sources Consulted

- https://grafana.com/docs/loki/latest/configure/
- https://grafana.com/docs/loki/latest/reference/loki-http-api/
- https://grafana.com/docs/loki/latest/operations/query-fairness/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Python examples parsed with Python ast; no external services were contacted.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Parsed the split-count fixture and YAML and checked shell syntax. No Kubernetes discovery or subquery-distribution experiment was executed.
- Executed 1 Python example(s) locally using their embedded illustrative inputs; all completed successfully. This did not exercise a telemetry backend or production workload.

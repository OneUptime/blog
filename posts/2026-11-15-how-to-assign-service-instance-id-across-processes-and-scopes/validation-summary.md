# Validation Summary: How to Assign service.instance.id Across Processes and Scopes

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

OpenTelemetry, Kubernetes

## Sources Consulted

- https://opentelemetry.io/docs/specs/semconv/resource/service/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Python examples parsed with Python ast; no external services were contacted.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Parsed Python and YAML and checked shell syntax. UUID and lifecycle design reviewed; no Kubernetes Pods or Java processes were started.
- Executed 1 Python example(s) locally using their embedded illustrative inputs; all completed successfully. This did not exercise a telemetry backend or production workload.

# Validation Summary: How to Diagnose Loki Retention When Old Chunks Never Disappear

## Status

Validated through documentation review and the checks below. Deployment verification remains environment-specific.

## Post Type

Practical tutorial.

## Technologies Covered

Loki, Storage, Observability

## Sources Consulted

- https://grafana.com/docs/loki/latest/operations/storage/retention/

## Issues Found

No outstanding issues identified in the performed checks. Live service behavior was not tested.

## Review Notes

- Reviewed official documentation and example semantics; checked metadata, title uniqueness, and fenced-block structure.
- Python 3 parsed 1 example(s) and executed all self-contained fixtures successfully.
- JSON examples parsed and shell examples syntax-checked where present. No production services contacted by examples.
- Reviewed schema and compactor fields; executed inventory arithmetic fixture. Kubernetes commands require the reader deployment and were syntax-checked only.
- Parsed all 1 YAML example(s) with PyYAML 6.0.3; this checks YAML syntax, not a running service configuration.

# Validation Summary: How to Separate Process Health from Database Journey Checks

## Status

Validated through documentation review and the checks below. Deployment verification remains environment-specific.

## Post Type

Practical tutorial.

## Technologies Covered

Kubernetes, Monitoring, SRE

## Sources Consulted

- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://prometheus.io/docs/practices/alerting/

## Issues Found

No outstanding issues identified in the performed checks. Live service behavior was not tested.

## Review Notes

- Reviewed official documentation and example semantics; checked metadata, title uniqueness, and fenced-block structure.
- Python 3 parsed 1 example(s) and executed all self-contained fixtures successfully.
- JSON examples parsed and shell examples syntax-checked where present. No production services contacted by examples.
- Executed failure-matrix fixture and parsed diagnostic JSON. Kubernetes probe semantics reviewed; no cluster or database fault injection was performed.
- Parsed all 1 YAML example(s) with PyYAML 6.0.3; this checks YAML syntax, not a running service configuration.

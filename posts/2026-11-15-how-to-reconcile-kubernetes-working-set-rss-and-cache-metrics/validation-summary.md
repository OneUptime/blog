# Validation Summary: How to Reconcile Kubernetes Working Set, RSS, and Cache Metrics

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Kubernetes, Prometheus

## Sources Consulted

- https://docs.kernel.org/admin-guide/cgroup-v2.html
- https://raw.githubusercontent.com/google/cadvisor/master/docs/storage/prometheus.md
- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Python examples parsed with Python ast; no external services were contacted.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Parsed the arithmetic model and shell syntax; accounting categories reviewed against kernel and cAdvisor docs. No live metric reconciliation or reclaim experiment was performed.
- Executed 1 Python example(s) locally using their embedded illustrative inputs; all completed successfully. This did not exercise a telemetry backend or production workload.

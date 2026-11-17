# Validation Summary: How to Investigate OOMKilled Pods Below Their Sampled Memory Limit

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Kubernetes, Linux

## Sources Consulted

- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- https://docs.kernel.org/admin-guide/cgroup-v2.html
- https://raw.githubusercontent.com/google/cadvisor/master/docs/storage/prometheus.md

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Reviewed kernel OOM accounting and Kubernetes termination semantics; parsed YAML and shell. No live Pod, kernel logs, or memory peak was inspected.

# Validation summary

## Checks performed

- Promtool 3.7.3 evaluated all four published expressions across five synthetic scenarios: ordinary total, missing quota, zero quota and period rate, per-CPU usage, and counter reset; 20 assertions passed.
- The fixture uses documented fuzzy_compare to tolerate last-bit floating-point rounding in the 20 percent ratio; initial exact comparison differed by 4e-15.
- Mermaid structure checked for four edges and declared flowchart direction; not graphically rendered.
- Generated social image visually reviewed at 1280x720; title readable without clipping.
- Reviewed cAdvisor 0.55.1 source for usage representation, quota metric emission, and throttling conditions.

## Limitations

- No Docker container or Kubernetes deployment was run.
- Synthetic PromQL tests verify arithmetic, labels and missing-data behavior, not actual kernel accounting or performance.
- Example identifiers must be replaced with actual container labels; one source and one denominator per identity are prerequisites.

## Reviewed sources

- https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go
- https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu
- https://prometheus.io/docs/prometheus/latest/querying/operators/#comparison-binary-operators
- https://github.com/google/cadvisor/blob/v0.55.1/docs/storage/prometheus.md
- https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

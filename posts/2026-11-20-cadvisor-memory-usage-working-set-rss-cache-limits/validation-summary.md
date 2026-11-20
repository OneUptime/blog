# Validation summary

## Checks performed

- Promtool 3.7.3 evaluated both published expressions under positive, zero and missing limits: six expression assertions passed, including all four distinct gauges and 78.125 percent usage.
- Arithmetic example checked: 800 MiB minus 300 MiB equals 500 MiB.
- Docker command passed bash syntax checking; command flags reviewed against official Docker stats documentation.
- Four-edge Mermaid flow structurally checked; no graphical rendering.
- Social image generated and visually inspected at 1280x720: readable title, no clipping.
- Reviewed cAdvisor 0.55.1 memory conversion and exporter source for v1/v2 mappings, working-set floor and limit normalization.

## Limitations

- No Docker or Kubernetes environment was used; Docker stats was not executed.
- Synthetic PromQL fixtures verify expressions, not Linux accounting, cache reclamation or OOM behavior.
- Working-set algorithm was source-reviewed, not executed through the Linux-only collector.

## Reviewed sources

- https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/libcontainer/handler.go
- https://docs.kernel.org/admin-guide/cgroup-v2.html#memory
- https://prometheus.io/docs/concepts/metric_types/
- https://prometheus.io/docs/prometheus/latest/querying/operators/
- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- https://docs.docker.com/reference/cli/docker/container/stats/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

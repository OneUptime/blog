# Validation summary

## Checks performed

- Prometheus 3.7.3 passed five assertions: unique denominator, 25 percent application-working-set/host-capacity ratio excluding parent and sandbox, missing denominator producing no ratio, and duplicate capacity count two.
- Reviewed Node Exporter 1.9.1 host-mount guidance and memory collector, Kubernetes 1.35 cAdvisor labels and Prometheus vector matching.
- Seven-edge Mermaid flow structurally checked; not graphically rendered.
- Generated 1280x720 social image visually reviewed with readable unclipped title.

## Sources reviewed

- https://github.com/prometheus/node_exporter/blob/v1.9.1/README.md
- https://github.com/google/cadvisor/blob/v0.55.1/docs/storage/prometheus.md
- https://prometheus.io/docs/concepts/jobs_instances/
- https://github.com/prometheus/node_exporter/blob/v1.9.1/collector/meminfo_linux.go
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/kubelet/server/server.go
- https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching

## Limitations

- No Node Exporter or cAdvisor deployment, host mount verification, live cluster scrape or dashboard rollout was performed.
- Synthetic fixtures assume validated node/cluster identity and workload labels; actual discovery and coverage require inventory comparison.
- The ratio is workload working set divided by host capacity, not host available-memory percentage.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

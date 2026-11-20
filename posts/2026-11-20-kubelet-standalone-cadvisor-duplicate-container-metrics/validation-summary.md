# Validation summary

## Sources reviewed

- https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- https://github.com/google/cadvisor/blob/v0.55.1/README.md
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/go.mod
- https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes
- https://github.com/google/cadvisor/blob/v0.55.1/docs/storage/prometheus.md
- https://prometheus.io/docs/prometheus/latest/querying/operators/
- https://prometheus.io/docs/prometheus/latest/querying/basics/
- https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/

## Checks performed

- Prometheus 3.7.3 promtool test rules executed all three article expressions against synthetic overlapping and single-source containers. Inventory counts, cross-job overlap and canonical-source values matched expected results.
- Kubernetes v1.35.0 go.mod inspected: embedded cAdvisor dependency v0.53.0 confirmed; standalone v0.55.1 metric reference reviewed.
- Mermaid seven-edge diagram checked structurally. Social image generated and visually inspected.

## Limitations

- No Kubernetes cluster, operator-generated monitoring configuration, actual exporter labels, pod replacement or live dashboard migration tested.
- PromQL tests assume one cluster and consistent namespace/pod/container labels; they do not establish real-world exporter identity equivalence.
- Mermaid not rendered; no historical metrics deleted or collection resources changed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

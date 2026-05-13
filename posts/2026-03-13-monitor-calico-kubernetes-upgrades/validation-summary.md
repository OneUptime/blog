# Validation Summary: How to Monitor Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- kube-state-metrics
- Bash
- Mermaid

## Sources Consulted
- Calico documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Recommended Prometheus metrics, https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Calico documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico documentation: Install images by registry digest, https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Metrics for Kubernetes Object States, https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation, https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- Prometheus documentation: Histograms and summaries, https://prometheus.io/docs/practices/histograms/
- Prometheus documentation: Query functions, https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The real-time monitor counted every container image emitted by the JSONPath loop, which could double count a pod if the Calico node pod contains more than one container. Changed the JSONPath expression to read only the container named `calico-node`.
- The upgrade progress PromQL used `felix_version`, which is not listed in the current Calico Felix metric reference. Changed the query to use kube-state-metrics' stable `kube_pod_container_info` image label for the `calico-node` container.
- The policy programming latency PromQL used `histogram_quantile()` against `felix_int_dataplane_apply_time_seconds_bucket`, but Calico documents `felix_int_dataplane_apply_time_seconds` as a summary-style metric with `quantile` labels. Changed the query to `felix_int_dataplane_apply_time_seconds{quantile="0.99"}`.
- The `CalicoUpgradeStuck` alert subtracted the DaemonSet update ratio from `time()`, which does not represent elapsed upgrade time. Changed the expression to compare updated scheduled pods against desired scheduled pods, with a Prometheus `for: 15m` duration to express the stuck condition.

## Review Notes
- The examples assume a Tigera Operator style installation using the `calico-system` namespace and `tigerastatus`; manifest-based installations often use `kube-system` and may not have TigeraStatus resources.
- The image-based progress query assumes Calico images include the target version tag in `kube_pod_container_info`. Clusters pinned only by digest may need to match the expected digest instead of the version tag.

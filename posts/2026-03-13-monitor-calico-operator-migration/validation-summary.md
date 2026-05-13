# Validation Summary: How to Monitor Calico Operator Migration

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- kubectl
- kube-state-metrics
- Prometheus / PromQL
- tmux
- BusyBox
- Mermaid

## Sources Consulted
- Calico documentation: Migrate Calico to an operator-managed installation, https://docs.tigera.io/calico/latest/operations/operator-migration
- Calico documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Kubernetes documentation: Node status and conditions, https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: Metrics for Kubernetes object states, https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation: node metrics, https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The post referred to node network health as `NodeNetworkUnavailable` in prose and used `NetworkReady` in PromQL and JSONPath examples. Kubernetes node conditions expose the condition type as `NetworkUnavailable`, where `True` indicates the node network is not correctly configured. Updated the prose and examples to use `NetworkUnavailable`.
- The `kube_node_status_condition` PromQL example used `condition="NetworkReady", status="false"`, which is not a valid Kubernetes node condition. Changed it to `condition="NetworkUnavailable", status="true"` so it actually detects network-unavailable nodes.
- The DaemonSet availability PromQL did not include `namespace`, which can be ambiguous during migration because Calico resources move from `kube-system` to `calico-system`. Added `namespace="calico-system"` to both sides of the ratio.
- The latency probe attempted `wget http://kubernetes.default.svc`, but the default Kubernetes API service is exposed over HTTPS on port 443, not plain HTTP on port 80. Changed it to probe `https://kubernetes.default.svc/version` with `--no-check-certificate`.

## Review Notes
- The Calico migration guidance matches official documentation: manifest-installed resources move from `kube-system` to `calico-system`, the Tigera Operator records status in `tigerastatus`, and official migration docs recommend monitoring `kubectl describe tigerastatus calico`.
- The Prometheus examples assume kube-state-metrics is installed and scraped by Prometheus.

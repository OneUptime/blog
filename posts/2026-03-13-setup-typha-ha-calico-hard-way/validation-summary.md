# Validation Summary: How to Set Up Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (network policy)
- Typha (Calico's stateful proxy for kube-apiserver)
- Felix (Calico's per-node agent)
- Kubernetes Deployments, Pod anti-affinity, PodDisruptionBudget
- kubectl (including `kubectl debug node`)
- Prometheus metrics (Typha exporter)

## Sources Consulted
- Calico the Hard Way - Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Typha Prometheus reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico monitoring components: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Tigera operator Installation API: https://docs.tigera.io/calico/latest/reference/installation/api
- tigera/operator source (`pkg/render/typha.go`) for pod template labels
- projectcalico/calico Typha manifests for label conventions
- Kubernetes docs on Pod Affinity/Anti-Affinity and PodDisruptionBudget

## Issues Found
- **Incorrect label key in pod anti-affinity selectors (Step 2 and Step 3).** The original post used `app: calico-typha` in both the `requiredDuringSchedulingIgnoredDuringExecution` and `preferredDuringSchedulingIgnoredDuringExecution` selectors. Calico Typha pods are labeled `k8s-app: calico-typha` in both the operator-managed (`calico-system`) and manifest-based ("Calico the Hard Way") installations — there is no `app` label. The selectors would therefore match no pods and the anti-affinity rules would be silently ineffective. The post is also internally inconsistent: Steps 4 (PDB selector), 5, and 6 already use `k8s-app=calico-typha`. Fixed both anti-affinity blocks to use the `k8s-app` key (matchExpressions in Step 2 and matchLabels in Step 3).

## Review Notes
- The PodDisruptionBudget in Step 4 uses `policy/v1` which is correct (GA since Kubernetes 1.21). For very old clusters (<1.21) `policy/v1beta1` would be needed, but this is no longer relevant in 2026.
- The Typha Prometheus metrics port `9093` is consistent with the rest of this blog series. The Calico Typha upstream default is 9091, but the port is fully configurable (via `TYPHA_PROMETHEUSMETRICSPORT` or the operator's `typhaMetricsPort` field), and 9093 is a valid choice that matches the surrounding posts in this series. Left as written.
- The recommended replica counts (2 for 200–500 nodes, 3 for 500–2000) align with Calico's general guidance of roughly one Typha per 200 nodes plus headroom for HA.
- `kubectl debug node/<node>` is GA as of recent Kubernetes versions and is the correct way to invoke a debug container on a node.
- `typha_connections_active` is a documented Typha metric and is appropriate for verifying connection distribution.
- Style note (not fixed): Step 7 mixes pod failure simulation with a NetworkPolicy programming check — the iptables grep is a coarse sanity check rather than a strict assertion. This is acceptable for a tutorial but readers should not interpret a non-zero count as proof the specific test policy was programmed.

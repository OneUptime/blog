# Validation Summary: How to Set Up Network Bandwidth Limiting in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes (CNI, NetworkPolicy)
- Calico (calico-node)
- kubectl
- Prometheus Operator (PrometheusRule)
- netshoot / busybox debug images

## Sources Consulted
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico node binary readiness/liveness flags (calico/node DaemonSet manifests)
- Kubernetes NetworkPolicy v1 API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#networkpolicy-v1-networking-k8s-io
- Kubernetes traffic shaping / bandwidth annotations: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI bandwidth meta plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Cilium Bandwidth Manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- prometheus-operator API reference (monitoring.coreos.com/v1): https://prometheus-operator.dev/docs/api-reference/api/
- CNI spec versions: https://github.com/containernetworking/cni/blob/main/SPEC.md

## Issues Found
1. **Invalid `calico-node -show-status` flag (Step 5).** The `calico-node` binary does not expose a `-show-status` flag. Valid flags are `-felix-ready`, `-felix-live`, `-bird-ready`, `-bird-live`, `-bird6-ready`, `-bird6-live`, `-startup`, etc. (per the calico/node DaemonSet probes). Replaced with `calico-node -bird-ready` and updated the surrounding comment to reflect what the command actually does (BGP / Felix readiness, not bandwidth usage — there is no calico CLI flag that prints per-pod bandwidth).
2. **Same invalid flag in Step 7 troubleshooting block.** Replaced with `calico-node -felix-ready`.
3. **Duplicated phrasing in the conclusion.** The sentence "How to Set Up Network Bandwidth Limiting in Rancher configuration in Rancher requires..." had the title accidentally inlined twice. Rewrote as "Network bandwidth limiting in Rancher requires..." for grammatical correctness while preserving the author's tone.

## Review Notes
- The post's title implies coverage of bandwidth limiting specifically, but the body covers generic Kubernetes networking (CNI inspection, NetworkPolicy, debugging). It does not actually demonstrate the canonical Kubernetes bandwidth-limiting mechanisms — `kubernetes.io/ingress-bandwidth` / `kubernetes.io/egress-bandwidth` pod annotations chained with the CNI bandwidth meta plugin, or Cilium's Bandwidth Manager, or Calico's QoS controls. Per the review brief, structural/content additions are out of scope for this validation pass, so the topic mismatch is flagged here rather than fixed.
- `cniVersion: 0.4.0` in Step 2 is a valid CNI spec version but no longer current — `1.0.0` and `1.1.0` are the modern versions. Either is acceptable for compatibility, so this was left as-is.
- The Step 2 ConfigMap uses a placeholder plugin type `main-cni-plugin` which is clearly illustrative; left unchanged since restructuring/expanding example content is out of scope.
- `monitoring.coreos.com/v1 PrometheusRule`, `networking.k8s.io/v1 NetworkPolicy`, the `kubectl` invocations, and the PromQL expressions (`rate(node_network_transmit_errs_total[5m])`, `up{job="..."}`) all check out.

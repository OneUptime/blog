# Validation Summary: Monitor Node CIDR Planning with Calico

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (v3.27+) and Calico IPAM
- `calicoctl` CLI
- Kubernetes (`kubectl`)
- Bash and `awk` scripting
- Python 3 (math module)
- Prometheus / kube-prometheus-stack (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)

## Sources Consulted
- Calico IPAM and block-affinity docs: https://docs.tigera.io/calico/latest/networking/ipam/
- `calicoctl` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Prometheus metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes `kubectl get pods -o wide` column ordering (NAMESPACE NAME READY STATUS RESTARTS AGE IP NODE NOMINATED_NODE READINESS_GATES): https://kubernetes.io/docs/reference/kubectl/
- Node status capacity (`status.capacity.pods`): https://kubernetes.io/docs/reference/node/node-status/
- Prometheus Operator `PrometheusRule` CRD reference: https://prometheus-operator.dev/docs/operator/api/

## Issues Found
1. **Wrong awk column for pod status (Step 3).** The capacity-report script filtered running pods with `$5~/Running/`, but in `kubectl get pods -A -o wide` output column 5 is `RESTARTS` (a numeric count), not `STATUS`. The correct column for STATUS is `$4`. Updated the awk expression to `$4~/Running/` so the script actually counts running pods.
2. **`grep -A2 "capacity:"` would not surface the `pods:` field (Step 4).** Under `node.status.capacity` the `pods:` key typically sits below several other keys (cpu, ephemeral-storage, hugepages-*, memory), well beyond two lines. The original command would silently print nothing in most clusters. Replaced it with a `kubectl ... -o jsonpath` expression that reliably emits `<node>\t<maxPods>` per node.

## Review Notes
- The Python sizing math is internally consistent: `/26` = 64 IPs per block; `min_prefix = 32 - ceil(log2(required_ips))` yields a `/19` for the 50-node × 100-pod × 1.5 example (~7,500 IPs), which the recommended `192.168.0.0/16` comfortably exceeds.
- The `calico_ipam_ips_total{type=...}` metric used in the PrometheusRule is not a metric exposed by Calico's built-in kube-controllers/Felix endpoints directly; in production this typically comes from a community IPAM exporter or is computed via a recording rule. The post uses it illustratively, which is acceptable, but readers running stock Calico will need to either deploy an exporter or rewrite the expression against `ipam_allocations_per_node` / `ipam_blocks_per_host`.
- The "one block per ~60 pods" wording in Step 1 glosses over the fact that a `/26` block holds 64 IPs total; Calico does not reserve network/broadcast within a block, so a `/26` provides 64 usable pod IPs. The figure is close enough not to mislead but could be tightened in a future revision.
- The best-practice tip "Set block size to at least `ceil(maxPodsPerNode / 0.8)`" mixes units (IP count vs. prefix length). Intent is reasonable (size each block so a single node's worst case still fits without borrowing) but the phrasing is ambiguous; left as-is per scope.
- `calicoctl get blockaffinities -o yaml | grep "node: $node_name"` is fragile if node names share a common prefix; for production tooling, parsing with `yq`/`jq` would be more robust, but the grep approach is fine for an ad-hoc capacity check.

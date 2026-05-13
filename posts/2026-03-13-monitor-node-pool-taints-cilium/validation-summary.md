# Validation Summary: Monitor Node Pool Taints with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI plugin, v1.14+)
- Kubernetes (DaemonSets, node taints/tolerations)
- Helm
- CiliumNetworkPolicy (cilium.io/v2)
- Prometheus / kube-state-metrics
- Hubble (mentioned as prerequisite)
- kubectl

## Sources Consulted
- Cilium official documentation: https://docs.cilium.io/
- Cilium Helm chart values reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Network Policy spec (CiliumNetworkPolicy v2): https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- kubectl JSONPath reference (jsonpath vs jsonpath-as-json): https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kube-state-metrics DaemonSet metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- Prometheus Operator PrometheusRule CRD (monitoring.coreos.com/v1)

## Issues Found
- Step 3 monitoring script used `kubectl get node $node -o jsonpath='{.spec.taints}'` piped into `python3 ... json.load(sys.stdin)`. The standard `jsonpath` output formatter renders complex types (lists of maps) using Go's fmt package (e.g., `[map[effect:NoSchedule key:dedicated]]`), which is not valid JSON and causes `json.load` to raise. Fixed by switching to `-o jsonpath-as-json='{.spec.taints}'`, which emits a JSON-encoded array that the subsequent `json.load` call can correctly parse.

## Review Notes
- The Cilium DaemonSet name is `cilium` and labels use `k8s-app=cilium` — both correct per Cilium's default Helm chart.
- `apiVersion: cilium.io/v2` is the current stable API for `CiliumNetworkPolicy`.
- The kube-state-metrics metric names (`kube_daemonset_status_desired_number_scheduled`, `kube_daemonset_status_number_ready`) and the `daemonset` label are accurate.
- The recommendation to use `tolerations: [{operator: Exists}]` aligns with Cilium's own default in the official Helm chart so the agent runs on every node regardless of taints.
- The `kubectl get nodes -o custom-columns=...` multi-line command using backslash line continuation is valid bash; commas remain literal because they're embedded in the custom-columns expression.
- Cilium v1.14+ as the floor is reasonable; newer releases (1.15–1.17) are also compatible with the configuration shown.
- The `cilium policy get | grep "gpu-workload-policy"` check is a coarse smoke test; for stronger validation Hubble flow inspection (mentioned in Best Practices) is more reliable, but the post already calls that out.

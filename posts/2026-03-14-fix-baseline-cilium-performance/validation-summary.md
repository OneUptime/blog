# Validation Summary: Fixing Baseline Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Linux sysctl
- iperf3
- jq and bc

## Sources Consulted
- Cilium Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium kube-proxy replacement and XDP acceleration documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Helm rollback reference: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The Helm example used `--set tunnel=disabled` together with `--set routingMode=native`. Current Cilium Helm documentation uses `routingMode=native` for native routing, so the obsolete `tunnel=disabled` value was removed.
- The verification and checklist used top-level `cilium` commands for agent-local diagnostics (`status --verbose`, `monitor`, and `endpoint list`). Cilium documents these as `cilium-dbg` commands run in a Cilium agent context, so the examples were changed to `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...`.
- The drop-monitoring pipeline used `cilium monitor --type drop | timeout 5 head -5`, which applies `timeout` to `head` rather than to the monitoring command and also used the wrong CLI context. It was changed to run `cilium-dbg monitor` under `timeout`.
- The staged rollout section implied that draining one node before a Helm upgrade tests the change on only that node. Cilium's tuning guide notes that datapath-changing settings can require pod or node replacement and recommends per-node configuration for staged adoption, so the text was corrected to call out per-node configuration or a replacement node pool before applying cluster-wide Helm values.

## Review Notes
- The performance target of 90-98% of host baseline is environment-dependent and should be treated as a measurement goal, not a guarantee.
- `loadBalancer.acceleration=native` depends on direct routing and NIC driver support for native XDP; this is correctly implied by the surrounding native-routing configuration but should be checked per environment.

# Validation Summary: How to Validate Excluding Labels in Cilium performance

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- Cilium CLI, cilium-dbg, and cilium-health
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI connectivity test reference: https://docs.cilium.io/en/stable/cmdref/cilium_connectivity_test/
- Cilium CLI status reference: https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium debug endpoint command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint/
- Cilium debug identity command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity/
- Cilium debug metrics command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics/
- Cilium health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- CiliumNetworkPolicy API reference: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium sysdump command reference: https://docs.cilium.io/en/stable/cmdref/cilium_sysdump/
- Cilium limiting identity-relevant labels guide: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The post used `cilium endpoint list`, `cilium identity list`, `cilium metrics list`, and `cilium endpoint get` as if they were Kubernetes-facing Cilium CLI commands. Current Cilium documentation exposes these as agent-local `cilium-dbg` commands, so the examples were changed to run them through `kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg ...`.
- The post used `cilium policy get` for policy checks. The closest current debug command, `cilium-dbg policy get`, is documented as deprecated, so those examples were changed to use Kubernetes API checks for CiliumNetworkPolicy and NetworkPolicy resources.
- The post used `cilium health status`, but the documented health command is `cilium-health status` inside a Cilium agent context. The verification and troubleshooting examples were updated accordingly.
- The operator pod selector used `name=cilium-operator`, which is not the current documented default selector. It was changed to `io.cilium/app=operator`.
- The validation flow did not actually check the label exclusion configuration despite the title and conclusion focusing on excluding labels. The configuration validation section now checks the live Cilium `labels` setting via `cilium config view` and the `cilium-config` ConfigMap.
- The troubleshooting note said endpoints stuck regenerating usually indicate BPF program compilation errors. Endpoint regeneration can fail or stall for broader agent load and regeneration errors, so the wording was narrowed to avoid overstating the cause.

## Review Notes
The CiliumNetworkPolicy example is syntactically valid for `cilium.io/v2` and the `cilium connectivity test`, `cilium status --verbose`, `cilium sysdump --output-filename`, and `kubectl run` / `kubectl expose` examples are consistent with current command references. The guide would be stronger in a future content pass if it showed an example Helm value for label exclusion, but that would be an expansion rather than a correctness fix.

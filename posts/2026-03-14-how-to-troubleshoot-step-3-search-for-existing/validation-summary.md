# Validation Summary: Troubleshooting Parser Code and Libraries in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium CLI and `cilium-dbg`
- Hubble CLI
- Kubernetes
- CiliumNetworkPolicy
- eBPF datapath and endpoint policy troubleshooting

## Sources Consulted
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` for agent-local endpoint and identity inspection. Current Cilium documentation uses `cilium-dbg` for these operations, typically executed inside or against a Cilium agent. Updated the examples to run `cilium-dbg` through `kubectl exec` against the relevant Cilium agent pod.
- The endpoint health command was missing the required endpoint ID. Updated it to `cilium-dbg endpoint health <ENDPOINT_ID>`.
- The realized policy example referenced `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, but current troubleshooting documentation points users to `status.policy.realized.l4`. Updated the jq output to show `.status.policy.realized.l4`.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current documented `cilium-dbg endpoint` command reference. Replaced it with guidance to inspect rendered endpoint policy, review agent logs, and recreate the affected workload pod if stale endpoint state persists.

## Review Notes
The guide remains technically valid after the command updates. Several examples require choosing the Cilium agent pod on the same node as the endpoint being debugged; this is now reflected with the `<CILIUM_POD_ON_ENDPOINT_NODE>` placeholder.

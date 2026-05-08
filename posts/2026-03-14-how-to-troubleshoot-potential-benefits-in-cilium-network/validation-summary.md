# Validation Summary: Troubleshooting Potential Benefits in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble
- eBPF
- kubectl
- jq

## Sources Consulted
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/

## Issues Found
- The endpoint examples used `cilium endpoint list`, `cilium endpoint get`, and `cilium endpoint health` as if those commands were available from the Kubernetes-facing Cilium CLI. Current Cilium documentation exposes endpoint inspection through the agent-local `cilium-dbg` CLI and through the `CiliumEndpoint` CRD. Updated the examples to use `kubectl get ciliumendpoints`.
- The realized policy example used incorrect JSON paths, `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`. Updated them to `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`.
- The Hubble JSON example used `--output json`, which is a deprecated alias in Hubble. Updated it to `--output jsonpb`.
- The identity lookup example used `cilium identity list`, but identity inspection is documented under `cilium-dbg identity list`. Updated the command to execute `cilium-dbg` through the Cilium DaemonSet.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current Cilium command reference. Replaced it with guidance to inspect CiliumEndpoint state and Cilium agent logs before restarting affected workloads or agents.
- The Hubble Relay pod selector used `app.kubernetes.io/name=hubble-relay`, while the Cilium Hubble troubleshooting documentation uses `k8s-app=hubble-relay`. Updated the selector to match the documented command.

## Review Notes
The CiliumNetworkPolicy YAML uses the supported `cilium.io/v2` API version and valid `endpointSelector`, `fromEndpoints`, `toEndpoints`, and `toPorts` fields. The post targets Cilium v1.14+, but some reviewed command references are from current stable documentation; future reviews should re-check CLI names if Cilium changes the split between `cilium` and `cilium-dbg`.

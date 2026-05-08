# Validation Summary: Troubleshooting Demo Application in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint CRDs
- Cilium CLI
- Cilium agent `cilium-dbg`
- Hubble CLI
- `kubectl`
- `jq`

## Sources Consulted
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CiliumNetworkPolicy Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium troubleshooting documentation, including Hubble usage and connectivity checks: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium API reference for endpoint realized policy fields: https://docs.cilium.io/en/stable/api.html
- Hubble setup and API access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- Endpoint inspection commands used `cilium endpoint ...`, but current Cilium documentation exposes endpoint state through `cilium-dbg` on the agent and through Kubernetes `CiliumEndpoint` CRDs. Updated the cluster-wide checks to use `kubectl get ciliumendpoints` and detailed endpoint checks to use `kubectl get ciliumendpoint`.
- The realized policy JSON paths used `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, which do not match the documented endpoint API. Updated them to `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`.
- Identity lookup used `cilium identity list`, but current agent-side identity inspection is documented as `cilium-dbg identity list`. Updated the command to execute `cilium-dbg` in the Cilium daemonset.
- Verification used `cilium endpoint health` without the required endpoint ID and without running it through the agent-side debug CLI. Updated it to `cilium-dbg endpoint health <ENDPOINT_ID>` through the Cilium daemonset.
- The troubleshooting section recommended `cilium endpoint regenerate all`, but this command is not present in the current documented `cilium-dbg` endpoint command reference. Replaced it with checking endpoint state and logs, then recreating the affected pod when stale endpoint state persists.

## Review Notes
The CiliumNetworkPolicy YAML uses the current `cilium.io/v2` API and valid `endpointSelector`, `fromEndpoints`, `toEndpoints`, and `toPorts` syntax. The Hubble drop-observation commands use documented Hubble flow concepts and common JSON fields, but users may need Hubble Relay access or `-P`/port-forwarding depending on their local setup.

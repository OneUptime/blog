# Validation Summary: Troubleshooting Host Policy Adjustment in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium host firewall and host policies
- Kubernetes
- CiliumClusterwideNetworkPolicy
- Hubble CLI
- cilium-dbg
- kubectl
- jq

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium API Reference for endpoint status fields: https://docs.cilium.io/en/stable/api/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- cilium-dbg endpoint health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- cilium-dbg identity list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_identity_list/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble setup and observe examples: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list`, but current Cilium documentation exposes these agent-local commands as `cilium-dbg`. Updated examples to run `cilium-dbg` through the Cilium DaemonSet with `kubectl -n kube-system exec ds/cilium -- ...`.
- The endpoint label query used `.status.labels.id`, which is not the documented endpoint JSON field. Updated it to use `.status.identity.labels`.
- The policy inspection query used `.status.policy.realized`, while the documented endpoint policy status fields are under `.status.policy.spec`. Updated the `jq` query to use `policy-enabled` and L4 ingress/egress fields from `.status.policy.spec`.
- The verification command `cilium endpoint health` omitted the required endpoint ID and used the wrong CLI. Updated it to `kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint health <ENDPOINT_ID>`.
- The troubleshooting note recommended `cilium endpoint regenerate all`, which is not present in the current documented `cilium-dbg endpoint` command set. Replaced it with documented checks for endpoint state and agent logs before restarting affected workloads or Cilium agents.
- The prerequisites referenced only `CiliumNetworkPolicy`, but host policies are represented as `CiliumClusterwideNetworkPolicy` with `nodeSelector`. Updated the prerequisite wording and added host firewall enablement and `cilium-dbg` access.

## Review Notes
The host policy YAML shape using `CiliumClusterwideNetworkPolicy` with `nodeSelector`, `ingress`, `egress`, `fromEntities`, `toEntities`, `fromCIDR`, `toCIDR`, and `toPorts` is consistent with the Cilium host policy documentation. The Hubble `observe` usage and `cilium connectivity test` command are consistent with official documentation, assuming Hubble Relay is reachable through port-forwarding or equivalent configuration.

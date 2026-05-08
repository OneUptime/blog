# Validation Summary: Troubleshooting Node Label Attachment in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Cilium host policies and host firewall
- Cilium CLI and cilium-dbg
- Hubble CLI
- jq

## Sources Consulted
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium host policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble exporter documentation with Hubble observe examples: https://docs.cilium.io/en/latest/observability/hubble/configuration/export/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` for endpoint and identity inspection. Current Cilium documentation exposes these troubleshooting commands through `cilium-dbg`, so the examples were updated to run `cilium-dbg` inside a Cilium agent pod with `kubectl -n kube-system exec ds/cilium -c cilium-agent --`.
- The prerequisite list mentioned CiliumNetworkPolicy but the node selector example uses CiliumClusterwideNetworkPolicy. The prerequisite was updated to include both resources.
- The post discussed node-selected policies without mentioning the host firewall requirement. A prerequisite was added to clarify that host firewall must be enabled when troubleshooting node-selected host policies.
- The explanation for non-ready endpoints said policies cannot be enforced correctly. Cilium endpoint lifecycle documentation is more specific: endpoints move through identity and regeneration states, and policy changes may not be enforced as expected until regeneration completes. The statement was softened accordingly.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current official command reference. It was replaced with guidance to reapply the policy and watch endpoint state with `cilium-dbg endpoint list`.

## Review Notes
The Hubble and `cilium connectivity test` examples match current official usage. The `cilium-dbg` endpoint commands inspect the agent they are executed against, so larger clusters may require running the same checks on the node that owns the affected endpoint.

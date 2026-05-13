# Validation Summary: How to Secure Cilium Host Firewall

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium Host Firewall
- CiliumClusterwideNetworkPolicy
- eBPF
- Helm
- kubectl

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Release Organization documentation: https://docs.cilium.io/en/stable/contributing/release/organization.html

## Issues Found
- The description referred to `CiliumNetworkPolicies` for host endpoints. Cilium host policies take the form of `CiliumClusterwideNetworkPolicy` resources with `nodeSelector`, so I corrected the description.
- The introduction claimed broad L7 filtering for node traffic. Current Cilium host policy documentation supports L3/L4 rules and L7 DNS rules, but not other L7 policy types, so I narrowed this to L7 DNS filtering.
- The prerequisites listed `Cilium 1.10+` and kernel `5.3+`. Current Cilium documentation recommends using supported Cilium releases and requires Linux kernel 5.10+ or an equivalent supported distribution kernel, so I updated the prerequisites.
- The audit mode and enforcement commands used the unsupported `policy.cilium.io/host-firewall-mode` node annotation. Official Cilium documentation configures host firewall audit mode on the host endpoint with `cilium-dbg endpoint config ... PolicyAuditMode=Enabled` or `Disabled`, so I replaced those commands.
- The verification command used the DaemonSet target directly, which is less precise for a node-specific host endpoint. I changed it to run `cilium-dbg endpoint list` in the Cilium agent pod for the selected node.
- The emergency recovery command used the same unsupported annotation and implied a persistent disabled mode. Cilium documents temporary recovery by enabling audit mode on the `reserved:host` endpoint from inside the Cilium agent container, so I replaced the command with that approach.
- The conclusion described host firewall as using the same policy API as pod network policies. Host policies use `CiliumClusterwideNetworkPolicy` with node selectors rather than pod endpoint selectors, so I corrected the wording.

## Review Notes
- The host policy YAML shape is valid for a Cilium host policy, but production deployments usually need additional allow rules for node-to-node, health, API server, overlay, NodePort, ICMP, and environment-specific control-plane traffic before audit mode is disabled.
- Cilium audit mode does not persist across `cilium-agent` restarts; if the agent restarts, existing host policies can be enforced immediately.

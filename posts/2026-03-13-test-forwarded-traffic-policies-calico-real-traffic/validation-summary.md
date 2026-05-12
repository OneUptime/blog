# Validation Summary: How to Test Forwarded Traffic Policies for Calico Hosts with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico HostEndpoint resource (`projectcalico.org/v3`)
- Calico GlobalNetworkPolicy resource (`projectcalico.org/v3`)
- calicoctl CLI
- kubectl CLI
- iptables
- Felix (Calico's per-node agent)

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Host endpoints guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico applyOnForward behavior: https://docs.tigera.io/calico/latest/network-policy/hosts/forwarded-traffic
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico node liveness/readiness flags (`-felix-live`, `-felix-ready`): https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
No technical issues found.

- The HostEndpoint manifest correctly uses `interfaceName`, `node`, and `expectedIPs` under `spec`.
- The GlobalNetworkPolicy uses `applyOnForward: true` correctly, which is required for policies on host endpoints to apply to forwarded traffic.
- `preDNAT: false` is a valid explicit setting; when false (default), the policy applies after DNAT.
- The `selector: node == 'node01'` matches the `node: node01` label on the HostEndpoint, which is valid Calico selector syntax.
- The `destination: ports: [22, 443, 6443]` inline list syntax is valid YAML and accepted by Calico.
- `calicoctl apply -f` and `calicoctl get hostendpoints [-o wide]` are valid commands.
- `calico-node -felix-live` is the documented liveness check flag used by the calico-node container.
- `iptables -L -n | grep CALICO` is a valid (though informational) way to inspect Calico's iptables chains on a node using the iptables dataplane.

## Review Notes
- The post's description line contains a minor wording quirk ("for test traffic control"), but this is a stylistic/author choice, not a technical error, so it was left untouched per the review guidelines.
- The `iptables` inspection command only works when Calico is using the iptables dataplane. Clusters using the eBPF or nftables dataplane will not show CALICO chains via this command. The post does not call this out, but it is a reasonable assumption for the audience.
- The conclusion mentions "staged policies" — Calico's StagedGlobalNetworkPolicy / StagedNetworkPolicy resources are the correct mechanism for previewing policy impact before enforcement; this is accurate.
- The recommendation to be careful with host endpoints to avoid SSH lockout is well-founded; Calico's `failsafeInboundHostPorts` / `failsafeOutboundHostPorts` FelixConfiguration settings exist for exactly this reason and could be mentioned in a future revision.

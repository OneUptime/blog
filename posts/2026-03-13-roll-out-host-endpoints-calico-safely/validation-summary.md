# Validation Summary: How to Roll Out Calico Host Endpoint Policies Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Calico HostEndpoint resource (`projectcalico.org/v3`)
- Calico GlobalNetworkPolicy resource
- Felix (Calico's per-node agent)
- calicoctl CLI
- Kubernetes / kubectl
- iptables

## Sources Consulted
- Calico HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Entity rule / ports reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy#entityrule
- calicoctl `get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl `apply` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico host endpoint protection guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Felix liveness/readiness probe pattern (Calico manifests for Kubernetes)

## Issues Found
No technical issues found.

Verification details:
- `HostEndpoint` spec fields `interfaceName`, `node`, and `expectedIPs` are all valid for `projectcalico.org/v3`.
- `GlobalNetworkPolicy` with `applyOnForward: true` and `preDNAT: false` is a valid combination (the constraint is the inverse — `preDNAT: true` requires `applyOnForward: true`).
- Selector syntax `node == 'node01'` correctly matches HostEndpoints labeled with `node: node01`.
- Destination `ports: [22, 443, 6443]` as a YAML array of integers is supported.
- The Felix liveness check `calico-node -felix-live` uses Go-style single-dash long flags, which matches Calico's official manifests.
- All `calicoctl` commands shown (`apply -f`, `get hostendpoints`, `get hostendpoints -o wide`) are valid.

## Review Notes
- The introduction ("Host Protection with Calico Host Endpoints in Calico...") and the conclusion ("Host Protection with Calico Host Endpoints with Calico...") both contain awkwardly repetitive phrasing. This is a stylistic issue, not a technical error, so it was left untouched per the review guidelines.
- The `expectedIPs` field is critical when policies reference the host endpoint by IP or when source/destination IP matching is required for the host — readers may benefit from a future note that `expectedIPs` must match the actual IPs configured on the interface.
- For real-world rollouts, Calico recommends using **pre-DNAT** and/or **failsafe ports** (configured via FelixConfiguration's `failsafeInboundHostPorts`) to avoid lockout, especially for SSH (22) and the Kubernetes API server (6443). The post relies on an explicit `Allow` ingress rule for these ports, which works, but a forward-looking improvement would be to mention Calico's failsafe ports as an additional safety net.
- The `applyOnForward: true` setting means the policy also applies to forwarded traffic (pod-to-pod through the host). This is correct for host-level protection but worth understanding — readers unfamiliar with this flag might apply it too broadly.

# Validation Summary: How to Install Calico CNI on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (installation and configuration walkthrough)

## Technologies Covered
- Calico CNI (v3.27.0)
- Kubernetes
- Tigera Operator
- calicoctl CLI
- BGP / BIRD
- eBPF dataplane
- Felix / Typha
- Kubernetes & Calico Network Policies (NetworkPolicy, GlobalNetworkPolicy)
- IPAM / IP Pools
- Prometheus & Grafana monitoring
- Ubuntu / Linux networking (sysctl, iptables, WireGuard)

## Sources Consulted
- Calico FelixConfiguration reference — https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico FelixConfiguration CRD (v3.27.0) — https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml
- Calico BGPPeer reference — https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP configuration / route reflectors — https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Installation (operator.tigera.io/v1) and manifest install docs — https://docs.tigera.io/calico/latest/

## Issues Found

1. **Invalid FelixConfiguration field `conntrackTableSize`** — The FelixConfiguration spec has no `conntrackTableSize` field (verified against the v3.27.0 CRD; the only conntrack-related fields are `disableConntrackInvalidCheck`, `bpfMapSizeConntrack`, and `bpfHostConntrackBypass`). The iptables-mode conntrack table size is a kernel setting (`nf_conntrack_max`), not a Felix option. Removed the `conntrackTableSize: 512000` line and its comment.

2. **Invalid BGPPeer field `keepAliveTime`** — The BGPPeer spec does not include a `keepAliveTime` field (verified against the BGPPeer reference; valid timing-related fields are limited, e.g. `maxRestartTime`). Removed the `keepAliveTime: 30s` line and clarified the adjacent `sourceAddress` comment to note its accepted values (`UseNodeIP` or `None`).

3. **Deprecated `kubectl version --short` flag** — The `--short` flag was deprecated and removed (error: unknown flag) in newer kubectl releases. Changed `kubectl version --short` to `kubectl version`.

4. **Invalid route-reflector node selector syntax** — `nodeSelector: '!route-reflector == "true"'` is not valid/idiomatic Calico selector syntax (the `!` negation does not combine with `==` this way). Changed to `nodeSelector: "!has(route-reflector)"`, which correctly matches all non-route-reflector nodes (only RR nodes carry the `route-reflector` label in the example).

5. **Wrong format and misleading comment for `bpfPSNATPorts`** — The field is a single port-range value (default `20000:29999`), not a YAML list of two integers, and the `# PSP (Pod Security Policy) compatibility` comment was incorrect (PSNAT = Port Source NAT, unrelated to Pod Security Policy). Changed to `bpfPSNATPorts: "32768:60999"` with a corrected comment.

## Review Notes
- Calico version `v3.27.0` is a real release and all referenced manifest/binary URLs (tigera-operator.yaml, calico.yaml, calicoctl, calicoctl.yaml) use the correct path scheme for that tag.
- All eBPF FelixConfiguration fields used (`bpfEnabled`, `bpfExternalServiceMode: DSR`, `bpfConnectTimeLoadBalancingEnabled`, `bpfKubeProxyIptablesCleanupEnabled`, `bpfHostNetworkedNATWithoutCTLB`, `bpfMapSize*`) were verified against the v3.27.0 CRD and are valid.
- Kubernetes and Calico NetworkPolicy / GlobalNetworkPolicy examples, BGPConfiguration fields (`serviceClusterIPs`, `communities`, `prefixAdvertisements`), IPPool fields, and Installation CR fields are all valid.
- Minor (left as-is, non-blocking): in the Installation custom resource, the comment block describing encapsulation options ("Options: VXLAN, VXLANCrossSubnet, IPIP, ...") sits directly above the `bgp: Disabled` field rather than above the `encapsulation` setting in `ipPools`. The YAML is valid and functions correctly; the comment placement is just slightly misleading and could be repositioned in a future edit.
- `kubectl version` may emit a warning when the server is unreachable but otherwise prints client/server versions correctly across supported releases.

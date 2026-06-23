# Validation Summary: How to Configure Calico CNI for IPv6 Networking in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough)

## Technologies Covered
- Calico CNI (Tigera Operator, v3.27.0)
- Kubernetes (dual-stack and IPv6-only networking)
- IPv6 / IPv4 dual-stack networking
- BGP (BGPConfiguration, BGPPeer, route reflectors, BIRD)
- Calico IPPool, FelixConfiguration, NetworkPolicy, GlobalNetworkPolicy
- Kubernetes Services (ipFamilyPolicy / ipFamilies)
- Linux kernel IPv6 sysctls
- MetalLB, Prometheus ServiceMonitor

## Sources Consulted
- Calico BGPPeer resource reference — https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico FelixConfiguration resource reference — https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico MTU configuration — https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes removed feature gates — https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes validate dual-stack — https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- RFC 6434 (IPv6 Node Requirements — IPsec downgraded from MUST to SHOULD)
- Kubernetes v1.27 release notes (IPv6DualStack feature gate removal)

## Issues Found

1. **Invalid hexadecimal in three IPv6 CIDRs.** `2001:db8:external::/48`, `fd00:prod::/48`, and `fd00:stag::/48` contain non-hex characters (`x, t, r, n, l, p, o, s, g`) and are not valid IPv6 addresses — they would be rejected by the API server / Calico CRD validation. Changed to valid CIDRs: `2001:db8:ffff::/48`, `fd00:1::/48`, and `fd00:2::/48` respectively.

2. **Incorrect claim that IPsec is mandatory in IPv6.** This is a common myth. IPsec was originally mandatory but was downgraded to "SHOULD" (recommended, not required) by RFC 6434. Reworded the benefit bullet to state IPsec support was designed in from the start and is now recommended rather than mandatory.

3. **Obsolete `--feature-gates=IPv6DualStack=true` flag.** Dual-stack reached GA in Kubernetes 1.23 and the feature gate was removed in 1.27 — passing it to kube-apiserver on a modern cluster causes a startup failure. Removed the flag and replaced the comment to note dual-stack is GA/on-by-default since 1.23 (gate removed in 1.27), and that the comma-separated IPv4,IPv6 `--service-cluster-ip-range` is what actually enables dual-stack.

4. **Deprecated `kubectl version --short`.** The `--short` flag was deprecated and removed from newer kubectl releases. Changed to plain `kubectl version` and updated the comment to reference 1.23+ for GA dual-stack.

5. **Invalid `keepAliveTime` / `holdTime` fields in BGPPeer.** These fields do not exist in the Calico BGPPeer spec (verified against the official BGPPeer reference). They would be rejected by CRD schema validation. Removed both fields from the external-router BGPPeer example.

6. **Invalid `mtu` field in FelixConfiguration.** FelixConfiguration has no top-level `mtu` field; MTU is configured on the Installation resource (`calicoNetwork.mtu`) or via per-tunnel fields (`vxlanMTU`, `wireguardMTU`). Replaced the `mtu: 1500` line with an explanatory comment, and updated the summary-table row from `felixConfiguration.mtu` to `calicoNetwork.mtu` (Installation).

## Review Notes
- Address-space math is correct: 2^128 ≈ 3.4 × 10^38 ("340 undecillion"); a `/48` yields 65,536 `/64` subnets; `/122` = 64 addresses, `/120` = 256, `/116` = 4096.
- `birdcl6` is the correct IPv6 BIRD control utility shipped in calico-node, and `bird6`/`ip6tables` references are accurate.
- The Tigera Operator install URL pattern (`.../calico/v3.27.0/manifests/tigera-operator.yaml`) is valid; v3.27 is a real release. Readers on newer clusters may wish to use a more recent Calico release.
- `flowLogsFlushInterval` in the FelixConfiguration example is valid in open-source Calico v3.30+ (flow logs / Whisker). On the v3.27 release referenced for installation it may not be honored; left in place as it is forward-compatible, but worth noting as a version caveat.
- Operator IPPool fields (`encapsulation`, `natOutgoing: Enabled/Disabled`) and CRD IPPool fields (`ipipMode`, `vxlanMode`, `natOutgoing: true/false`) are correctly distinguished between the two APIs.
- `iptablesBackend: Auto` in FelixConfiguration is valid and was retained.
- The "1.21+/1.23+" dual-stack maturity references are now consistent and accurate (beta-on-by-default in 1.21, GA in 1.23).

# Validation Summary: How to Optimize Service IP Advertisement with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (BGP service advertisement, eBPF dataplane, BGPConfiguration, FelixConfiguration)
- Kubernetes Services (`externalTrafficPolicy`, ClusterIP, LoadBalancer)
- BGP (ECMP, communities, prefix advertisements)
- BIRD (`birdcl`)
- `calicoctl`

## Sources Consulted
- Calico advertise service IPs documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico BGPConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico eBPF mode enablement: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Kubernetes Services `externalTrafficPolicy`: https://kubernetes.io/docs/reference/networking/virtual-ips/#external-traffic-policy
- BIRD protocol naming conventions in Calico `confd` templates (`Mesh_<ip_with_underscores>`, `Node_<peer>`, `Global_<peer>`)
- Cross-referenced sibling posts in this repo for codebase conventions: `posts/2026-03-13-validate-service-ip-advertisement-calico/README.md`, `posts/2026-03-13-troubleshoot-service-ip-advertisement-calico/README.md`, `posts/2026-03-13-secure-service-ip-advertisement-calico/README.md`

## Issues Found
- The verification command `birdcl show route export BGP_<peer_ip>` used the wrong protocol-name prefix. Calico's `confd`-generated BIRD configuration names peers as `Mesh_<ip_with_underscores>` for the node-to-node mesh and `Node_<name>` or `Global_<name>` for explicit BGPPeers — never `BGP_`. Used literally as written, this command would fail with an unknown protocol error. I simplified it to `birdcl show route | grep "10.96"`, which matches the convention used in the related `validate-service-ip-advertisement-calico` post and works regardless of peer naming.

## Review Notes
- The framing in the introduction ("Default Calico service IP advertisement uses a single route per service") is slightly imprecise: Calico actually announces the service CIDR from every node, and the single-node convergence behavior comes from upstream routers without ECMP collapsing equal-cost paths to one best path. The subsequent paragraphs and the ECMP section clarify the real picture, so I left the wording alone to preserve the author's voice.
- The `BGPConfiguration` snippet uses current API fields (`communities` with `name`/`value`, `prefixAdvertisements` with `cidr`/`communities`) — verified against the Calico resource reference.
- The `calicoctl patch felixconfiguration default --type merge --patch '{"spec":{"bpfEnabled":true}}'` command is the correct minimal action to enable eBPF mode, but in practice operators should follow the full enablement procedure (disabling kube-proxy, setting the Kubernetes service host/port, etc.) for a working setup. The post does not claim this is the only step, so it remains accurate as written.
- With `externalTrafficPolicy: Local`, Calico's behavior of advertising the service IP only from nodes with a local healthy endpoint is correctly described and matches the official documentation.
- The Mermaid diagram uses `\n` for label line breaks; this is supported in current Mermaid versions used by the site.

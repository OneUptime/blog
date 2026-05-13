# Validation Summary: Configure Calico Node Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration and BGPConfiguration custom resources
- Calico node IP autodetection
- Calico eBPF, iptables, nftables, and VPP dataplanes
- BGP routing
- `kubectl` and `calicoctl`

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico IP autodetection guide: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico eBPF enablement guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post said Felix detects the node IP address. Calico node autodetection configures the node IP used for inter-node routing, so the wording was corrected.
- The post only described `IP_AUTODETECTION_METHOD` on the `calico-node` DaemonSet. Official Calico documentation says operator installations should configure `nodeAddressAutodetectionV4` in the `Installation` resource, while DaemonSet environment variables apply to manifest-based installations. Added the operator example and scoped the DaemonSet example to manifest installs.
- The interface autodetection example used `interface=eth0`, but Calico documents this method as a regex match. Updated the example to `interface=eth.*`.
- The eBPF section stated kernel 5.3+ and used `kubectl patch installation default`. Current Calico documentation lists Linux kernel 5.10+ for generic supported distributions and uses `installation.operator.tigera.io` for operator changes. Updated the requirement wording and command.
- The Felix example set `deviceRouteSourceAddress` to an empty string. Official docs describe this as an optional IPv4 source hint where the unset case lets the kernel choose. Changed it to a commented example with a valid IPv4 address.

## Review Notes
- The BGPConfiguration example, per-node FelixConfiguration naming pattern, `calicoctl get nodes -o wide`, Felix metrics fields, failsafe host ports, and main Felix fields reviewed are consistent with current Calico documentation.
- Calico eBPF enablement has additional operational prerequisites, including kube-proxy handling and platform limitations, that are outside this post's current scope but worth covering in a deeper production guide.

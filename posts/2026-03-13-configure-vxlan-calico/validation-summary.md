# Validation Summary: How to Configure VXLAN in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IPPool resources
- calicoctl
- Linux iproute2 networking commands
- tcpdump

## Sources Consulted
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN), https://www.rfc-editor.org/rfc/rfc7348
- Linux manual page: bridge(8), https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux manual page: ip-neighbour(8), https://man7.org/linux/man-pages/man8/ip-neighbour.8.html

## Issues Found
- The command `arp -n | grep "vxlan"` used the legacy ARP tool and depended on grepping interface text from generic ARP output. Changed it to `ip neigh show dev vxlan.calico`, which directly queries the Linux neighbor table for the Calico VXLAN device.
- The command `kubectl get nodes -o yaml | grep -A5 vxlanTunnelMACAddr` queried core Kubernetes Node objects, while `vxlanTunnelMACAddr` is documented on Calico Node resources. Changed it to `calicoctl get node -o yaml | grep -A5 vxlanTunnelMACAddr`.

## Review Notes
The IPPool fields `vxlanMode: Always`, `ipipMode: Never`, and `natOutgoing: true` are consistent with current Calico documentation. Calico also supports `vxlanMode: CrossSubnet` for selective encapsulation, but `Always` is valid for the tutorial's stated goal.

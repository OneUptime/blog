# Validation Summary: How to Troubleshoot VXLAN in Calico

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- Linux networking tools
- tcpdump

## Sources Consulted
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: Configure MTU, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN), https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The post stated that VXLAN uses UDP port 4789 without noting that this is the default. Calico exposes VXLAN port configuration, so the wording was updated to say that UDP 4789 is the default and that nodes must reach each other on the configured VXLAN port.
- The neighbor-table command used `arp -n | grep "vxlan"`. This may work on systems with net-tools installed, but `ip neigh show dev vxlan.calico` is the current Linux iproute2 command and directly scopes the output to the VXLAN device. The command was updated.
- The post used `kubectl get nodes -o yaml | grep -A5 vxlanTunnelMACAddr` to inspect Calico VTEP fields. `vxlanTunnelMACAddr` is part of the Calico Node resource, not the core Kubernetes Node output. The command was changed to `calicoctl get nodes -o yaml | grep -A5 vxlanTunnelMACAddr`.

## Review Notes
The IPPool example, `vxlanMode: Always`, `natOutgoing: true`, VXLAN MTU overhead for IPv4, and the use of `bridge fdb show dev vxlan.calico` and `tcpdump` for encapsulation checks are technically sound. The post assumes a Linux Calico deployment using the standard VXLAN device name and the default VXLAN port; clusters with customized Felix VXLAN settings should adjust commands accordingly.

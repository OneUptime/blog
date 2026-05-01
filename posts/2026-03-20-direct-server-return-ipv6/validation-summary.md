# Validation Summary: How to Implement Direct Server Return (DSR) with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- Neighbor Discovery Protocol (NDP)
- Linux Virtual Server (LVS) / IPVS
- `ipvsadm`
- Linux networking (`ip`, `sysctl`, `tcpdump`)
- HAProxy

## Sources Consulted
- `ipvsadm(8)` Debian manpage: https://manpages.debian.org/testing/ipvsadm/ipvsadm.8.en.html
- Linux kernel `ip-sysctl` documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- HAProxy transparent proxying documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/transparent-proxying/
- HAProxy ALOHA Direct Server Return documentation: https://www.haproxy.com/documentation/haproxy-aloha/load-balancing/layer-4/direct-server-return/
- Red Hat LVS direct routing documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/s1-lvs-direct-vsa

## Issues Found
- The post used invalid placeholder IPv6 addresses such as `2001:db8::vip` and `2001:db8::server1`. These were replaced with valid documentation addresses in `2001:db8::/32`.
- The load balancer setup omitted assigning the VIP to the external interface, which is required for the load balancer to answer NDP for the VIP on the network. That command was added.
- The `ipvsadm` examples used `-6` with address-based `-t` services. Per the `ipvsadm` manpage, `-6` is for IPv6 fwmark services; bracketed IPv6 addresses are the correct syntax for normal virtual services. The commands were corrected accordingly.
- The real-server response path was described incorrectly. In DSR, the real server replies directly to the client using the VIP as the source address, not the server's own real address. The explanatory comments and verification guidance were corrected.
- The NDP explanation was inaccurate. A `/128` does not inherently stop solicited-node multicast behavior; the important detail is that the VIP is configured only on loopback and not on the external NIC. The text was corrected to reflect that.
- The suggested `ip6tables` rule was misleading because IPv6 address-resolution Neighbor Solicitations are sent to the solicited-node multicast address, not to the VIP itself. That guidance was replaced with a correct warning.
- The HAProxy section incorrectly presented ordinary HAProxy transparent proxying as DSR-like behavior. It was replaced with a note explaining that standard HAProxy proxy mode is not true DSR and that true DSR requires LVS/IPVS or a load balancer with explicit direct-routing/gateway support.

## Review Notes
- The post now correctly assumes that the director owns the VIP on the external segment and that the real servers share the same L2 network with the director for DR mode.
- Example commands still use `eth0` as the interface name; readers should substitute their actual NIC name where needed.

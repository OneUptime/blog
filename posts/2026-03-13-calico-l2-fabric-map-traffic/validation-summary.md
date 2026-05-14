# Validation Summary: How to Map L2 Interconnect Fabric with Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source networking
- Kubernetes pod networking
- VXLAN encapsulation
- IP-in-IP encapsulation
- Calico CrossSubnet mode
- Linux `ip`, `bridge`, and `tcpdump`
- Kubernetes `kubectl exec`

## Sources Consulted
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `bridge(8)` manual: https://man7.org/linux/man-pages/man8/bridge.8.html
- Local `tcpdump --help` output for option syntax

## Issues Found
- The introduction and conclusion described all covered traffic as "L2 overlay traffic." VXLAN carries layer-2 frames over UDP, but IP-in-IP is an IP tunnel rather than an L2 overlay. I changed those statements to use the broader "overlay encapsulation" wording.
- The VXLAN sequence diagram described the FDB lookup as `10.0.2.5 MAC -> Node2-IP`, which incorrectly implies a pod MAC lookup. I changed it to describe the remote `vxlan.calico` MAC mapping to the remote node IP.
- The VXLAN route example used a fixed `src 10.0.1.1` route shape. Calico VXLAN routes commonly use the remote VXLAN tunnel IP as a next hop over `vxlan.calico`, and exact values vary by IPPool block and node allocation. I changed the expected output to use `<Node2-vxlan-tunnel-IP>` and added that caveat.
- The VXLAN FDB command used `<Node2-MAC>`, which was ambiguous. I changed it to `<Node2-vxlan-MAC>` and adjusted the expected output to include `dev vxlan.calico`.
- The CrossSubnet example used `POD_SAME_NODE_IP` for a same-subnet case and said "VXLAN packets" would be captured on `vxlan.calico`. I changed the variable and comments to distinguish same-subnet remote traffic from same-node traffic, and to clarify that `vxlan.calico` shows inner pod packets while encapsulated UDP/4789 packets are visible on the physical NIC.

## Review Notes
The post remains version-neutral and aligns with Calico 3.32 documentation. Interface names such as `vxlan.calico`, `tunl0`, and `cali*`, IP-in-IP protocol 4, and VXLAN UDP/4789 are current for Calico Open Source. The exact route and FDB entries are deployment-dependent, so the examples should be treated as expected shapes rather than byte-for-byte output.

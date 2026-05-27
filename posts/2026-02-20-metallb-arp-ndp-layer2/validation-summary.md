# Validation Summary: How to Understand ARP and NDP in MetalLB Layer 2 Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB Layer 2 mode
- ARP
- IPv6 Neighbor Discovery Protocol (NDP)
- Linux networking commands
- tcpdump
- arping

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB usage guide for traffic policy behavior: https://metallb.io/usage/index.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes virtual IPs and Service proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips
- RFC 826, Address Resolution Protocol: https://datatracker.ietf.org/doc/rfc826/
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/info/rfc4861
- Linux kernel IP sysctl documentation for neighbor cache timers: https://docs.kernel.org/networking/ip-sysctl.html
- Microsoft ARP cache behavior documentation: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/address-resolution-protocol-arp-caching-behavior
- MetalLB ARP/NDP implementation source: https://github.com/metallb/metallb/tree/main/internal/layer2
- iputils arping source: https://github.com/iputils/iputils/blob/master/arping.c
- pcap-filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- Clarified Kubernetes Service traffic-policy behavior. The original text implied kube-proxy always forwards traffic to pods on any node. With `externalTrafficPolicy: Local`, traffic is routed only to ready node-local endpoints, so the post now distinguishes default `Cluster` behavior from `Local` behavior.
- Corrected the description of MetalLB Layer 2 leader election. The original text implied a coordinated election through memberlist. MetalLB uses stateless hash-based selection per VIP; memberlist provides active speaker information.
- Made the speaker log command more portable by using the documented `component=speaker` label selector instead of requiring both `app=metallb` and `component=speaker`.
- Corrected the failover diagram's switch behavior. Ethernet switches learn MAC addresses on ports; they do not update an IP-to-MAC table for the VIP.
- Corrected the gratuitous ARP description. MetalLB sends both gratuitous ARP request and reply packets for the VIP, not only an unsolicited ARP reply.
- Adjusted Linux ARP cache timing. Linux neighbor cache entries commonly become STALE after a randomized reachable time around 15 to 45 seconds, with garbage collection commonly using 60 seconds.
- Softened overly absolute failover statements. Gratuitous ARP/NDP usually updates modern clients promptly, but MetalLB documentation notes that some client or network behavior can delay cache updates.
- Removed advice to lower a memberlist probe interval through Helm values or ConfigMap. Current MetalLB public configuration documentation does not present this as the standard fix for slow L2 failover; the post now recommends measuring failover and investigating client or network handling when failover is slower than about 10 seconds.

## Review Notes
The remaining examples are diagnostic commands rather than deployable configuration. The `tcpdump` ICMPv6 offset filter is acceptable for simple NDP captures without IPv6 extension headers, but a future troubleshooting-focused post could mention that more complex IPv6 packets may require broader capture filters and inspection in Wireshark or tcpdump verbose output.

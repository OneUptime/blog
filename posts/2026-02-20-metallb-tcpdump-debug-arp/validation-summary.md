# Validation Summary: How to Use tcpdump to Debug MetalLB ARP Replies

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services and `kubectl debug`
- MetalLB Layer 2 mode
- ARP and gratuitous ARP behavior
- `tcpdump` and pcap filter syntax
- Linux networking commands

## Sources Consulted
- MetalLB Layer 2 mode documentation: https://metallb.io/concepts/layer2/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- pcap-filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Local `tcpdump --help`, `tcpdump -d`, `tcpdump(8)`, and `pcap-filter(7)` output

## Issues Found
- The healthy ARP sample showed the ARP request source MAC as the MetalLB leader MAC. Changed it to the requester MAC so the request and reply direction match normal ARP behavior.
- The ARP storm section said a healthy cluster sends one gratuitous ARP during failover. MetalLB documents that it sends a number of gratuitous/unsolicited layer 2 packets, so the wording now says a small burst.
- The quick reference command labeled "Gratuitous ARPs only" used `arp[6:2] = 2`, which matches all ARP replies, not only gratuitous ARPs. Replaced it with a filter matching ARP packets where the sender and target protocol address are both the example LoadBalancer IP.

## Review Notes
- The `kubectl debug node/... --profile=netadmin` usage is consistent with current Kubernetes debug profiles, but clusters with older `kubectl` versions may not support all profile behavior.
- Capturing on `-i any` is useful on Linux for broad visibility, but a specific Ethernet interface is still better when exact link-layer MAC headers matter.

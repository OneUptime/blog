# Validation Summary: How to Fix MetalLB Layer 2 Services Not Reachable from External Clients

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- MetalLB Layer 2 mode
- ARP and NDP
- kube-proxy IPVS mode
- EndpointSlices
- Linux firewall tooling
- Hypervisor anti-spoofing

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB cloud compatibility notes: https://metallb.io/installation/clouds/
- MetalLB native installation manifests: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Kubernetes kube-proxy configuration API: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes Service and Endpoints deprecation documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- arping manual page: https://man7.org/linux/man-pages/man8/arping.8.html

## Issues Found
- The initial text suggested pinging the LoadBalancer IP as a reachability test. MetalLB's official troubleshooting guide notes that pinging the service IP is not a valid service test, so the wording now uses curl instead.
- The Layer 2 traffic diagram implied that application TCP traffic flows to the MetalLB speaker pod. MetalLB's speaker answers ARP/NDP, while data traffic lands on the announcing node and is then handled by kube-proxy/CNI. The diagram was corrected to show the TCP SYN going to the announcing node.
- The speaker pod selector used `app=metallb-speaker`, which does not match the current official native manifests. Commands now use `app=metallb,component=speaker`.
- The post relied on a specific `serviceAnnounced` log as the healthy indicator. Official troubleshooting guidance recommends checking Service events for the announcing node, so the post now includes `kubectl describe svc my-service` and describes the Service event.
- The firewall section said normal node firewalls can silently drop ARP packets while showing iptables service-port checks. The wording now distinguishes TCP/UDP service-port firewall rules from ARP filtering mechanisms such as nftables bridge rules, arptables, switch security, or hypervisor anti-spoofing.
- The subnet/VLAN section said the client itself must be on the same Layer 2 broadcast domain. The wording now accounts for routed clients where the gateway is the device resolving the LoadBalancer IP with ARP.
- The hypervisor anti-spoofing explanation said the issue is a MAC mismatch. MetalLB replies with the node interface MAC for a service IP, so the explanation now states that the hypervisor may block announcements for an IP address it did not assign to the VM.
- The backend health check used the deprecated Kubernetes Endpoints API. The commands and checklist now use EndpointSlices via the `kubernetes.io/service-name` label.
- The duplicate-IP check used `arping -D` against an IP that MetalLB may already be announcing, which would make MetalLB's own reply look like duplicate-address detection. The command now uses normal `arping` output and instructs readers to look for multiple MAC addresses for the same IP.

## Review Notes
The Proxmox and VMware examples are environment-specific operational guidance rather than Kubernetes or MetalLB API requirements. They are plausible as troubleshooting pointers, but production changes should preserve existing VM network settings such as VLAN tags and MAC addresses.

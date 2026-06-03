# Validation Summary: How to Use traceroute in Kubernetes for Network Path Analysis

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Linux traceroute
- tcptraceroute
- mtr
- kube-proxy Services and NodePort
- NAT and egress routing
- IPv6 tracing
- MTU discovery
- Service mesh sidecars

## Sources Consulted
- Linux traceroute man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Source IP for Services tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Official mtr repository: https://github.com/traviscross/mtr
- Debian tcptraceroute man page: https://manpages.debian.org/bookworm/tcptraceroute/tcptraceroute.1.en.html

## Issues Found
- The post said ICMP traceroute was the default. Linux traceroute defaults to UDP probes, so the protocol examples were corrected to show UDP as default, ICMP with `-I`, and TCP with `-T -p 443` or `tcptraceroute`.
- The TCP traceroute section labeled a command as installing `tcptraceroute` even though it ran the command. The comment was corrected to "Run tcptraceroute."
- The NAT section implied traceroute should show the NAT gateway and public egress IP. This was corrected because NAT devices may not respond or appear as separate hops, and traceroute does not directly reveal the public source IP.
- The Kubernetes Service section implied traceroute could reveal kube-proxy iptables rules or route directly to a single endpoint. It now uses TCP traceroute to the service port and explains that kube-proxy translation is packet-processing behavior, not a visible hop.
- The service mesh example ran traceroute from the `istio-proxy` container and implied traceroute reveals proxy routing. It was corrected to run from the application container and clarify that traceroute shows IP-layer hops, not the full logical Envoy route.
- The NodePort pod example traced a service name rather than a node IP and NodePort. It now traces `NODE-IP` with `-T -p 30080`.
- The MTU example used `-F` without a packet size while describing a large-packet test. It now supplies a packet length.
- The monitoring script parsed a fragile traceroute field and depended on `bc`. It now quotes the destination, runs traceroute once, extracts the last numeric millisecond value more safely, and uses `awk` for the numeric threshold comparison.

## Review Notes
The post is technically relevant and useful after correction. Some traceroute behavior remains environment-dependent because CNI plugins, cloud routing, firewalls, kube-proxy mode, and service mesh interception mode can change what appears in output.

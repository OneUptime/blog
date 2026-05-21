# Validation Summary: How to Handle Traffic Redirection in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio CNI
- Kubernetes
- iptables/netfilter
- HBONE
- Kubernetes pod annotations and labels

## Sources Consulted
- Istio ambient traffic redirection documentation: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ambient getting started and workload enrollment documentation: https://istio.io/latest/docs/ambient/getting-started/secure-and-visualize/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio 1.25 upgrade notes for ambient DNS capture: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/upgrade-notes/
- Istio eBPF ambient redirection blog, retained for historical context: https://istio.io/latest/blog/2023/ambient-ebpf-redirection/
- Istio ambient and Kubernetes NetworkPolicy documentation for health probe handling: https://istio.io/latest/docs/ambient/usage/networkpolicy/
- Istio ambient L4 policy documentation: https://istio.io/latest/docs/ambient/usage/l4-policy/

## Issues Found
- The post described ambient redirection as node-level redirection and implied eBPF is a current supported redirection mode. Updated the description to match the current documented in-pod iptables/netfilter redirection model; noted that eBPF was an earlier experimental/historical approach.
- The iptables inspection example used container runtime PID lookup. Replaced it with the official `kubectl debug ... --profile=netadmin -- iptables-save` style command.
- The example iptables rule used an inaccurate mark-only rule. Replaced it with a representative current outbound `REDIRECT --to-ports 15001` rule from the Istio ambient traffic-redirection documentation.
- The traffic flow stated that source-side ztunnel applies L4 authorization policies. Updated the flow to describe L4 authorization on the receiving path, consistent with Istio ambient L4 policy documentation.
- The traffic exclusion annotations used the incorrect `traffic.istio.io/*` prefix. Corrected them to `traffic.sidecar.istio.io/*`, which is the prefix in the official Istio annotations reference.
- The DNS troubleshooting section said DNS is typically excluded from redirection. Updated it to note that Istio 1.25 and later enable ambient DNS proxying by default for new pods.
- The startup ordering section claimed the CNI plugin waits or skips setup based on ztunnel readiness. Updated it to the documented behavior that the chained CNI plugin notifies the node agent and blocks pod startup until redirection is configured.
- The performance section claimed eBPF redirection has lower overhead and that ambient rules do not scale with pod count. Updated it to avoid the obsolete eBPF claim and clarify that each enrolled pod still has rules in its own network namespace.

## Review Notes
The post is now aligned with current Istio documentation, but the exact iptables output remains version- and configuration-dependent. Future edits should avoid presenting eBPF ambient redirection as current behavior unless Istio reintroduces and documents it in supported install options.

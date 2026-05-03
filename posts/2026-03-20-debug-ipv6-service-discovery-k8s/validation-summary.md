# Validation Summary: How to Debug IPv6 Service Discovery Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Kubernetes (dual-stack IPv4/IPv6)
- CoreDNS
- kube-proxy (ip6tables mode)
- EndpointSlices API
- kubectl
- busybox / netshoot debug images
- nslookup, dig
- ip6tables

## Sources Consulted
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service spec (`ipFamilyPolicy`, `ipFamilies`, `clusterIPs`): https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- Kubernetes EndpointSlice docs and labels (`kubernetes.io/service-name`): https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- kube-proxy iptables/ip6tables reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- BusyBox nslookup applet (supports `-type=` including AAAA since v1.28+): https://busybox.net/downloads/BusyBox.html
- nicolaka/netshoot debugging image: https://github.com/nicolaka/netshoot

## Issues Found
- **dig not available in busybox**: Step 2 created a debug pod with `--image=busybox:1.36` and then attempted `kubectl exec -it dns-test -- dig AAAA ...`. The busybox image does not ship `dig`, so the command would fail with "command not found". Changed the debug image to `nicolaka/netshoot`, which is the standard Kubernetes troubleshooting image and includes both `nslookup` (with `-type=` support) and `dig`. This is a single-line fix that preserves the post's intent and keeps both subsequent commands valid.

## Review Notes
- The post correctly states that `ip6tables` rules are programmed by kube-proxy in iptables mode. If a cluster uses kube-proxy in `ipvs` mode or replaces kube-proxy with eBPF (e.g., Cilium kube-proxy replacement), `ip6tables -t nat -L KUBE-SERVICES` will not show service rules. The opening paragraph mentions "kube-proxy (or eBPF)", so readers are nudged toward this nuance, but Step 5 could optionally add a note for IPVS/eBPF users in a future revision.
- The YAML snippet in Step 1 is shown as a partial spec patch (missing `apiVersion`/`kind`/`metadata`); this is acceptable as it is clearly labeled as a patch, not a complete manifest.
- `kubectl exec -it` is used for non-interactive one-shot commands. This works but `-it` is unnecessary; harmless and idiomatic-enough not to flag.
- The CoreDNS service is correctly referenced as `kube-dns` (the historical service name retained for backward compatibility even when CoreDNS is the implementation).

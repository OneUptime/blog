# Validation Summary: How to Handle DNS Resolution Order in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy sidecars
- Kubernetes DNS and CoreDNS
- Kubernetes Services and headless Services
- Istio ServiceEntry
- Istio Sidecar resource
- Istio outbound traffic policy

## Sources Consulted
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Understanding DNS: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- Corrected the dot count for `api.example.com` from 3 dots to 2 dots.
- Removed `ISTIO_META_DNS_AUTO_ALLOCATE` from the DNS proxy examples and replaced the follow-up explanation with current ServiceEntry auto-allocation guidance using the `networking.istio.io/enable-autoallocate-ip` label.
- Clarified that Sidecar egress scoping limits generated proxy configuration, but does not by itself always block unmatched outbound traffic. Whether unmatched traffic is rejected depends on the outbound traffic policy.
- Corrected the ServiceEntry `resolution: DNS` explanation. Istio proxy DNS resolution is asynchronous and periodic, not a synchronous per-connection lookup that simply respects the DNS TTL.
- Added the current `DNS_ROUND_ROBIN` and `DYNAMIC_DNS` ServiceEntry resolution options so the list is no longer incomplete.
- Changed the debugging DNS lookup command to run `dig` in the workload pod's default container instead of the `istio-proxy` container.

## Review Notes
The post remains a useful guide after these corrections. Some examples use placeholder pod and service names; they are acceptable as illustrative commands, but real clusters may require specifying the workload container with `-c` when a pod has multiple containers.

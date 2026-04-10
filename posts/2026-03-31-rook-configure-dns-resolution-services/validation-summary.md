# Validation Summary: How to Configure DNS Resolution for Rook-Ceph Services

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- CoreDNS (Kubernetes cluster DNS)
- Kubernetes Services and DNS resolution
- Ceph Object Gateway (RGW)
- external-dns (Kubernetes add-on for external DNS management)
- Prometheus (monitoring CoreDNS metrics)

## Sources Consulted
- Rook documentation on CephObjectStore CRD and RGW gateway configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Kubernetes DNS specification for Services: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS Corefile plugin documentation: https://coredns.io/plugins/
- CoreDNS Kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- external-dns documentation: https://github.com/kubernetes-sigs/external-dns

## Issues Found
1. **Incorrect RGW targetPort (line 132)**: The external Service for RGW specified `targetPort: 7480`. Port 7480 is the raw Ceph RGW default (beast/civetweb frontend), but Rook configures the RGW daemon to listen on port **8080** by default via the `rgw_frontends` beast endpoint configuration. Changed `targetPort: 7480` to `targetPort: 8080`.

## Review Notes
- The RGW external Service selector uses `app: rook-ceph-rgw`, which matches all RGW pods across all object stores. For multi-store deployments, a more specific selector adding `rook_object_store: my-store` would be needed. This is acceptable for the single-store example in the post.
- The Prometheus query `coredns_dns_request_duration_seconds` references the base name of a histogram metric. In practice, a more useful query would use `histogram_quantile()` over the `_bucket` suffix, e.g., `histogram_quantile(0.99, rate(coredns_dns_request_duration_seconds_bucket[5m]))`. The current query will return raw histogram data, which is less actionable but not technically wrong.
- The CoreDNS debug logging snippet (Step 3) is tagged as YAML but is actually Corefile syntax. The directives `log` and `errors` must be placed inside the `.:53 { }` server block to take effect. The post says "Add to Corefile" but doesn't specify the exact placement within the block.

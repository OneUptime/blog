# Validation Summary: How to Configure ServiceEntry with DNS Resolution

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio mesh configuration
- Envoy DNS resolution
- Kubernetes
- istioctl
- kubectl

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DNS traffic management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio egress control task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio DYNAMIC_DNS wildcard egress documentation: https://istio.io/latest/blog/2026/egress-dynamic-dns/

## Issues Found
- The post said ServiceEntry supported three resolution types while listing four. Updated the overview to cover the current documented set, including `DYNAMIC_DNS`.
- The post said `resolution: DNS` caches results based on DNS TTL. Updated this to say Envoy refreshes DNS results periodically, and noted the current `meshConfig.dnsRefreshRate` default of `60s`.
- The `DNS_ROUND_ROBIN` explanation incorrectly described even round-robin distribution across all DNS results. Updated it to match Istio's documented behavior: it uses the first IP returned for new connections and reduces connection-pool churn when records change frequently.
- The wildcard guidance implied `NONE` was the only typical option. Updated it to mention `DYNAMIC_DNS` for wildcard HTTP/TLS or HTTPS destinations in supported Istio versions.
- The troubleshooting command ran `nslookup` in the `istio-proxy` container, where it may not be available and does not test application-container DNS behavior. Updated it to run from the workload container.
- The troubleshooting notes suggested checking `istiod` logs for runtime DNS resolution failures. Updated this to check the sidecar proxy logs, since proxy DNS resolution happens in Envoy.

## Review Notes
The ServiceEntry YAML examples use the current `networking.istio.io/v1` API and valid ServiceEntry fields. The `istioctl proxy-config endpoints` and `kubectl` commands are syntactically valid, though the example container name `app` should be replaced with the actual workload container name in a real deployment.

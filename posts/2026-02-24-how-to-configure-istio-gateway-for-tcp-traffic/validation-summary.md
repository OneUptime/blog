# Validation Summary: How to Configure Istio Gateway for TCP Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Kubernetes Services
- TCP routing
- TLS termination and passthrough
- Prometheus metrics
- istioctl
- kubectl

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ingress SNI passthrough task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio 1.30 gateway chart default values: https://raw.githubusercontent.com/istio/istio/release-1.30/manifests/charts/gateway/values.yaml
- Istio 1.30 legacy ingress gateway values: https://raw.githubusercontent.com/istio/istio/release-1.30/manifests/charts/gateways/istio-ingress/values.yaml

## Issues Found
- The post said TCP gateway routing decisions could be based on source IP. Istio VirtualService L4 and TLS match attributes support port, destination subnets, SNI for TLS, source workload labels, and source namespace selectors, but not direct source-IP routing. Changed the bullet to mention destination subnet and source workload selectors with limitations.
- The TLS termination example said a Gateway using `protocol: TLS` with `tls.mode: SIMPLE` should be paired with a VirtualService `tls` route. Istio's `tls` VirtualService routes are for non-terminated TLS or HTTPS traffic, including passthrough TLS. Changed the SIMPLE termination example to use `tcp` routing for the decrypted opaque stream.
- The TLS passthrough section showed only the Gateway. For `tls.mode: PASSTHROUGH`, Istio routes by SNI with a VirtualService `tls` route, so I added the matching VirtualService example there.

## Review Notes
The remaining examples use current `networking.istio.io/v1` APIs and valid Gateway, VirtualService, and Service fields. The default ingress gateway ports vary by installation method, but the post's main point that custom TCP ports must be exposed on the gateway Service is correct for standard Istio gateway installs.

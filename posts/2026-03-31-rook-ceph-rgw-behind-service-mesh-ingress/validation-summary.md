# Validation Summary: How to Set Up Ceph RGW Behind Service Mesh Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph Operator (CephObjectStore CRD)
- Ceph RADOS Gateway (RGW)
- Istio Service Mesh (Gateway, VirtualService)
- cert-manager (Certificate, ClusterIssuer)
- Kubernetes (Services, DNS)
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Rook Ceph CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Istio Gateway API reference (https://istio.io/latest/docs/reference/config/networking/gateway/)
- Istio VirtualService API reference (https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- Istio ServerTLSSettings reference for httpsRedirect (https://istio.io/latest/docs/reference/config/networking/gateway/#ServerTLSSettings)
- cert-manager Certificate resource documentation (https://cert-manager.io/docs/usage/certificate/)
- Envoy retry policy documentation for retryOn conditions (https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on)

## Issues Found
No technical issues found.

## Review Notes
- The post uses the traditional Istio networking API (`networking.istio.io/v1beta1` with `Gateway`/`VirtualService`) rather than the newer Kubernetes Gateway API (`gateway.networking.k8s.io`). The traditional API is still fully supported and not deprecated, so this is not an error, but authors may want to consider covering the Kubernetes Gateway API approach in a future post as Istio continues to encourage migration.
- The `retryOn` values (`5xx,reset,connect-failure`) are valid Envoy retry conditions and appropriate for S3 traffic patterns.
- The 300s timeout on the VirtualService is reasonable for large object uploads/downloads via RGW.

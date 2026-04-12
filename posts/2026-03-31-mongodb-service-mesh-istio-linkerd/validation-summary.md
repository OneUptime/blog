# Validation Summary: How to Use MongoDB with Service Mesh (Istio/Linkerd)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (Wire Protocol, Atlas)
- Istio (ServiceEntry, PeerAuthentication, DestinationRule, VirtualService, TCP metrics)
- Linkerd (opaque-ports annotation)
- Kubernetes (Service manifests)
- Prometheus (Istio TCP metrics)

## Sources Consulted
- Istio documentation on ServiceEntry protocol types (MONGO is a recognized protocol): https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio documentation on PeerAuthentication (security.istio.io/v1beta1): https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio documentation on DestinationRule ConnectionPoolSettings.TCPSettings: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference (istio_tcp_sent_bytes_total, istio_tcp_connections_opened_total): https://istio.io/latest/docs/reference/config/metrics/
- Linkerd documentation on opaque ports annotation (config.linkerd.io/opaque-ports): https://linkerd.io/2/reference/proxy-configuration/
- Istio VirtualService TCP routing: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
1. **Incorrect Prometheus metric comment**: The comment `# Active TCP connections to MongoDB` above `istio_tcp_connections_opened_total` was misleading. This metric is a monotonically increasing counter of total TCP connections ever opened, not a gauge of currently active connections. Changed the comment to `# Total TCP connections opened to MongoDB` to accurately describe the metric.

## Review Notes
- The Istio API version `networking.istio.io/v1alpha3` used throughout the post is still valid but is the older API version. Newer Istio releases (1.22+) prefer `networking.istio.io/v1`. This is not an error but could be updated in the future.
- The `protocol: MONGO` in the ServiceEntry enables Envoy's MongoDB proxy filter for wire protocol inspection. However, for MongoDB Atlas connections (which require TLS), the sidecar won't be able to parse the already-encrypted wire protocol, so the practical benefit of MONGO vs TCP is limited in that specific scenario. This is a nuance, not an error.
- All YAML manifests are syntactically correct and use valid field names and values for their respective Istio/Linkerd/Kubernetes resources.

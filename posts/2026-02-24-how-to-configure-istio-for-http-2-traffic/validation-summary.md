# Validation Summary: How to Configure Istio for HTTP/2 Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio traffic management
- Kubernetes Services and Deployments
- HTTP/2 and h2c
- Envoy proxy
- Istio Gateway, VirtualService, and DestinationRule resources
- curl

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS Configuration and Auto mTLS: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service application protocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- curl HTTP/2 documentation: https://everything.curl.dev/http/versions/http2.html

## Issues Found
- The post stated that Istio sidecar-to-sidecar communication automatically uses HTTP/2 when mTLS is enabled, including for HTTP/1.1 applications. This conflated mTLS encryption with HTTP protocol selection. Updated the explanation to say that mTLS encrypts proxy-to-proxy traffic, while HTTP/2 depends on explicit protocol selection, protocol detection, gRPC/HTTP2 service ports, or `h2UpgradePolicy`.
- The port naming section said `h2` was a valid Istio protocol prefix. Istio's documented explicit protocol value for HTTP/2 service ports is `http2` or `grpc`, so the wording now recommends `http2`.
- The Deployment example under "End-to-End HTTP/2" omitted the required `spec.selector` and matching `spec.template.metadata.labels` for `apps/v1`. Added a selector and matching pod template labels.
- The flow-control section referred to `h2.stream_refused`. Envoy documents the HTTP/2 codec stat as `stream_refused_errors`, commonly seen with an `http2.` stat prefix. Updated the text to `http2.stream_refused_errors`.

## Review Notes
The remaining Istio APIs, curl flags, and Envoy metric names checked are current in the consulted documentation. `http2MaxRequests` is valid, but Istio documents it as applying to both HTTP/1.1 and HTTP/2; the article's use of it as an HTTP/2 concurrency control is acceptable in this context.

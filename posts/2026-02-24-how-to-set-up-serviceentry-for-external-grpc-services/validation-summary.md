# Validation Summary: How to Set Up ServiceEntry for External gRPC Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService
- Envoy HTTP/2 and gRPC routing
- gRPC Python client channels
- Kubernetes and istioctl debugging commands
- Google Cloud and Firestore gRPC endpoints
- Prometheus/Istio metrics

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio wildcard egress documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- gRPC status codes documentation: https://grpc.io/docs/guides/status-codes/
- gRPC Python API documentation: https://grpc.github.io/grpc/python/
- Google Cloud Storage gRPC documentation: https://cloud.google.com/storage/docs/enable-grpc-api
- Firestore RPC reference: https://docs.cloud.google.com/firestore/docs/reference/rpc/google.firestore.v1
- Firebase Cloud Messaging REST API reference: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages/send

## Issues Found
- The TLS origination example applied TLS settings to port 443 and used a VirtualService redirect. Updated it to the documented Istio pattern: plaintext gRPC on port 80 with `targetPort: 443`, and the DestinationRule TLS policy on port 80.
- The Google Cloud section said Google Cloud client libraries use gRPC by default. Updated this because transport defaults vary by API and language library.
- The wildcard Google APIs explanation did not state that `resolution: DNS` cannot be used with wildcard hosts. Added that caveat.
- The Firebase/Firestore section incorrectly included FCM as a gRPC endpoint. Removed `fcm.googleapis.com` and narrowed the section to Firestore gRPC.
- The health checking section actually described passive outlier detection. Renamed and reworded it to avoid implying active gRPC health checking.
- The outlier detection explanation was too broad. Updated it to reflect Envoy's `grpc-status` to HTTP-status mapping behavior.
- The protocol mismatch note implied only `GRPC` or `HTTPS` were valid. Updated it to include `HTTP2` for plaintext gRPC and `TLS` for encrypted passthrough.
- The metrics query block was labeled as Bash even though it is PromQL. Updated the code fence language.

## Review Notes
The examples are version-neutral Istio v1 API snippets and align with current Istio 1.30 documentation. Envoy gRPC retry behavior depends on the `grpc-status` value available to the router, so production retry behavior should still be tested with the specific upstream service and client library.

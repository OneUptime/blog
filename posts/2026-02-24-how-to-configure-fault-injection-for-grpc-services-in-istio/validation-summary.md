# Validation Summary: How to Configure Fault Injection for gRPC Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Service resources
- Istio VirtualService
- Istio DestinationRule
- Envoy fault injection and retry behavior
- gRPC over HTTP/2
- grpcurl
- Prometheus / Istio standard metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- gRPC HTTP-to-gRPC status mapping: https://grpc.github.io/grpc/core/md_doc_http-grpc-status-mapping.html
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC over HTTP/2 protocol reference: https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-grpc-on
- grpcurl project documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The HTTP-to-gRPC status mapping table incorrectly mapped "Other 4xx" and "Other 5xx" responses to `INTERNAL`. The gRPC core mapping says all other HTTP status codes map to `UNKNOWN` when no `grpc-status` is present. Updated the table accordingly.
- The retry example configured Istio route retries on the same VirtualService route that injected faults. Istio's VirtualService reference states that timeouts and retries are not enabled when faults are configured on the client-side route. Removed the retry block from the fault-injection example and added a note explaining the limitation.
- The complete example combined fault injection, route retries, and outlier detection, then claimed synthetic faults would test the full resilience stack and eject failing pods. Client-side injected aborts do not exercise upstream pod failure behavior in that way, and route retries are disabled on faulted routes. Removed the DestinationRule and retry configuration from that example and narrowed the wording to client-side deadline, error, and retry handling.

## Review Notes
- The post uses `networking.istio.io/v1beta1` for Istio resources. Current Istio documentation primarily shows `networking.istio.io/v1`, but `v1beta1` remains a commonly served API version in Istio installations. A future refresh could modernize examples to `v1` if the blog standardizes on current Istio releases.
- The grpcurl examples are syntactically plausible, but real calls may need request data with `-d` and server reflection or local proto descriptors depending on the target service.

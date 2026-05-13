# Validation Summary: How to Configure Flagger Canary Metrics with gRPC Success Rate

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flagger Canary and MetricTemplate resources
- Prometheus and PromQL
- Istio service mesh metrics
- Linkerd service mesh metrics
- Kubernetes Services
- gRPC status codes

## Sources Consulted
- Flagger Metrics Analysis documentation: https://fluxcd.io/flagger/usage/metrics/
- Flagger Canary service documentation: https://fluxcd.io/flagger/usage/how-it-works/
- Istio Standard Metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Linkerd Proxy Metrics documentation: https://linkerd.io/2/reference/proxy-metrics/
- Linkerd Protocol Detection documentation: https://linkerd.io/2/features/protocol-detection/
- Kubernetes Service application protocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- gRPC Status Codes documentation: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The Canary example only set `appProtocol: grpc`, while Flagger documentation recommends setting the service port name to `grpc` for gRPC workloads. Added `portName: grpc` and updated the explanatory text to describe it as an explicit protocol hint, while noting that Linkerd can also detect gRPC traffic.
- The no-traffic section said to use the `or vector(0)` pattern but showed `vector(100)`, and the original query did not reliably avoid a zero-denominator ratio. Updated the text and query to guard the denominator with `> 0` and fall back to `vector(100)` for no-traffic cases.

## Review Notes
The Istio `istio_requests_total` and `grpc_response_status` labels, Linkerd `response_total` and `grpc_status_code` labels, Flagger `MetricTemplate` usage, and gRPC status code values were verified against official documentation. The Linkerd query uses protocol-level proxy metrics; newer Linkerd route-level metrics also exist, but the documented `response_total` metric remains valid.

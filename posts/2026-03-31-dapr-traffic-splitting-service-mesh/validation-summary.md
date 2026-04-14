# Validation Summary: How to Implement Traffic Splitting with Dapr and Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar annotations, service invocation, metrics)
- Istio (VirtualService, DestinationRule, traffic splitting)
- Kubernetes (Deployments, kubectl patch)
- Prometheus (PromQL, promtool)

## Sources Consulted
- Istio Networking API reference — `networking.istio.io/v1` is GA as of Istio 1.22+ (https://istio.io/latest/docs/reference/config/networking/)
- Dapr metrics documentation and source code (`dapr/dapr` repo, `pkg/diagnostics/service_monitoring.go`) for correct metric names and labels
- Prometheus `promtool` CLI documentation (https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
- Kubernetes kubectl patch documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)

## Issues Found

1. **Istio API version outdated**: The DestinationRule and VirtualService used `networking.istio.io/v1alpha3`, which has been deprecated since Istio 1.22 (2024). Updated both to `networking.istio.io/v1` (the current GA version). The resource specs are compatible across versions — no other changes needed.

2. **Error rate PromQL query was inverted**: The "Monitor Error Rates per Version" section used `response_code!~"5.."`, which filters for non-5xx (success) responses. This contradicts the stated goal of monitoring error rates. Changed to `response_code=~"5.."` to correctly query 5xx error rates by version.

3. **Incorrect Dapr metric name**: The PromQL query used `dapr_service_invocation_req_sent_total`, which is not a valid Dapr metric. The correct metric names include a `_runtime_` prefix (e.g., `dapr_runtime_service_invocation_req_sent_total`). Additionally, the `status` label is not available on the request-sent metric — it is only available on response metrics. Changed to `dapr_runtime_service_invocation_res_recv_total` which has the `status` label and correctly tracks invocation success rate.

## Review Notes

- The post does not include a Kubernetes Service definition for `checkout`. A Service is required for the DestinationRule subsets and VirtualService to function. Readers may need to create one (with selector `app: checkout`) before the traffic splitting configuration works. This is a missing prerequisite rather than a technical error in the existing content.
- Both deployment versions use the same `dapr.io/app-id: "checkout"`, which is correct for this Istio-based traffic splitting approach. However, readers should be aware that Dapr's own name resolution (used for service invocation) will discover all pods with that app-id. Traffic splitting only applies when requests flow through the Istio Envoy proxy.
- The `kubectl patch --type merge` commands use JSON merge patch (RFC 7396), which replaces arrays entirely rather than merging them. This is the correct behavior for updating VirtualService routes.

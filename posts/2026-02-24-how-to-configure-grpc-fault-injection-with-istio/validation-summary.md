# Validation Summary: How to Configure gRPC Fault Injection with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- gRPC
- Envoy fault injection
- Kubernetes and kubectl
- Go gRPC metadata
- YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- gRPC HTTP to gRPC status code mapping: https://grpc.github.io/grpc/core/md_doc_http-grpc-status-mapping.html
- gRPC status codes reference: https://grpc.github.io/grpc/core/md_doc_statuscodes
- Envoy fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Envoy response flag documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html

## Issues Found
- The VirtualService examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, matching Istio's current documentation examples.
- The post used numeric `grpcStatus` values such as `14` and `13`. Istio documents `grpcStatus` as a string and specifically notes to use status names such as `UNAVAILABLE`, not `14`. Updated all examples to use gRPC status names.
- The HTTP-to-gRPC fallback mapping listed HTTP 504 as `DEADLINE_EXCEEDED`. The official gRPC mapping lists HTTP 504 as `UNAVAILABLE`. Corrected the mapping.
- The method-targeting example matched the `:path` pseudo-header through `headers`. Updated it to use Istio's `uri` match, which is the documented VirtualService field for matching request paths.
- The retry example said 3 retries at a 50% abort rate result in about 12.5% failure. With the original attempt plus 3 retries, the failure rate is about 6.25% if each attempt is independent. Updated the explanation.
- The circuit breaker scenario said fault injection should cause an upstream to be ejected. Since fault injection can return an abort before the upstream is called, that is not a reliable way to validate upstream outlier ejection. Updated the wording to focus on client-side circuit breaker or failure handling activation.
- The verification section listed overly specific `http.inbound.fault.*` stats and checked the server-side proxy logs. Envoy documents fault stats under `http.<stat_prefix>.fault.*`, and the relevant access logs are on the proxy applying the fault. Updated the stats names and log command.

## Review Notes
- The examples assume the VirtualService is applied to traffic handled by an Istio proxy for the calling workload. In gateway or ambient/waypoint deployments, the proxy whose stats and logs should be checked may differ.
- Istio documents that fault injection and retry or timeout policies do not take effect together when configured on the same VirtualService; retry testing should account for where the retry policy is configured.

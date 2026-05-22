# Validation Summary: How to Configure Fault Injection with HTTP Aborts in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio HTTP fault injection
- Envoy HTTP fault filter
- Kubernetes kubectl commands
- Prometheus / Istio request metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Envoy HTTP fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- Updated VirtualService examples from `apiVersion: networking.istio.io/v1beta1` to `apiVersion: networking.istio.io/v1`, matching the current stable Istio networking API used in official documentation.
- Corrected the combined abort and delay explanation. The post said 20% of the remaining requests get delayed after abort selection, but Istio documents delay and abort faults as independent when both are specified. The text now states that 10% of requests can be aborted, 20% can be delayed, and a request can be both delayed and aborted.

## Review Notes
- The fault injection fields `fault.abort.httpStatus`, `fault.abort.percentage.value`, `fault.delay.fixedDelay`, route matching by URI prefix, and header matching with `exact` are consistent with current Istio VirtualService documentation.
- The use of the double-valued `percentage.value` field is current; the older integer `percent` field is deprecated and was not used.
- Istio documents that fault injection and retry or timeout policies on the same VirtualService do not work as many users expect. This post does not configure retries or timeouts, so no change was needed.

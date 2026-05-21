# Validation Summary: How to Set Up Retries for Idempotent Requests Only in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Envoy HTTP retry policies
- Kubernetes and kubectl
- HTTP method idempotency
- Idempotency keys

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy router retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- RFC 9110 HTTP Semantics, idempotent methods: https://datatracker.ietf.org/doc/html/rfc9110#section-9.2.2
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The idempotency-key VirtualService example ended with an unmatched default route that enabled retries for every non-POST method, including non-idempotent methods such as PATCH. I changed that route to match only RFC-defined idempotent methods with `method.regex: "^(GET|HEAD|PUT|DELETE|OPTIONS|TRACE)$"` and added a final no-retry default route.
- The conclusion said Istio's default behavior is "retrying everything." Istio's documented default retry policy is `connect-failure,refused-stream,unavailable,cancelled`, not every failure type. I changed the wording to say the default retry policy can apply regardless of HTTP method.

## Review Notes
- The post intentionally uses `attempts: 0` to disable retries on selected routes; Istio documents this as valid.
- The examples use `networking.istio.io/v1beta1`, while current Istio documentation primarily shows `networking.istio.io/v1`. The fields used in the post are still part of the current VirtualService API shape.

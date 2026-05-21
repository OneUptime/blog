# Validation Summary: How to Use Gateway API for Canary Deployments with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Istio
- Kubernetes Deployments and Services
- HTTPRoute weighted routing and header matching
- Prometheus / PromQL
- Flagger
- kubectl

## Sources Consulted
- Kubernetes Gateway API traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/
- Kubernetes Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Flagger Gateway API canary deployments documentation: https://docs.flagger.app/tutorials/gatewayapi-progressive-delivery

## Issues Found
- The Prometheus error-rate examples divided unsummed per-response-code time series, which would not produce an overall service error rate. I changed the numerator and denominator to use `sum(rate(...))` so the 5xx request rate is divided by the total request rate for each service.
- The Prometheus P99 latency examples passed raw bucket rates into `histogram_quantile`, which can produce separate quantiles for each remaining label set instead of one service-level quantile. I changed them to aggregate classic histogram buckets with `sum by (le) (...)`, as recommended by Prometheus.
- The Flagger Gateway API example placed `gatewayRefs` directly under `spec`, but Flagger's Gateway API configuration expects `gatewayRefs` under `spec.service`. I moved `gatewayRefs` under `service`.

## Review Notes
- The Gateway API examples use `gateway.networking.k8s.io/v1`, `Gateway`, `HTTPRoute`, `parentRefs`, header matches, path matches, and weighted `backendRefs` consistently with the current Gateway API documentation.
- Gateway API weights are proportional values rather than inherently percentages; the examples use totals of 100, so the percentage wording is accurate in context.
- Istio supports Gateway API with `gatewayClassName: istio`, and Istio standard metrics include `istio_requests_total`, `istio_request_duration_milliseconds`, `destination_service`, and `response_code`.

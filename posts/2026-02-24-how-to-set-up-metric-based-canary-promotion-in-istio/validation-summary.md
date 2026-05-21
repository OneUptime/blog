# Validation Summary: How to Set Up Metric-Based Canary Promotion in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService and DestinationRule traffic routing
- Kubernetes Deployments and kubectl
- Flagger Canary, MetricTemplate, webhooks, and alerting resources
- Prometheus and PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Flagger how it works: https://docs.flagger.app/usage/how-it-works
- Flagger deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis: https://docs.flagger.app/usage/metrics
- Flagger webhooks: https://docs.flagger.app/usage/webhooks
- Flagger alerting: https://docs.flagger.app/usage/alerting
- Flagger Istio canary deployments tutorial: https://docs.flagger.app/tutorials/istio-progressive-delivery
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The initial Istio `VirtualService` example routed traffic to `my-app-primary` and `my-app-canary` services, while the following `DestinationRule` defined `primary` and `canary` subsets for the `my-app` service. I changed the `VirtualService` destinations to use `host: my-app` with `subset: primary` and `subset: canary`, matching Istio's documented subset-based routing pattern.

## Review Notes
- Flagger may generate separate primary and canary services and Istio resources internally, but the corrected example is now consistent with the author's explanation of a `DestinationRule` defining subsets.
- The PromQL examples assume standard Istio telemetry labels are enabled and that the canary workload name matches Flagger's default `targetRef.name-canary` naming pattern.

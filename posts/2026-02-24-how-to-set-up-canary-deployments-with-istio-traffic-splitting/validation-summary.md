# Validation Summary: How to Set Up Canary Deployments with Istio Traffic Splitting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Deployments and Services
- Istio VirtualService
- Istio DestinationRule
- Istio telemetry metrics
- Prometheus / PromQL
- Kiali
- Flagger

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Flagger Istio canary deployments: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger canary resource behavior: https://docs.flagger.app/usage/how-it-works
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Istio networking examples used `networking.istio.io/v1beta1`. Updated DestinationRule and VirtualService examples to the current stable `networking.istio.io/v1` API used in current Istio documentation.
- The Service port did not explicitly declare the HTTP protocol. Added `name: http` so Istio can reliably apply HTTP routing and telemetry behavior without relying on protocol sniffing.
- The route inspection command used `deploy/my-app-v1`. Updated it to the documented `deployment/my-app-v1` resource form for `istioctl proxy-config routes`.
- The Prometheus dashboard command used `istioctl experimental dashboard prometheus`. Updated it to the current documented `istioctl dashboard prometheus` command.
- The PromQL error-rate example divided unaggregated series, which can produce per-response-code ratios rather than an overall canary error rate. Wrapped both numerator and denominator in `sum(rate(...))`.
- The rollback explanation said traffic shifts instantly. Reworded it to say the rollback is fast and takes effect after updated configuration propagates to proxies.
- The Flagger example referenced a `targetRef` Deployment named `my-app`, while the earlier manual example created `my-app-v1` and `my-app-v2`. Added a short clarification that Flagger should target a single Deployment named `my-app` and manages the primary/canary resources itself.

## Review Notes
The YAML examples were parsed successfully after edits. The short host name `my-app` is valid when the VirtualService and DestinationRule are in the same namespace as the Service, but using the fully qualified service name can avoid namespace ambiguity in larger examples.

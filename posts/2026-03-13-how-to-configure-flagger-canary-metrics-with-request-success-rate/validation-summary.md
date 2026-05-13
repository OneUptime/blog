# Validation Summary: How to Configure Flagger Canary Metrics with Request Success Rate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary custom resource
- Kubernetes
- Prometheus / PromQL
- Istio metrics
- Linkerd metrics
- NGINX Ingress Controller metrics

## Sources Consulted
- Flagger metrics analysis documentation: https://fluxcd.io/flagger/usage/metrics/
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger FAQ metrics documentation: https://fluxcd.io/flagger/faq/
- Flagger Canary API source: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Flagger built-in metric observers: https://github.com/fluxcd/flagger/tree/main/pkg/metrics/observers
- Flagger scheduler metric handling: https://github.com/fluxcd/flagger/blob/main/pkg/controller/scheduler_metrics.go
- Flagger load testing webhook documentation: https://github.com/fluxcd/flagger/blob/main/docs/gitbook/usage/webhooks.md

## Issues Found
- The Linkerd built-in `request-success-rate` PromQL example omitted the `direction="inbound"` label used by Flagger's current Linkerd observer. I added that label to both numerator and denominator so the example matches the built-in query.
- The NGINX Ingress built-in `request-success-rate` PromQL example omitted the `canary!=""` label filter and used a regex matcher for `ingress`. I changed it to match Flagger's current NGINX observer query, which filters canary ingress metrics and uses `ingress="podinfo"`.

## Review Notes
The Canary YAML examples use the current `flagger.app/v1beta1` API fields, including `analysis.metrics[].thresholdRange`, `interval`, `threshold`, `maxWeight`, and `stepWeight`. Flagger's older `metrics[].threshold` and `metrics[].query` fields are deprecated in the API source, but the post does not use them.

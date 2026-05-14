# Validation Summary: How to Implement A/B Testing Deployments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Deployments, Services, Namespaces, and Ingress
- ingress-nginx canary routing annotations
- Istio VirtualService, DestinationRule, and Gateway
- Kustomize
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL recording rules

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx canary deployment example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Flux Kustomization example used `wait: true` together with explicit `healthChecks`. Flux ignores `healthChecks` when `wait` is enabled, so `wait: true` was removed to make the listed health checks effective.
- The Kubernetes Service examples did not include labels matching the ServiceMonitor selector. Added `app: myapp` and version labels to both Services so the ServiceMonitor can discover them.
- The Service ports were unnamed, while the ServiceMonitor used a named endpoint port. Added `name: http` to both Service ports and updated the ServiceMonitor endpoint from `metrics` to `http`.
- The ingress-nginx cookie canary comment said cookie `ab_test` should equal `b`. ingress-nginx routes canary cookie traffic when the configured cookie value is `always` and blocks it for `never`, so the comment was corrected to `always`.

## Review Notes
- The Istio examples are valid for the shown separate-service routing model. The `DestinationRule` objects are not required for simple weighted routing without subsets, but they are syntactically valid and can hold traffic policy.
- The monitoring example assumes the application exposes Prometheus metrics on `/metrics` through the same HTTP service port.

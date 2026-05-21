# Validation Summary: How to Set Up Blue-Green Deployments with Istio VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Kubernetes Deployments
- Kubernetes Services
- kubectl
- Envoy sidecar metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio application requirements / sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Istio networking examples used `apiVersion: networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for VirtualService, DestinationRule, and Gateway, so all Istio manifests and the automation script were updated to `networking.istio.io/v1`.
- Several statements described the switch as literally instant. Istio distributes updated proxy configuration quickly, but the effective switch depends on config propagation to Envoy proxies. The wording was changed to describe fast, all-at-once switching and proxy configuration propagation instead of literal instant behavior.
- The post stated that in-flight requests complete normally and no requests are dropped. The wording was narrowed to say in-flight requests can complete normally and the route change itself does not require dropping active requests, which is more accurate and avoids an absolute guarantee.

## Review Notes
- The Kubernetes Deployment, Service selector, `kubectl apply`, `kubectl port-forward deploy/...`, and `kubectl exec ... -c istio-proxy -- ...` examples are syntactically valid.
- The Istio subset routing examples are technically correct for workloads in the same namespace. Istio documentation recommends fully qualified service names to avoid namespace ambiguity, but the short `my-app` host works in this post because the Service, VirtualService, and DestinationRule are all in `default`.
- The monitoring commands are valid for inspecting Envoy-side metrics from a sidecar, but production monitoring would usually rely on Prometheus/Istio telemetry queries rather than manual per-pod `kubectl exec` commands.

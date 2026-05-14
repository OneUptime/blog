# Validation Summary: How to Deploy Kong Ingress Controller with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kong Ingress Controller
- Kong Gateway Helm charts
- Kubernetes Ingress
- Kubernetes HorizontalPodAutoscaler
- KongPlugin custom resources
- kubectl and Flux CLI

## Sources Consulted
- Kong Ingress Controller installation documentation: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong IngressClass / GatewayClass documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Kong annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong custom resource API reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Helm chart repository index: https://charts.konghq.com/index.yaml
- Kong Helm chart values: https://github.com/Kong/charts/tree/main/charts/ingress
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The HelmRelease used the older `kong` chart with a `2.38.x` version example. Kong's current KIC installation documentation recommends the `kong/ingress` chart for deploying Kong Ingress Controller with Kong Gateway, so the example now uses `chart: ingress` and an available `0.23.x` chart version.
- The Helm values were written for the `kong` chart, not the current `ingress` umbrella chart. Updated values to use `controller.*` and `gateway.*` sections, including internal Admin API settings required by the controller/gateway topology.
- The autoscaling example used `targetCPUUtilizationPercentage`, which is only used by the chart for clusters without `autoscaling/v2` support. Because the post requires Kubernetes v1.24 or later, the example now uses `autoscaling.metrics` with `averageUtilization: 75`.
- The Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Updated them to use `spec.ingressClassName: kong`, which is the current Kubernetes field and is supported by Kong Ingress Controller.
- The Flux Kustomization health check referenced a generated Deployment name from the older chart. Updated it to health-check the `HelmRelease`, which is stable and matches Flux's documented pattern.
- The troubleshooting `kubectl exec` command referenced `deploy/kong-kong`, which does not match the current `ingress` chart's gateway Deployment name. Updated it to `deploy/kong-gateway`.

## Review Notes
- KongPlugin examples remain valid with `apiVersion: configuration.konghq.com/v1`.
- The `kubernetes.io/ingress.class` annotation remains valid for some independent Kong custom resources, but Ingress resources should use `spec.ingressClassName`.
- The AWS NLB service annotation is provider-specific and may need adjustment for non-AWS clusters.

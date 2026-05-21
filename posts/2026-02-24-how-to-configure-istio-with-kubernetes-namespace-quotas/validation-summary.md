# Validation Summary: How to Configure Istio with Kubernetes Namespace Quotas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Istio sidecar injection
- IstioOperator proxy resource configuration
- Istio Sidecar resource
- Prometheus / kube-state-metrics alerting

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio default chart values for proxy resources: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/values.yaml
- kube-state-metrics project documentation for Kubernetes object state metrics: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post described quota-related failures as pods failing to schedule. ResourceQuota is enforced during API admission, so quota-exceeding pods fail to be created/admitted before scheduling. Updated the introduction and error-handling section to say the pods fail to be created.
- The post said ResourceQuotas sum requests and limits across all pods. Kubernetes documents compute ResourceQuota totals across all non-terminal pods. Updated the wording to include "non-terminal pods."
- The Prometheus alert divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the differing `type` label, so the series would not match as intended. Updated the expression to use `ignoring(type)` and guard the hard quota denominator with `> 0`.

## Review Notes
The Kubernetes ResourceQuota and LimitRange manifests use valid `v1` APIs and supported resource names. The Istio per-pod proxy resource annotations are documented as alpha but current. Istio sidecar defaults can vary by profile and release; the post already tells readers to verify their installed injector configuration.

# Validation Summary: How to Configure Istio Control Plane Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Kubernetes HorizontalPodAutoscaler
- Kubernetes kubectl
- Prometheus Adapter
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- KEDA

## Sources Consulted
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA ScaledObject specification: https://keda.sh/docs/latest/reference/scaledobject-spec/

## Issues Found
- The Prometheus Adapter `metricsQuery` examples for `pilot_connected_proxies` and `pilot_push_rate` did not include `<<.LabelMatchers>>`. The adapter documentation states that metric queries should use the request's label matchers so returned series map back to the requested Kubernetes objects. I added `<<.LabelMatchers>>` to both queries so HPA requests are scoped to the target istiod pods and namespace.

## Review Notes
- The IstioOperator `hpaSpec` examples use current Istio customization fields for Kubernetes resource settings.
- The Kubernetes HPA examples use `autoscaling/v2`, which is the current stable API for multiple metrics, custom metrics, and configurable scaling behavior.
- The Istio metrics used in the examples, `pilot_xds` and `pilot_xds_pushes`, are listed in the current Istio pilot-discovery exported metrics reference.
- Custom metrics autoscaling depends on Prometheus scrape labels such as `namespace` and `pod` being present on the istiod time series.

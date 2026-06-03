# Validation Summary: How to Use Watermark Pod Autoscaler for More Granular Scaling Thresholds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Datadog Watermark Pod Autoscaler
- Kubernetes custom resources and CRDs
- Helm
- Prometheus Operator ServiceMonitor
- PromQL

## Sources Consulted
- Datadog Watermark Pod Autoscaler GitHub README: https://github.com/DataDog/watermarkpodautoscaler
- Datadog Watermark Pod Autoscaler API types: https://github.com/DataDog/watermarkpodautoscaler/blob/main/apis/datadoghq/v1alpha1/watermarkpodautoscaler_types.go
- Datadog Watermark Pod Autoscaler Helm chart: https://github.com/DataDog/watermarkpodautoscaler/tree/main/chart/watermarkpodautoscaler
- Datadog blog guide on Watermark Pod Autoscaler: https://www.datadoghq.com/blog/watermark-pod-autoscaler/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/

## Issues Found
- The installation section used `datadog/watermarkpodautoscaler` from the Datadog Helm repository and set `clusterAgent.enabled=false`. The WPA project documentation installs the chart from the cloned WPA repository, so the commands were updated to clone `DataDog/watermarkpodautoscaler` and run `helm install ... ./chart/watermarkpodautoscaler`.
- Several examples treated WPA watermarks as percentage utilization values. WPA `highWatermark` and `lowWatermark` fields are Kubernetes quantities, so CPU and memory examples were changed to quantity values such as `800m`, `1700Mi`, and `1Gi`.
- `scaleUpLimitFactor` and `scaleDownLimitFactor` were written as multiplicative float factors such as `2.0`, `1.5`, and `0.5`. WPA uses percentage quantities from 0 to 100, so these values were corrected to percentage-style values such as `100`, `50`, and `25`.
- The post used `Pods` metric examples. The current WPA CRD exposes `External` and `Resource` metric sources, so `Pods` examples were converted to supported `External` metrics.
- The multiple-metric section claimed WPA combines metrics with `average`, `max`, and `absolute`. WPA officially supports one metric per WPA, and the documented algorithms are `average` and `absolute`, so the section was corrected to use separate WPA objects and accurate algorithm descriptions.
- The monitoring section used non-existent metric names such as `wpa_status_replicas`, `wpa_status_metric`, and `wpa_scaling_events_total`. These were replaced with controller metric names exposed by the WPA code, such as `wpa_controller_value`, `wpa_controller_replicas_scaling_effective`, and `wpa_controller_upscale_replicas_total`.
- The ServiceMonitor snippet selected a service that the chart does not create. A Service targeting the controller's metrics port 8383 was added before the ServiceMonitor.
- The sample status condition used a non-existent `WithinWatermarks` reason and old percentage-based wording. It was corrected to use the controller's `ReadyForScale` condition reason.
- The introductory HPA description overstated oscillation by omitting HPA tolerance and stabilization windows. It was softened to mention those built-in controls while preserving the WPA comparison.

## Review Notes
WPA is still marked beta in the upstream project, and its API may change. The post now uses the current upstream CRD shape and documented behavior as of June 3, 2026.

# Validation Summary: How to Configure Istio with Kubernetes Horizontal Pod Autoscaler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes resource and container resource metrics
- Istio sidecar proxy resource configuration
- Istio standard Prometheus metrics
- Prometheus Adapter custom metrics
- Helm
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA ContainerResource metric beta announcement: https://kubernetes.io/blog/2023/05/02/hpa-container-resource-metric/
- Kubernetes HorizontalPodAutoscaler walkthrough for custom object metrics: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter and https://raw.githubusercontent.com/kubernetes-sigs/prometheus-adapter/master/docs/config.md
- Prometheus Adapter Helm chart documentation: https://artifacthub.io/packages/helm/prometheus-community/prometheus-adapter

## Issues Found
- The post said HPA container-level metrics started with Kubernetes 1.27. Kubernetes introduced `ContainerResource` in 1.20; 1.27 made it beta and enabled by default. Updated the wording to reflect the correct version history.
- The post described the global Istio proxy resource snippet as mesh config, but the YAML is an `IstioOperator` values override. Updated the heading sentence to avoid confusing it with `meshConfig`.
- The Prometheus Adapter example mapped Istio's `destination_workload` label to the Kubernetes `pod` resource and used an HPA `Pods` metric. Istio standard request metrics identify destination workload, not destination pod, so that mapping would not return a valid per-pod metric for HPA. Updated the adapter rule to map `destination_workload` to an `apps/deployment` object and changed the HPA to use an `Object` metric with `AverageValue`.

## Review Notes
The autoscaling/v2 HPA manifests, `behavior` settings, Istio sidecar resource annotations, and Helm installation command use current supported APIs and documented fields. The per-pod Istio annotations are documented as alpha, so readers should verify compatibility with their installed Istio release. The Prometheus Adapter ConfigMap may require a rollout restart of the adapter deployment after changes, depending on how it was installed.

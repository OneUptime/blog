# Validation Summary: How to Configure HPA Based on Custom Metrics with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes custom metrics API
- Flux CD HelmRelease
- Flux CD Kustomization
- Prometheus
- Prometheus Adapter
- Prometheus Operator PodMonitor
- Go Prometheus client
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Prometheus Adapter Helm chart listing: https://artifacthub.io/packages/helm/prometheus-community/prometheus-adapter

## Issues Found
- The Prometheus Adapter `metricsQuery` collapsed pod-level series with `avg(...)` but did not group by the adapter-provided resource labels. Changed it to `avg(...) by (<<.GroupBy>>)` so the query preserves the labels needed to associate returned values with pods.
- The text implied a Go Prometheus metric is automatically exposed at `/metrics`. Changed the wording to say the application must expose the metric from a `/metrics` endpoint for Prometheus to scrape.
- The Flux `dependsOn` comment could be read as depending directly on the `HelmRelease`. Changed the comment to clarify that `Kustomization.dependsOn` refers to the Kustomization that installs the custom metrics API.

## Review Notes
- The HPA uses `autoscaling/v2`, which is the current stable API for custom metrics scaling.
- The PodMonitor example uses current Prometheus Operator fields; the selected pods must declare a container port named `metrics`.
- The Prometheus Adapter chart version in the post is pinned to the 4.10 series. Newer chart releases exist, but the shown values structure remains valid for the documented approach.

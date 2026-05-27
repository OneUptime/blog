# Validation Summary: How to Optimize GKE Pod CPU and Memory Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes resource requests and limits
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- Multidimensional Pod Autoscaler (MPA)
- Google Cloud CLI
- kubectl
- Cloud Monitoring

## Sources Consulted
- Google Cloud: Vertical Pod autoscaling concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- Google Cloud: Scale container resource requests and limits with VPA: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/vertical-pod-autoscaling
- Google Cloud SDK: `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK: `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud: Configure multidimensional Pod autoscaling: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multidimensional-pod-autoscaling
- Kubernetes: Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: `kubectl top pod` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top
- Google Cloud Monitoring: GKE system metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes

## Issues Found
- The descriptions of VPA lower and upper bounds were too absolute. The lower bound is not guaranteed to be sufficient for stability, and the upper bound is the maximum recommended request above which resources are likely wasted, not simply the maximum resource usage observed. Updated the wording to match the GKE VPA API documentation.
- The post recommended setting limits directly from the VPA upper bound. VPA recommendations are CPU and memory request recommendations; limits should be chosen separately based on workload behavior and SLOs. Removed the example limits and adjusted the recommendation.
- The VPA and HPA section described using a memory-only VPA alongside CPU-based HPA. Current GKE documentation recommends Multidimensional Pod Autoscaling for CPU-based horizontal scaling with memory-based vertical scaling. Replaced the example with a `MultidimPodAutoscaler` manifest.
- The `kubectl top` command and comments claimed to show a usage-to-request ratio and sorted on the wrong column. Updated it to use `kubectl top pods --containers --sort-by=cpu`, which shows current CPU and memory usage sorted by CPU.

## Review Notes
- Multidimensional Pod Autoscaling is currently documented by Google Cloud as a beta feature, so teams should check launch-stage requirements before using it in production.
- The Cloud Monitoring metric names for request utilization are valid GKE system metrics.

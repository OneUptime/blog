# Validation Summary: How to Test Auto-Scaling Behavior on Talos Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Horizontal Pod Autoscaler
- Kubernetes Deployments, Services, Pods, Jobs, and Events
- Metrics Server / Kubernetes Metrics API
- kubectl
- BusyBox, curl, and hey load testing containers

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Resource metrics pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- curl man page / write-out documentation: https://curl.se/docs/manpage.html
- Docker Hub documentation for williamyeh/hey image: https://hub.docker.com/r/williamyeh/hey/
- Docker Hub documentation for curlimages/curl image: https://hub.docker.com/r/curlimages/curl

## Issues Found
- The latency checker used `date +%s%N` inside the `curlimages/curl` container to calculate elapsed milliseconds. That assumes nanosecond support in the container's `date` implementation and can fail or produce non-numeric output on minimal images. Replaced it with curl's documented `-w '%{time_total}'` write-out variable, which measures total request time directly and works with the curl image used in the example.

## Review Notes
- The Kubernetes manifests use current stable API versions: `apps/v1`, `v1`, `autoscaling/v2`, and `batch/v1`.
- The HPA `behavior`, CPU utilization target, stabilization windows, and scaling policies are consistent with the current Kubernetes HPA documentation.
- The examples rely on a working resource metrics pipeline. On Talos-based Kubernetes clusters, Metrics Server or another compatible Metrics API provider must be installed and functioning for HPA CPU metrics and `kubectl top` output to work.

# Validation Summary: How to Configure HorizontalPodAutoscaler with CPU Utilization Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- Kubernetes Metrics Server
- Kubernetes resource requests and limits
- kubectl
- NGINX container workload example

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Metrics Server official repository and installation instructions: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The CPU throttling section said throttling can cause performance issues "without triggering HPA scaling." This was too broad because HPA CPU utilization is based on usage relative to requests, so throttled workloads can still produce high utilization and trigger scaling. Updated the wording to say throttling can cause performance issues while HPA is still reacting to CPU metrics.
- The `no-throttle-app` Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added a selector and matching labels so the manifest is structurally valid.
- The load-testing example used the DNS name `web-application.production.svc.cluster.local` without creating a Service. Added a `kubectl expose deployment` command so the referenced Service exists before the load generator sends requests.

## Review Notes
The HPA API examples use the current stable `autoscaling/v2` API and valid `Resource` metric target fields. The post's recommendations for Metrics Server, CPU requests, multiple metrics, and scaling behavior match current Kubernetes documentation.

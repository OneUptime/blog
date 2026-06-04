# Validation Summary: How to Configure HPA with Multiple Metrics and Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes autoscaling/v2 API
- Kubernetes resource, pods, object, and external metrics
- HPA scaling behavior and policies
- kubectl
- Prometheus metrics adapters

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The HPA replica formula omitted the ceiling operation. Updated the explanation to state that HPA uses the ceiling of the calculated ratio.
- The custom metrics section implied Prometheus metrics are used directly. Updated it to clarify that Prometheus-backed custom metrics require a custom metrics adapter.
- The scale-up policy example included a fixed 50-pod policy while claiming it capped growth under `selectPolicy: Max`. Removed that incorrect policy and adjusted the explanation so it matches Kubernetes policy selection behavior.
- The metric failure section said HPA simply ignores unavailable metrics and scales based on remaining metrics. Updated it to reflect Kubernetes behavior: scale-up can still proceed if another metric recommends it, but scale-down is skipped when a metric cannot be converted and the remaining metrics recommend scaling down.

## Review Notes
The YAML snippets use the current stable `autoscaling/v2` API and valid HPA metric and behavior fields. Custom and external metric examples assume the cluster has the appropriate metrics APIs and adapters installed.

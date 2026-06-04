# Validation Summary: How to Use enableServiceLinks to Control Service Environment Variable Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes Services and DNS-based service discovery
- Kubernetes `enableServiceLinks`
- kubectl
- ConfigMaps and Secrets
- Prometheus Operator `PrometheusRule`
- kube-state-metrics
- Python Kubernetes client

## Sources Consulted
- Kubernetes Container Environment documentation: https://kubernetes.io/docs/concepts/containers/container-environment/
- Kubernetes Connecting Applications with Services documentation: https://kubernetes.io/docs/concepts/services-networking/connect-applications-service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Pod API reference for `spec.enableServiceLinks`: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kube-state-metrics Pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post stated that Kubernetes injects environment variables for every service into every pod and that `enableServiceLinks: false` disables all service environment variables. Kubernetes documents service variables for active services in the pod namespace and Kubernetes control plane services, and the Kubernetes API service variables may still be present even when regular service links are disabled. Updated the wording to distinguish regular namespace service links from Kubernetes API service variables.
- The startup impact claim said disabling service links can save several seconds in clusters with 100+ services. This was too specific without an official source. Changed it to the supported claim that disabling service links can reduce startup overhead in namespaces with many services.
- The `PrometheusRule` example was missing the Kubernetes resource wrapper (`apiVersion`, `kind`, `metadata`, and `spec`) and used the non-existent metric `kube_pod_container_started_at`. Updated it to a valid Prometheus Operator `PrometheusRule` using kube-state-metrics' documented `kube_pod_container_state_started` metric with `kube_pod_start_time`.

## Review Notes
The Kubernetes YAML examples use current stable API versions (`v1` for Pods and ConfigMaps, `apps/v1` for Deployments) and place `enableServiceLinks` correctly under the pod spec or deployment pod template spec. The `kubectl` command shapes are valid based on official documentation, although `kubectl` was not installed in the local environment for live `--help` verification.

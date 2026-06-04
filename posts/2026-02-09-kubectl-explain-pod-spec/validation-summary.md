# Validation Summary: How to Use kubectl explain to Understand Pod Spec Fields During Debugging

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Pod API
- Kubernetes autoscaling API

## Sources Consulted
- Kubernetes kubectl explain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/
- Kubernetes Pod v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- Removed `kubectl explain pod.spec.serviceAccount` from the service account examples because `spec.serviceAccount` is a deprecated alias for `spec.serviceAccountName` in the Pod v1 API.
- Replaced `kubectl explain pod.spec.containers.lifecycle.postStart.tcpSocket` with `kubectl explain pod.spec.containers.lifecycle.postStart.sleep` because `tcpSocket` is deprecated and not supported as a lifecycle handler in current Kubernetes.
- Replaced the Deployment API version comparison using `extensions/v1beta1` and `apps/v1beta1` with a HorizontalPodAutoscaler comparison using `autoscaling/v1` and `autoscaling/v2`, because the Deployment beta API versions are removed from modern Kubernetes clusters.

## Review Notes
The local environment did not have `kubectl` installed, so CLI behavior was checked against the official generated kubectl reference and Kubernetes API reference instead of local `kubectl --help` output. The remaining examples use valid `kubectl explain` field paths and current Kubernetes API fields.

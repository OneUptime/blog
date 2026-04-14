# Validation Summary: How to Set Priority Classes for Dapr Control Plane Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass (`scheduling.k8s.io/v1`)
- Dapr control plane (operator, sentry, sidecar injector, placement)
- Helm (Dapr Helm chart)
- kubectl CLI

## Sources Consulted
- Kubernetes PriorityClass documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference for PriorityClass: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/priority-class-v1/
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Kubernetes built-in priority classes source: https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/scheduling/types.go

## Issues Found
1. **Incorrect "(highest)" annotation on built-in priority classes**: The post labeled `system-cluster-critical` (value 2000000000) as "(highest)", but `system-node-critical` has a higher value of 2000001000. Moved the "(highest)" annotation to `system-node-critical` to reflect the correct ordering.

## Review Notes
- The PriorityClass YAML is correct: `scheduling.k8s.io/v1` is the stable API (GA since Kubernetes 1.14), and all fields (`value`, `globalDefault`, `description`, `preemptionPolicy`) are valid.
- The custom priority value of 1000000 is within the valid user-defined range (values above 1000000000 are reserved for system use).
- The Dapr Helm chart keys (`dapr_operator`, `dapr_sentry`, `dapr_sidecar_injector`, `dapr_placement`) and the `priorityClassName` field are correct for the Dapr Helm chart.
- The kubectl verification commands are syntactically correct and would produce the expected output.
- Using `system-cluster-critical` for Dapr control plane components (as shown in the Helm example) is a reasonable recommendation, though operators should be aware this puts Dapr at the same priority level as core Kubernetes system components.

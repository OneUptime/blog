# Validation Summary: How to Create Scale-Down Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (HPA) `autoscaling/v2`
- Kubernetes PodDisruptionBudget (PDB) `policy/v1`
- Kubernetes Deployment `apps/v1`
- Kubernetes CronJob `batch/v1`
- Kubernetes topologySpreadConstraints
- Pod lifecycle, preStop hooks, terminationGracePeriodSeconds
- KEDA (Kubernetes Event-Driven Autoscaler) `keda.sh/v1alpha1` ScaledObject
- Prometheus Adapter for custom metrics
- Prometheus Operator `PrometheusRule` (`monitoring.coreos.com/v1`)
- kube-state-metrics
- Node.js (Express) graceful shutdown
- Python (Flask) graceful shutdown
- kubectl CLI

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaler docs: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- HPA v2 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Configurable scaling behavior: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- Pod lifecycle and termination: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination
- Container lifecycle hooks (preStop): https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- topologySpreadConstraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- KEDA ScaledObject spec: https://keda.sh/docs/2.x/concepts/scaling-deployments/
- KEDA Prometheus scaler: https://keda.sh/docs/2.x/scalers/prometheus/
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/

## Issues Found
- **Incorrect order in "Graceful Shutdown Flow" mermaid sequence diagram.** The original diagram showed `K8s->>Pod: Send SIGTERM` happening BEFORE `Pod->>App: Execute preStop hook`. Per the official Kubernetes Pod Lifecycle documentation, the actual order is: (1) the pod is marked Terminating and the grace period clock starts, (2) the pod is removed from endpoints AND the preStop hook runs (concurrently), (3) SIGTERM is sent to PID 1 only AFTER preStop completes, (4) SIGKILL is sent if the container is still running when the grace period expires. The diagram was reordered to reflect the correct sequence and a clarifying note was added that the grace period starts at the beginning of termination (not after preStop).

## Review Notes
- The `minReplicas: 0` example in the Spot Instance section is valid in current Kubernetes when used with an external/custom/object metric (as shown), per the GA `HPAScaleToZero` behavior. Readers using only Resource metrics should note this still requires the feature to be enabled in older cluster versions, but the example here correctly uses an `External` metric where scaling to zero is supported.
- The HPA stabilization-window calculation in the sequence diagram ("Min policy: remove 1 pod (min of 2 pods or 10%)") is accurate: with 10 current replicas, 10% = 1 pod, and `selectPolicy: Min` selects the smaller cap (1).
- The Node.js `setTimeout(..., 55000)` force-exit is meant to be less than `terminationGracePeriodSeconds`, but readers should be aware the actual time available after SIGTERM is reduced by the preStop hook duration (preStop time is consumed from the same grace period budget).
- KEDA's `keda.sh/v1alpha1` apiVersion is still the current ScaledObject API as of KEDA 2.x — no change needed.
- All other API versions, field names, kubectl commands, kube-state-metrics names, and PrometheusRule schema were verified and are correct.

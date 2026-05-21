# Validation Summary: How to Handle Kubernetes Rolling Updates with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Kubernetes readiness probes and startup probes
- Kubernetes lifecycle hooks and graceful pod termination
- Kubernetes PodDisruptionBudgets
- Istio sidecar injection and proxy configuration
- Istio health probe rewrite
- Istio Envoy endpoint inspection with `istioctl`

## Sources Consulted
- Istio sidecar injection problems and `holdApplicationUntilProxyStarts`: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio health checking and probe rewrite: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio `proxy.istio.io/config` annotation reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio MeshConfig / ProxyConfig fields, including `terminationDrainDuration` and `drainDuration`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio `istioctl proxy-config endpoint` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment rolling update strategy: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes update Deployment without downtime task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Pod disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The readiness probe section said probe traffic flows through the sidecar. Istio rewrites HTTP, TCP, and gRPC probes by default so kubelet probes the sidecar agent, which then checks the application. Updated the explanation to match Istio's documented probe rewrite behavior.
- The graceful shutdown section implied Kubernetes sends SIGTERM before the `preStop` hook. Kubernetes runs `preStop` before sending the container termination signal, and the termination grace countdown includes both the hook and normal shutdown time. Updated the lifecycle explanation.
- The graceful shutdown sequence referred generically to Service endpoints. Updated it to describe terminating pods being removed from the ready endpoints used for Service load balancing.
- The long-lived connection section described `drainDuration` as the shutdown drain setting. Istio documents `drainDuration` for Envoy hot restart draining and `terminationDrainDuration` for proxy shutdown draining. Removed `drainDuration` from the example and updated the explanation to use `terminationDrainDuration`.
- The PodDisruptionBudget section said a PDB prevents too many pods from being updated at once. Kubernetes documents that PDBs count rolling-upgrade unavailability but do not limit Deployment or StatefulSet rolling upgrades; those are controlled by the workload strategy. Updated the text to position PDBs as protection for voluntary evictions such as node drains.

## Review Notes
The remaining Kubernetes and Istio manifests use current API versions for the referenced resources. The examples are intentionally generic and assume the `sleep` Deployment exists in the mesh for traffic generation and `istioctl proxy-config endpoints` inspection.

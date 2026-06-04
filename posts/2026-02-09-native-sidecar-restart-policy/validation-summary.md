# Validation Summary: Configure Native Sidecar Containers with restartPolicy for Kubernetes 1.29+

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Pods, init containers, and native sidecar containers
- Kubernetes container-level `restartPolicy`
- Kubernetes Services, NetworkPolicies, HorizontalPodAutoscaler, PodDisruptionBudget, LimitRange, and security contexts
- Prometheus Operator `ServiceMonitor`
- GitLab CI/CD and GitHub Actions deployment workflows
- Go HTTP server lifecycle handling
- Python Flask HTTP server
- Velero backup schedules

## Sources Consulted
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes v1.28 native sidecar announcement: https://kubernetes.io/blog/2023/08/25/native-sidecar-containers/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout
- Azure `k8s-set-context` documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- The description said native sidecar containers were introduced in Kubernetes 1.29. Kubernetes introduced the feature gate in 1.28; it became enabled by default in 1.29. Updated the description to say "enabled by default in Kubernetes 1.29."
- The main Kubernetes examples did not actually configure native sidecars. Native sidecars must be declared under `initContainers` with container-level `restartPolicy: Always`. Added restartable init-container sidecars to the basic and advanced Deployment examples.
- The advanced Deployment advertised Prometheus scraping on port 9090 but did not define a container exposing that port. Updated the annotation to port 9102, added a metrics sidecar exposing a named `metrics` port, and aligned the Service/ServiceMonitor example with that port and selector.
- The GitHub Actions example used older action versions. Updated `actions/checkout` and `azure/k8s-set-context` to the current versions shown in their official documentation.

## Review Notes
- YAML and Python code fences were parsed locally after the edits.
- `kubectl` and Go were not installed in the local environment, so Kubernetes server-side validation and Go compilation were reviewed against official documentation and by static inspection.
- Native sidecar support is stable in newer Kubernetes releases, but the post's Kubernetes 1.29+ focus is still technically valid because the feature is enabled by default from 1.29 onward.

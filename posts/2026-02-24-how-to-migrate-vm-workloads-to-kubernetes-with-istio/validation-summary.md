# Validation Summary: How to Migrate VM Workloads to Kubernetes with Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio service mesh
- Istio VM workloads with WorkloadGroup and WorkloadEntry
- Kubernetes Services and Deployments
- Istio VirtualService and DestinationRule traffic management
- Prometheus metrics for Istio telemetry
- kubectl and istioctl CLI usage

## Sources Consulted
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio virtual machine architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio virtual machine installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Istio manifests used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for WorkloadGroup, WorkloadEntry, DestinationRule, and VirtualService. Updated all Istio manifests in the post to `networking.istio.io/v1`.
- The Step 4 Prometheus query was labeled as an error-rate check but used `response_code!~"5.."`, which filters out 5xx responses. Changed it to `response_code=~"5.."` so it actually returns 5xx error traffic by destination version.

## Review Notes
- The VM and Kubernetes workload selection pattern is valid for Istio: Istio can associate Kubernetes Services with both pods and WorkloadEntry resources by matching selectors and labels.
- The rollback command uses JSON merge patch, which is appropriate for a custom resource because Kubernetes strategic merge patch is not supported for custom resources.
- The post intentionally uses short service names such as `my-service` in VirtualService destinations. Istio supports short names, but its documentation recommends fully qualified domain names to avoid namespace-related misconfiguration in more complex deployments.

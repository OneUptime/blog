# Validation Summary: How to Handle Kubernetes Endpoints Without Pods in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Endpoints
- Kubernetes EndpointSlices
- Kubernetes CronJobs
- Istio DestinationRule
- Istio VirtualService
- Istio WorkloadEntry
- Istio WorkloadGroup
- Istio VM integration
- Bash scripting with kubectl and curl

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Istio Virtual Machine Architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/

## Issues Found
- The manual EndpointSlice example omitted the recommended `endpointslice.kubernetes.io/managed-by` label for user-managed EndpointSlices. Added the label with a manual management value.
- The VM integration section said WorkloadEntries were associated with a Service using a WorkloadGroup and Service, but only showed a WorkloadGroup. Clarified that WorkloadGroup is the VM registration template and added the matching Kubernetes Service selector example.
- The health checker section recommended running a Kubernetes CronJob every 30 seconds. Kubernetes CronJob schedules use standard five-field cron syntax with minute granularity, so this was changed to a small controller or a CronJob every minute or so.
- The migration traffic-splitting example referenced `k8s` and `vm` subsets in a VirtualService without defining those subsets. Added the required DestinationRule with matching labels, added the missing namespace on the Service and VirtualService, and used fully qualified service hosts to avoid short-name namespace ambiguity.

## Review Notes
The legacy Endpoints API still works, but Kubernetes documentation now recommends creating EndpointSlice resources directly for manually managed selectorless Services. The post correctly presents EndpointSlice as the modern option, and the remaining Endpoints examples are acceptable as legacy-compatible examples.

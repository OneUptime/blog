# Validation Summary: How to Use Dynamic Resource Allocation for GPUs with DRA in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Dynamic Resource Allocation (DRA)
- Kubernetes `resource.k8s.io/v1` APIs
- DeviceClass, ResourceClaim, ResourceClaimTemplate, and ResourceSlice
- GPU scheduling and NVIDIA MIG concepts
- Kubernetes CEL device selectors
- Kubernetes Go client types for DRA resources

## Sources Consulted
- Kubernetes Dynamic Resource Allocation documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/
- Kubernetes Set Up DRA in a Cluster task: https://kubernetes.io/docs/tasks/configure-pod-container/assign-resources/set-up-dra-cluster/
- Kubernetes Allocate Devices to Workloads with DRA task: https://kubernetes.io/docs/tasks/configure-pod-container/assign-resources/allocate-devices-dra/
- Kubernetes ResourceClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/resource/resource-claim-v1/
- Kubernetes ResourceClaimTemplate API reference: https://kubernetes.io/docs/reference/kubernetes-api/resource/resource-claim-template-v1/
- Kubernetes ResourceSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/resource/resource-slice-v1/
- Kubernetes DeviceClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/resource/device-class-v1/
- Kubernetes Install Drivers and Allocate Devices with DRA tutorial: https://kubernetes.io/docs/tutorials/cluster-management/install-use-dra/
- NVIDIA DRA Driver for GPUs documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/dra-intro-install.html

## Issues Found
- The post described DRA as alpha/beta and requiring the `DynamicResourceAllocation` feature gate. Updated it to state that core DRA is stable in Kubernetes v1.35 and enabled by default, while newer extensions can still require specific feature gates.
- The post used the removed `resource.k8s.io/v1alpha2` API and `ResourceClass` kind. Replaced these with current `resource.k8s.io/v1` APIs and `DeviceClass`.
- ResourceClaim examples used deprecated `resourceClassName` and `parametersRef` fields. Replaced them with `spec.devices.requests[].exactly`, `deviceClassName`, capacity selectors, and CEL selectors.
- Pod examples used the old nested `source.resourceClaimName` and `source.resourceClaimTemplateName` shape. Updated them to the current direct `resourceClaimName` and `resourceClaimTemplateName` fields.
- The MIG example used a fictional driver-specific parameter CRD as if it were Kubernetes DRA API. Replaced it with a current ResourceClaim selector that requests a matching driver-published MIG profile attribute.
- The DRA driver implementation section incorrectly described a controller directly allocating ResourceClaims and updating allocation status using `ResourceV1alpha2`. Rewrote it to describe the current ResourceSlice publishing and kubelet plugin model, with a `resource.k8s.io/v1` Go example.
- The GPU sharing section used a non-existent sharing mode in ResourceClass. Replaced it with a ResourceSlice example using `allowMultipleAllocations` and a ResourceClaim capacity request.
- The migration and troubleshooting sections referenced ResourceClasses and obsolete feature gate checks. Updated them to DeviceClasses and `kubectl api-resources --api-group=resource.k8s.io`.
- The multi-GPU example used a fictional custom parameter object and the old pod claim reference shape. Replaced it with a ResourceClaimTemplate using current DRA fields and CEL selectors.

## Review Notes
The examples still use an illustrative driver domain, `gpu.resource.example.com`, and driver-specific GPU attributes. Real clusters must use the DeviceClass names, attributes, capacities, MIG profile naming, and sharing semantics documented by the installed DRA driver, such as the NVIDIA DRA Driver for GPUs.

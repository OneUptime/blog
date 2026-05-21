# Validation Summary: How to Configure Traffic Policies for VM Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Istio VM workloads
- WorkloadEntry and WorkloadGroup
- Kubernetes Service
- DestinationRule
- VirtualService
- Envoy load balancing, retries, outlier detection, and fault injection
- istioctl

## Sources Consulted
- Istio Virtual Machine Architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said Istio uses round-robin load balancing by default. Current Istio documentation states that the default is least-request load balancing. Updated the explanation accordingly.
- The Istio networking examples used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for WorkloadEntry, DestinationRule, and VirtualService examples. Updated the snippets to `networking.istio.io/v1`.
- The post said fault injection is a good way to verify retry policies. Istio's VirtualService documentation notes that retries and timeouts are not enabled when client-side faults are enabled on the same route. Updated the text to avoid implying that retries can be verified on that same fault-injected route.

## Review Notes
- The Kubernetes Service selector pattern for VM service association is consistent with Istio's VM architecture documentation, which says Kubernetes services can select WorkloadEntry labels.
- The `PASSTHROUGH` load balancer value is valid, but it is an advanced original-destination option and should be used carefully.
- `istioctl` was not installed in the local environment, so command verification was performed against the official istioctl command reference.

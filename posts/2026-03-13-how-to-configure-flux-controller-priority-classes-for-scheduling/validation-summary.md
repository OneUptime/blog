# Validation Summary: How to Configure Flux Controller Priority Classes for Scheduling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes PriorityClass
- Kubernetes scheduling and preemption
- Kubernetes node-pressure eviction
- Kustomize patches
- kubectl JSONPath output

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize reference: patches: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Flux documentation: Optional components: https://fluxcd.io/flux/installation/configuration/optional-components/

## Issues Found
- The post described Flux controllers as the last to be evicted under resource pressure. Changed this to say they are less likely to be evicted before lower-priority workloads, because Kubernetes node-pressure eviction considers whether pods exceed requests, Pod Priority, and usage relative to requests.
- The PriorityClass explanation implied kubelet eviction ordering is based only on priority. Updated it to say priority is one factor in node-pressure eviction ordering.
- The preemption section conflated scheduler preemption with node-pressure eviction. Updated it to explain that `PreemptLowerPriority` lets the scheduler terminate lower-priority pods when a pending Flux controller cannot otherwise be scheduled.
- The priority value table listed `2,000,000,000` as a normal system-critical value. Updated it to clarify that values above `1,000,000,000` are reserved for Kubernetes built-in system-critical PriorityClasses.

## Review Notes
- The PriorityClass manifest uses the current `scheduling.k8s.io/v1` API and valid fields.
- The Kustomize patch pattern is valid: Kustomize requires a metadata name for strategic merge patches, but when a `target` is specified, that name is not used for selecting the resource.
- The Flux controller names shown match the default Flux bootstrap components. Installations with extra Flux image automation components would need equivalent patches for those additional deployments.

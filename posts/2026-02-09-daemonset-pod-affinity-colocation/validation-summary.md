# Validation Summary: How to configure DaemonSet pod affinity for co-location with specific workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes inter-pod affinity and anti-affinity
- Kubernetes node selectors and node affinity
- Kubernetes resource requests and limits
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Assigning Pods to Nodes documentation, including inter-pod affinity and anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Resource Management for Pods and Containers documentation, including extended resources: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post overstated what pod affinity does for DaemonSets by saying it deploys services only where workloads run. Kubernetes DaemonSets create pods for each eligible node, and the scheduler then enforces inter-pod affinity. I updated the explanation to clarify that non-matching nodes can still have Pending DaemonSet pods unless node labels, node selectors, or node affinity narrow the eligible node set.
- Several examples implied matching workloads across namespaces, but inter-pod affinity label selectors are namespace-scoped unless `namespaces` or `namespaceSelector` is specified. I added `namespaceSelector: {}` to the affinity terms so the examples match pods across namespaces as described.
- The logging and adaptive monitoring examples described preferred pod affinity as if it restricted DaemonSet placement. I corrected the text to explain that `preferredDuringSchedulingIgnoredDuringExecution` is a soft scheduler preference and does not reduce the DaemonSet controller's eligible node set.
- The GPU example specified `nvidia.com/gpu: 0` in resource limits. Extended resources are requested through resource keys and are scheduled only if those requests are satisfied; a monitor that does not need GPU allocation should omit the GPU resource key. I removed the zero GPU limit.
- The storage section said the affinity detected StatefulSets, but pod affinity matches pod labels, not controller ownership. I changed the wording to refer to pods labeled as stateful workloads.

## Review Notes
- All YAML code blocks were parsed successfully with PyYAML after the edits.
- `kubectl`, `yq`, and Ruby were not installed in the local environment, so I could not run `kubectl` schema validation or CLI help locally.
- The verification commands use valid `kubectl get` output options and JSONPath syntax, but the `grep` examples are intentionally simple and may need adjustment for clusters with different application labels.

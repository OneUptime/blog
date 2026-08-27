# Validation Summary: How to Size a Memory-Backed emptyDir Without Triggering a Pod OOM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes v1.37
- Kubernetes Pods and container resource management
- Memory-backed `emptyDir` volumes
- Linux tmpfs and cgroups v2
- kubelet Summary API
- kubectl and JSONPath
- OOM handling and node-pressure eviction

## Sources Consulted
- Kubernetes resource management and memory-backed `emptyDir` considerations: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#memory-backed-emptydir
- Kubernetes Pod-level resource specification: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#pod-level-resource-specification
- Kubernetes `emptyDir` volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Kubernetes Windows storage limitations: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes Pod API, `EmptyDirVolumeSource`: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#EmptyDirVolumeSource
- Kubernetes v1.37 `emptyDir` sizing implementation: https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/volume/emptydir/empty_dir.go#L128-L153
- Kubernetes KEP-6030, dynamic resizing and shared tmpfs memory attribution: https://www.kubernetes.dev/resources/keps/6030/
- Kubernetes v1.37 release announcement: https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/#dynamic-resize-of-memory-backed-volumes
- Kubernetes in-place memory-backed `emptyDir` resize documentation: https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/#resizing-memory-backed-emptydir-volumes
- Kubernetes container memory-limit example and OOM behavior: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/#exceed-a-containers-memory-limit
- Kubernetes node-pressure eviction and node OOM behavior: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#node-out-of-memory-behavior
- Kubernetes node metrics and Summary API documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl `get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Linux kernel tmpfs documentation: https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html

## Issues Found
- The opening described `medium: Memory` without an operating-system qualification, although memory-backed `emptyDir` is unsupported on Windows. Scoped the behavior to Linux nodes.
- Memory attribution was described as permanently writer-specific. Clarified that pages are initially charged to the writer, but cgroups v2 can later migrate or split attribution for shared tmpfs pages as other containers access them under memory pressure. Added the resulting reader-headroom caveat while retaining the conservative per-writer budget.
- The volume ceiling was described only as the lower of `sizeLimit` and the sum of container limits. Updated it to include node allocatable memory and the effective Pod memory limit, including an explicit Pod-level limit when Pod-level resources are used in Kubernetes v1.37.
- The restart-loop explanation could imply that retained pages become newly charged to the replacement container. Clarified that the retained files continue consuming parent Pod cgroup headroom and can therefore contribute to another OOM.
- Container memory graphs were treated as interchangeable with limit-accounted cgroup usage. Clarified that working-set metrics are not identical to total cgroup memory usage and that limit proximity should be evaluated with total cgroup usage.
- The in-place resize statement was unversioned. Pinned it to the alpha feature introduced in Kubernetes v1.37, limited the claim to an existing `emptyDir.sizeLimit`, and specified that the feature gate is required on the control plane and relevant kubelets with cgroup v2 nodes.
- The Pod API link used a redirected legacy path whose fragment was discarded, and the node-OOM link was labeled as container OOM behavior. Updated the API link to its canonical path and corrected the OOM link label.

## Review Notes
The Pod manifest passed client-side parsing with kubectl v1.34.1, and its API fields, volume references, and BinarySI memory quantities are valid. The `kubectl get` JSONPath expression and `kubectl describe` command are syntactically current. The JSONPath reports the most recent prior termination through `lastState`, which is appropriate for the restart-loop scenario. The `registry.example.com` image is intentionally illustrative. The Kubernetes v1.37 volume-resize capability remains alpha and disabled by default, so its behavior and limitations may change in future releases.

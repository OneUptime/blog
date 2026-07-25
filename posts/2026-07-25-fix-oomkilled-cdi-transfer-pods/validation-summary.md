# Validation Summary: How to Fix OOMKilled CDI Import, Clone, and Upload Pods on Slow Storage

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVirt Containerized Data Importer (CDI)
- CDI DataVolumes, worker Pods, and scratch PVCs
- Kubernetes resource requests, limits, LimitRanges, and ResourceQuotas
- `kubectl`
- QEMU `qemu-img`

## Sources Consulted

- [CDI ResourceQuota and podResourceRequirements documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/quota.md)
- [CDI configuration documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI v1.65.0 resource-default implementation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/config-controller.go)
- [CDI v1beta1 API types](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/types.go)
- [CDI debugging and transfer-Pod retention documentation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/debug.md)
- [CDI scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/scratch-space.md)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes memory-resource troubleshooting](https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/)
- [Kubernetes node-pressure eviction and node OOM behavior](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes LimitRange documentation](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes ResourceQuota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl top pod` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [QEMU `qemu-img` documentation](https://www.qemu.org/docs/master/tools/qemu-img.html)

## Issues Found

- The opening treated container memory-limit exhaustion and general node memory pressure as equivalent meanings of `OOMKilled`. It was changed to state that `OOMKilled` records a kernel OOM kill, which commonly results from a container exceeding its cgroup memory limit but can also occur during a node-wide OOM. Kubelet node-pressure eviction is now identified as a separate outcome.
- The post incorrectly said CDI has no default CPU or memory requests or limits. Although the upstream quota document still contains that older statement, the CDI v1.65.0 controller sets default requests of 100m CPU and 60M memory and limits of 750m CPU and 600M memory. The post now gives the current upstream values, adds a version/distribution caveat, and directs readers to inspect the actual Pod and CDIConfig status.
- The retention example could be read as an annotation to add directly to a generated worker Pod. CDI reads `cdi.kubevirt.io/storage.pod.retainAfterCompletion` from the DataVolume/PVC. The introduction to the snippet now explicitly tells the reader to annotate the DataVolume before reproducing the failure.

## Review Notes

The `kubectl` commands, flags, JSONPath expressions, merge-patch structure, CDI field names, retention annotation, and `qemu-img info --output=json` command are current and syntactically valid. The CDI resource override is correctly described as cluster-wide, and the warnings about scheduling, quota admission, concurrency, scratch capacity, and destructive DataVolume/PVC deletion are technically sound.

The upstream CDI `doc/quota.md` default-resource statement is stale relative to the v1.65.0 implementation. The post now pins the listed defaults to v1.65 and recommends checking reconciled status and the generated Pod, which is the safer version-independent procedure.

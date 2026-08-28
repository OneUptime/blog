# Validation Summary: Why Local Ephemeral Storage Shows Less Allocatable Space Than Node Disk Capacity

## Status

validated

## Post Type

Technical troubleshooting and capacity-planning guide

## Technologies Covered

- Kubernetes local ephemeral storage
- Kubernetes Node capacity and Node Allocatable
- kubelet resource reservations and `KubeletConfiguration`
- kube-scheduler resource-request accounting
- Node-pressure eviction and `DiskPressure`
- `nodefs`, `imagefs`, and `containerfs` filesystem layouts
- `emptyDir`, container log, and writable-layer accounting
- Generic ephemeral volumes and PersistentVolumeClaims
- XFS and ext4 project-quota monitoring
- `kubectl` Go templates, JSONPath, and event inspection
- Linux filesystem and block-device inspection tools

## Sources Consulted

- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Reserve compute resources and calculate Node Allocatable](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubelet configuration API (`KubeletConfiguration` v1beta1)](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubernetes Node status: capacity and allocatable](https://kubernetes.io/docs/reference/node/node-status/#capacity)
- [Kubernetes Node capacity tracking](https://kubernetes.io/docs/concepts/architecture/nodes/#node-capacity)
- [Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Kubernetes ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-for-local-ephemeral-storage)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes core/v1 Event API](https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/)
- [`findmnt(8)`](https://man7.org/linux/man-pages/man8/findmnt.8.html) and [`lsblk(8)`](https://man7.org/linux/man-pages/man8/lsblk.8.html) Linux manual pages
- [GNU Coreutils `df` reference](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)

## Issues Found

- The introduction referred to eviction thresholds generally as a Node Allocatable deduction. Only applicable hard eviction thresholds are deducted, so the wording now says "applicable hard eviction thresholds."
- The eviction sequence implied that setting `DiskPressure` followed Pod eviction. The kubelet reports the pressure condition when a filesystem threshold is met, attempts node-level reclamation, and evicts Pods only if reclamation does not clear the threshold; the sequence was corrected.
- The event command sorted core/v1 Events by the legacy `lastTimestamp` field, which can be empty for modern events. It was replaced with the current purpose-built `kubectl events -A --for "node/$node"` command.
- The post called a generic ephemeral volume a "generic ephemeral PVC" and did not clearly separate its PVC-backed storage accounting from container local ephemeral-storage usage. The text now states that Kubernetes creates the backing PVC, uses its `requests.storage` and StorageClass policy, and separately counts container logs and writable layers as local ephemeral-storage usage.
- The Pod-level limit sentence compared aggregate container limits plus `emptyDir` usage with the Pod-level sum. Kubernetes actually compares aggregate local ephemeral-storage usage, including disk-backed `emptyDir`, with the sum of container limits; the operands were corrected.
- Project-quota monitoring was described too broadly. The text now scopes this capability and its accuracy improvement to eligible disk-backed `emptyDir` volumes.
- Three documentation fragments no longer matched current Kubernetes heading IDs. The Node status, local ephemeral-storage quota, and Node capacity links were updated to their working fragments.

## Review Notes

The remaining commands, Go template, JSONPath expression, resource quantities, and `KubeletConfiguration` field names are current and syntactically valid. The `...` configuration values are intentionally schematic placeholders, not runnable quantities. In current Kubernetes v1.37 documentation, split-image `containerfs` support remains beta and runtime-dependent, while project-quota monitoring remains beta and disabled by default. The paths `/var/lib/kubelet` and `/var/log` are defaults and must be adjusted for node images that configure different locations.

# Validation Summary: How to Diagnose DiskPressure and Inode Evictions Caused by Pod Ephemeral Storage

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes 1.37
- Kubelet node-pressure eviction and DiskPressure
- Local ephemeral-storage requests, limits, and accounting
- Linux filesystem capacity and inode monitoring
- nodefs, imagefs, and containerfs layouts
- emptyDir, generic ephemeral volumes, PVCs, and project quotas
- Kubernetes Summary API
- CRI-O 1.29 and later with KubeletSeparateDiskGC
- kubectl, jq, df, and grep

## Sources Consulted

- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes ephemeral volumes and generic ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes node status and conditions](https://kubernetes.io/docs/reference/node/node-status/#condition)
- [Kubernetes node metrics data and Summary API](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Pod Quality of Service classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes deprecated API migration guide for Events](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event-v125)
- [Kubernetes Events v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/)
- [Kubernetes 1.37 kubelet Summary API PodStats schema](https://github.com/kubernetes/kubernetes/blob/release-1.37/staging/src/k8s.io/kubelet/pkg/apis/stats/v1alpha1/types.go)
- [Kubernetes 1.37 kubelet eviction signal mapping and message construction](https://github.com/kubernetes/kubernetes/blob/release-1.37/pkg/kubelet/eviction/helpers.go)
- [Kubernetes ephemeral-storage project-quota KEP](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1029-ephemeral-storage-quotas/README.md)
- [jq manual: object indexing](https://jqlang.org/manual/)
- [GNU Coreutils df reference](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)
- [GNU Grep reference](https://www.gnu.org/software/grep/manual/html_node/grep-Programs.html)

## Issues Found

- Both Event commands sorted on .lastTimestamp, a legacy Event field that is deprecated and can be unset. Changed them to the stable .metadata.creationTimestamp field recommended by the official kubectl quick reference.
- The Pod-diagnosis text overstated the detail in kubelet messages. A container-limit message says that the container exceeded its local ephemeral-storage limit without separating writable-layer and log usage; a node-pressure message maps all byte signals to ephemeral-storage and all inode signals to inodes without naming nodefs, imagefs, or containerfs. Corrected the text to match those messages and state that the node-pressure message does not identify the exact filesystem by itself.
- The Summary API query used .ephemeralStorage, which is not a PodStats JSON field and would make jq emit null. Changed it to the hyphenated ephemeral-storage key, matching the Kubernetes 1.37 schema.
- The project-quota wording implied that quota monitoring could replace directory scanning for all Pod ephemeral-storage consumers. Current kubelet project-quota monitoring applies to eligible emptyDir volumes, not container logs or writable layers. Scoped the recommendation accordingly.

## Review Notes

The remaining commands and technical claims were verified. In particular, the six byte and inode eviction signals map to DiskPressure; inode signals are Linux-only; kubelet performs node-level reclamation before end-user Pod eviction; DiskPressure ranking uses usage versus requests and Pod Priority, while inode starvation uses relative Pod Priority because Kubernetes has no inode request resource; QoS class does not determine DiskPressure eviction order; and generic ephemeral volumes use PVC/PV capacity accounting rather than the Pod's local ephemeral-storage aggregate.

The Kubernetes 1.37-specific statement is current as of validation: split image filesystem support is beta, containerfs requires KubeletSeparateDiskGC, and the Kubernetes 1.37 documentation lists CRI-O 1.29 or later as the supported runtime. Project-quota monitoring is beta and disabled by default; it monitors rather than enforces usage and additionally requires user namespaces plus a suitably configured XFS or ext4 filesystem. Access to the node Summary API also depends on cluster authorization for the node proxy endpoint.

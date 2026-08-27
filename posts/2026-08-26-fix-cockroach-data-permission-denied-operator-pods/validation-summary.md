# Validation Summary: How to Fix `Permission Denied` on `/cockroach/cockroach-data` in Operator-Managed Pods

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- CockroachDB 26.2 and the CockroachDB CLI
- CockroachDB Operator 1.0.0
- `crdb.cockroachlabs.com/v1beta1` `CrdbCluster` and `CrdbNode` resources
- Kubernetes Pods, security contexts, Pod Security Standards, PVs, PVCs, and StorageClasses
- CSI volume ownership and `VOLUME_MOUNT_GROUP`
- NFS identity mapping and `root_squash`
- Helm 4 server-side apply and CockroachDB Helm charts
- `kubectl`, JSONPath, `jq`, and shell commands

## Sources Consulted

- [CockroachDB GA Kubernetes Operator announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB Operator v1beta1 `CrdbNode` API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator v1beta1 `CrdbCluster` API and status fields](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB Operator API reference and deprecated-field mapping](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [CockroachDB Operator v1beta1 pod-template example](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [CockroachDB chart 26.2.4 default values](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB chart `CrdbCluster` template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [CockroachDB Operator under-replicated-ranges safety check and manual CLI check](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#under-replicated-ranges-check)
- [CockroachDB `node` command reference](https://www.cockroachlabs.com/docs/stable/cockroach-node)
- [CockroachDB unavailable- and under-replicated-range alert definitions](https://www.cockroachlabs.com/docs/stable/essential-alerts-self-hosted#kv-replication)
- [CockroachDB backup and restore monitoring](https://www.cockroachlabs.com/docs/stable/backup-and-restore-monitoring)
- [Kubernetes security contexts, `fsGroup`, change policy, and CSI delegation](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes `CSIDriver` API and `fsGroupPolicy`](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/)
- [Kubernetes PersistentVolume access modes and class semantics](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes StorageClass defaulting and classless PVCs](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Pod API reference for PVC volume sources and volume mounts](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [kubectl single-resource watch implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go#L569-L583)
- [Linux NFS export identity mapping and `root_squash`](https://man7.org/linux/man-pages/man5/exports.5.html)
- [Official CockroachDB init-container release artifacts](https://hub.docker.com/r/cockroachdb/cockroachdb-init-container/tags)
- [Official CockroachDB certificate-reloader release artifacts](https://hub.docker.com/r/cockroachdb/cockroachdb-cert-reloader/tags)

## Issues Found

- The initial `POD=cockroachdb-0` assignment incorrectly assumed an ordinal pod name. Direct GA Operator clusters generate `CrdbNode` and pod names with non-ordinal suffixes, while migrated clusters may retain ordinal names. Replaced it with an explicit affected-pod placeholder so readers use the live name.
- The introduction referred to a deprecated public-operator `spec.securityContext` field that the public `v1alpha1` API does not expose. Reworded the warning to accurately state that the public operator has a different, more limited schema.
- The `ReadWriteOnce` warning implied single-pod enforcement. Clarified that RWO is single-node, can allow multiple same-node pods, may produce a multi-attach failure on another node, and must not be treated as a database single-writer guarantee.
- The generated-pod security-context command omitted init containers even though the ownership helper and locality initializer are init containers. Added init-container output with labels that distinguish it from regular-container output.
- The StorageClass command failed for valid classless or statically provisioned PVCs because an empty `storageClassName` was passed to `kubectl get storageclass`. Added inspection of the bound PV and guarded both that lookup for an unbound claim and the StorageClass lookup for a classless claim.
- The CSI-driver cause conflated kubelet-managed `fsGroup` handling with driver-delegated mount groups. Reworded it around `CSIDriver.spec.fsGroupPolicy`, which controls whether kubelet changes ownership, and the separate `VOLUME_MOUNT_GROUP` capability used for driver delegation.
- The read-only cause incorrectly included the PVC object. PVC access modes do not enforce write protection after mount. Replaced it with the actual enforcement points: the PV source or backend, the pod PVC volume source, and the container volume mount.
- The post claimed that the injected v1.0.0 images use UID/GID 1000. Their OCI configurations specify UID 1000 without a GID, and their unoverridden runtime primary GID is 0; the certificate Jobs explicitly set UID/GID/`fsGroup` 1000. Corrected the claim and retained the instruction to inspect the live pod.
- The non-root security-context fragment did not explicitly omit the possible root ownership helper. Added `dropChownContainer: true` after making the fragment's fresh, verified-`fsGroup` precondition explicit. Also documented that chart 26.2.4 renders `podTemplate` but exposes no `dropChownContainer` value, so Helm users must verify rendered output and use a supported chart field or reviewed post-renderer rather than inventing a values key.
- The `OnRootMismatch` explanation mentioned only root ownership. Corrected it to ownership and permissions, both of which are checked before kubelet skips the recursive change.
- The Restricted Pod Security wording made `dropChownContainer` sound sufficient and said a privileged init container weakens admission. Clarified that the field only omits the helper, all generated containers still need Restricted-compliant settings, and an enforced Restricted policy rejects a privileged helper unless an exemption is introduced.
- The existing-media procedure required zero under-replicated ranges before repairing an already-offline node. That can deadlock recovery because the failed node itself commonly causes under-replication. Changed the gate to require all remaining nodes live and zero unavailable ranges, permit only recovery of that same node under reduced redundancy, and stop if another node or problem is involved. Replaced the undefined generic stop workflow with a maintenance procedure supported by Cockroach Labs and the applicable Operator release that keeps the PVC unmounted during repair.
- The rollout watch combined three resource types with `--watch`, which kubectl rejects with `you may only specify a single resource type`. Split it into three commands to run in separate terminals.
- The post allowed progression after checking only node liveness and unavailable ranges. Tightened the next-node gate to require every expected node live and both unavailable and under-replicated range counts zero on every row.
- The backup warning attributed volume replication to Kubernetes. Replaced that phrase with CockroachDB replication or storage-layer redundancy, neither of which substitutes for a tested backup restore.

## Review Notes

The review used the August 20, 2026 `cockroachdb/helm-charts` master snapshot (`e2fca923e3f0c77c60c771b773d46fc86bf6aa48`), GA Operator images at `v1.0.0`, `cockroachdb-chart` `26.2.4`, and CockroachDB `v26.2.5`. The corrected security-context fragment was accepted by the installed v1beta1 API with a server-side dry run. The CockroachDB image accepted the documented `node status` flags, and the binary, certificate, and data paths match the Operator documentation. The remaining Kubernetes, CSI, NFS, Helm, JSONPath, `jq`, and shell claims were verified. Storage-side ownership repair intentionally remains vendor-specific because safe snapshot, attachment, identity-mapping, and metadata-repair procedures differ by backend.

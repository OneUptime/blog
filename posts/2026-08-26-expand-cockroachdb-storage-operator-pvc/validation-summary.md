# Validation Summary: How to Expand CockroachDB Storage When the Operator Does Not Resize the PVC

## Status

validated

## Post Type

Technical troubleshooting guide and Kubernetes storage-expansion tutorial

## Technologies Covered

- CockroachDB and the CockroachDB CLI
- GA CockroachDB Kubernetes Operator 1.0.0
- `crdb.cockroachlabs.com/v1beta1` `CrdbCluster` and `CrdbNode` resources
- Kubernetes PersistentVolumeClaims, PersistentVolumes, and StorageClasses
- Container Storage Interface (CSI) volume expansion and external-resizer behavior
- Filesystem and node-side volume expansion
- Helm charts and Helm 4 Server-Side Apply field ownership
- `kubectl`, JSONPath, `jq`, Bash, and YAML

## Sources Consulted

- [CockroachDB Kubernetes Operator GA announcement and legacy-operator deprecation](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [GA `CrdbCluster` v1beta1 API types](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [GA `CrdbNode`, `DataStore`, status, and PVC-retention API types](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [Authoritative installed `CrdbCluster` CRD schema](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/manifests/crds/crdb.cockroachlabs.com_crdbclusters.yaml)
- [CockroachDB chart values, including datastore, pod-label, and retention defaults](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB chart `CrdbCluster` template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [CockroachDB chart upgrade, rolling-restart, and Helm 4 SSA guidance](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/README.md)
- [Operator 1.0.0 changelog, including the 1.0.0-rc.4 PVC-resize fix](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [Operator manual health-check guidance](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/README.md#inspect-cluster-health-manually)
- [Public-operator to GA-operator field mapping and cluster-label usage](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/docs/migration/operator/controller_migration.md)
- [Kubernetes PersistentVolumeClaim expansion and failure recovery](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims)
- [Kubernetes StorageClass volume expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-expansion)
- [Kubernetes PersistentVolumeClaim API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes PVC condition and allocated-resource type definitions](https://github.com/kubernetes/api/blob/master/core/v1/types.go)
- [Kubernetes `RecoverVolumeExpansionFailure` feature-gate history](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/#feature-gates-for-graduated-or-deprecated-features)
- [Kubernetes 1.34 failed-volume-expansion recovery GA announcement](https://kubernetes.io/blog/2025/09/19/kubernetes-v1-34-recover-expansion-failure/)
- [Kubernetes CSI volume-expansion flow](https://kubernetes-csi.github.io/docs/volume-expansion.html)
- [CSI external-resizer behavior and compatibility](https://github.com/kubernetes-csi/external-resizer)
- [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl patch`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/) references
- [Helm HIP-0023 Server-Side Apply and `--force-conflicts`](https://helm.sh/community/hips/hip-0023/)
- [CockroachDB `node status` command](https://www.cockroachlabs.com/docs/stable/cockroach-node)
- [CockroachDB backup validation](https://www.cockroachlabs.com/docs/stable/backup-validation)
- [`jq` 1.6 manual](https://jqlang.org/manual/v1.6/)

## Issues Found

1. **Failed-expansion recovery lacked exact feature history and API criteria.** The post mentioned Kubernetes 1.34 but did not note that `RecoverVolumeExpansionFailure` was beta and enabled by default in 1.32 and 1.33 before becoming GA in 1.34. It also described the lower retry as remaining above the volume's “actual capacity,” whereas Kubernetes validates it against PVC `.status.capacity`. The text now gives the exact versions and field, notes the CSI external-resizer compatibility requirement, and makes clear that this is recovery rather than storage shrink.
2. **The controller-versus-node diagnostic split relied too heavily on PVC status capacity.** During CSI expansion, the external-resizer updates bound-PV `.spec.capacity` after controller expansion, while PVC `.status.capacity` can remain old until kubelet finishes node or filesystem expansion. The layer checklist now distinguishes old PV capacity and controller-resize states from `NodeResizePending` or `FileSystemResizePending`, and the observation commands now display the bound PV's capacity.
3. **`allocatedResources` could be mistaken for completed device capacity.** That field can hold the expansion target used for quota accounting before the device or filesystem reaches the requested size. Its output label is now `target`, and the surrounding explanation explicitly says that it is not proof of growth.
4. **PVC conditions were described as Events.** `ControllerResizeError`, `NodeResizeError`, and `FileSystemResizePending` are PVC condition types, while quota and driver failures may also appear in Events. The wording now distinguishes conditions from Events. The Event listing also sorts by current `.metadata.creationTimestamp` instead of legacy `.lastTimestamp`.
5. **The filesystem-completion wording conflated CSI controller capability with node-side timing.** The revised text explains that node-side expansion can finish while a pod is running or at pod startup depending on the CSI driver and filesystem.
6. **The restart instruction was dangerously ambiguous about the object being replaced.** Deleting a `CrdbNode` can delete its PVC under the GA operator's default retention policy. The post now directs readers to the documented rolling Pod restart mechanism, explicitly prohibits deleting a `CrdbNode` to trigger expansion, and gives measurable CockroachDB health gates before continuing.
7. **The PVC-resize fix's first release was not identified.** The fix was recorded under 1.0.0-rc.4 and carried into GA 1.0.0. The version statement now reflects that exact history.
8. **The conclusion's claim-deletion warning was broader than Kubernetes' documented controlled recovery.** It now prohibits claim deletion as a generic resize shortcut, while leaving room for the carefully managed Retain/delete/rebind recovery procedure documented for exceptional cases.

## Review Notes

- The v1beta1 paths, reconciliation modes, `observedGeneration` fields, cluster label selector, PVC-retention behavior, chart values hierarchy, and direct custom-resource snippet match the current GA API and chart.
- The public Go API reference comments out `ClusterCondition.Type`, but its own README says the installed CRD YAML is authoritative. That CRD requires `type`, `status`, and `lastTransitionTime`, so the post's condition JSONPath is valid.
- The Helm values snippet was rendered to confirm that it produces `spec.template.spec.dataStore.volumeClaimTemplate.spec.resources.requests.storage: 200Gi`.
- Both `jq` expressions were exercised against representative Pod JSON. The PVC merge patch, JSONPath expressions, `kubectl` flags, and shell quoting are valid.
- The final CockroachDB health command matches the GA Operator documentation. `df -hT` and the listed `cockroach node status` flags were also checked in the official `cockroachdb/cockroach:v26.2.5` image.
- Helm 4 `--force-conflicts` guidance, manual field-ownership caveats, backup prerequisite, and warnings against fabricating PV capacity or generically deleting/recreating claims are technically sound.
- All seven links in the post's Official Documentation section resolved to the intended authoritative resources during review.

# Validation Summary: How to Prevent Wrong PVC Reuse During CockroachDB Scale-Down

## Status
validated

## Post Type
Technical guide and production operations runbook

## Technologies Covered

- CockroachDB
- CockroachDB Public Kubernetes Operator (`crdb.cockroachlabs.com/v1alpha1`)
- CockroachDB Operator (`crdb.cockroachlabs.com/v1beta1` and `CrdbNode`)
- Kubernetes StatefulSets, Pods, PersistentVolumeClaims, and PersistentVolumes
- Kubernetes storage classes, CSI storage, snapshots, and reclaim policies
- `kubectl`, JSONPath, and custom-column output
- GitOps safety controls for database scaling and storage cleanup

## Sources Consulted

- [CockroachDB Public Operator v2.18.4 README and deprecation notice](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/README.md)
- [Public Operator scale implementation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/scale.go), [decommission actor](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/decommission.go), [director](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/director.go), and [deploy actor](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/deploy.go)
- [Public Operator PVC pruner](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/persistent_volume_pruner.go), [feature gates](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/features/operator_features.go), and [node drainer](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/drainer.go)
- [Public Operator StatefulSet builder](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/statefulset.go) and [v1alpha1 CRD](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/config/crd/bases/crdb.cockroachlabs.com_crdbclusters.yaml)
- [CockroachDB node shutdown, decommissioning, membership, and recommissioning](https://www.cockroachlabs.com/docs/stable/node-shutdown?filters=decommission)
- [CockroachDB `node` command reference](https://www.cockroachlabs.com/docs/stable/cockroach-node) and [backup and restore overview](https://www.cockroachlabs.com/docs/stable/backup-and-restore-overview)
- [CockroachDB legacy Kubernetes deployment deprecation notice](https://www.cockroachlabs.com/docs/v26.2/kubernetes-deprecation-notice)
- [Official migration guide from v1alpha1 Public Operator resources to v1beta1 `CrdbCluster` and `CrdbNode`](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [Kubernetes StatefulSet storage and PVC retention](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention)
- [Kubernetes PersistentVolume reclaim policies](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming)
- [Kubernetes garbage collection and foreground deletion](https://kubernetes.io/docs/concepts/architecture/garbage-collection/#foreground-cascading-deletion) and [DeleteOptions API](https://kubernetes.io/docs/reference/kubernetes-api/definitions/delete-options-v1-meta/)
- [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/), [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/), and [`kubectl delete`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/) references
- [kubectl v1.34.1 custom-column parser](https://github.com/kubernetes/kubernetes/blob/v1.34.1/staging/src/k8s.io/kubectl/pkg/cmd/get/customcolumn.go) and [client-go v0.34.1 JSONPath parser](https://github.com/kubernetes/client-go/blob/v0.34.1/util/jsonpath/parser.go)
- [Kubernetes Event API deprecation notes](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event) and [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)

## Issues Found

- The PV inventory attempted to concatenate claim namespace and name inside one custom-column JSONPath. kubectl treats that as one invalid field path and prints no useful claim value. The command now uses separate `CLAIM_NAMESPACE` and `CLAIM_NAME` columns.
- The pruner description claimed that it parses and selects only ordinal suffixes at or above the replica count. The implementation instead builds exact active claim names, then selects other selector-matching claims with a claim-template/StatefulSet prefix. The explanation now describes the implemented algorithm.
- Event output was sorted by the legacy `.lastTimestamp` field, which can be unset for newer Event API data. It now sorts by `.metadata.creationTimestamp`.
- The manual PVC deletion sequence did not state that `kubectl delete` is name-based and does not enforce the inspected UID or resource version as an atomic precondition. The guide now requires scaling and cleanup to remain serialized through deletion.
- The reclaim-policy explanation incorrectly applied Kubernetes' `Released` phase to both the PV and the external storage asset. It now states that the PV enters `Released` while the external asset remains.
- The deletion step said to proceed after a backup or snapshot even though a CSI snapshot is not a substitute for a tested CockroachDB backup. It now requires the backup and treats an approved snapshot as optional additional evidence.
- The next-ordinal example did not state its zero-based assumption. It now explicitly ties ordinal 4 to this operator-generated StatefulSet's default start ordinal of 0.
- The guide implied that absence of the stale PVC guarantees a freshly provisioned store. A new claim can bind a pre-provisioned volume, so it now says the StatefulSet creates a new PVC and that dynamic provisioning can supply a fresh volume, which must be verified by UID, PV, and provider-side asset.
- `kubectl rollout status` could return success against the still-unchanged four-replica StatefulSet before the operator reconciled the custom-resource update. The commands now wait until `.spec.replicas` becomes 5 before watching StatefulSet rollout status.
- The automatic-pruning description implied that `AutoPrunePVC` runs on ordinary scale-up. In current Public Operator code, its only production call is in the scale-down/decommission path. The post now identifies the beginning/end scale-down calls and states that ordinary scale-up does not invoke the pruner.
- The pruner was said to wait for foreground deletion. It only submits a delete request with foreground propagation and then continues; it does not poll for the PVC, PV, or backing asset to disappear. The bullet now describes that behavior accurately.

## Review Notes

- The Public Operator v2.18.4 CRD and repository mark `v1alpha1` deprecated, but Cockroach Labs' support notice says this legacy deployment remains supported through CockroachDB v27.2 and is not supported from v27.3. The guide is intentionally scoped to the deprecated API and warns readers to check their API version.
- Relevant scale, pruning, actor, and resource behavior was checked in Public Operator v2.18.4 and current master; the reviewed implementation was unchanged between them.
- CockroachDB's `decommissioning` to `decommissioned` transition, zero-replica requirement, address-to-node-ID mapping, and recommission limitation were correct as written.
- All documentation links in the post resolved successfully during validation. The operational commands were reviewed against current official references and local kubectl v1.34.1 help; no destructive workflow was run against a live cluster.

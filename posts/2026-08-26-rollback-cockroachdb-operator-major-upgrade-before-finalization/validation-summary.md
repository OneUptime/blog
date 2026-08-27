# Validation Summary: How to Roll Back a CockroachDB Operator Major Upgrade Before Auto-Finalization

## Status

validated

## Post Type

Technical operations guide / rollback runbook

## Technologies Covered

- CockroachDB self-hosted major-version upgrades, rollback, and finalization
- CockroachDB cluster settings and virtual clusters
- Deprecated CockroachDB Public Operator (`crdb.cockroachlabs.com/v1alpha1`)
- Current CockroachDB Operator (`crdb.cockroachlabs.com/v1beta1`) migration boundary
- Kubernetes StatefulSets, ControllerRevisions, Pods, Events, and Deployments
- `kubectl`, Bash, SQL, JSONPath, and container image digests

## Sources Consulted

- [CockroachDB v26.2 upgrade guide](https://www.cockroachlabs.com/docs/v26.2/upgrade-cockroach-version)
- [CockroachDB v26.2 cluster-setting catalog](https://www.cockroachlabs.com/docs/v26.2/cluster-settings)
- [CockroachDB v23.2 release notes](https://www.cockroachlabs.com/docs/releases/v23.2)
- [CockroachDB virtual-cluster connection and upgrade guidance](https://www.cockroachlabs.com/docs/v26.2/work-with-virtual-clusters)
- [CockroachDB cluster-virtualization setting scopes](https://www.cockroachlabs.com/docs/v25.2/cluster-virtualization-setting-scopes)
- [CockroachDB release and support policy](https://www.cockroachlabs.com/docs/releases/)
- [CockroachDB cross-version restore compatibility](https://www.cockroachlabs.com/docs/v26.1/restoring-backups-across-versions)
- [CockroachDB Technical Advisory 69874](https://www.cockroachlabs.com/docs/advisories/a69874)
- [Public Operator v2.18.4 deprecation notice and CRD](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/install/crds.yaml)
- [Public Operator v1alpha1 webhook validation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/apis/v1alpha1/webhook.go)
- [Public Operator major-upgrade and rollback checks](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/update/update_cockroach_version.go)
- [Public Operator release-cycle logic](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/update/update_cockroach_version_common.go)
- [Public Operator partitioned-update actor](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/partitioned_update.go)
- [Public Operator partitioned StatefulSet strategy](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/update/update.go)
- [Public Operator SQL connection construction](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/database/connection.go)
- [Public Operator image resolution and `RELATED_IMAGE_COCKROACH_*` mapping](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/cluster.go)
- [Kubernetes StatefulSet rolling-update partitions](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#partitions)
- [kubectl StatefulSet rollout-status implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/polymorphichelpers/rollout_status.go)
- [Kubernetes container image name and digest syntax](https://kubernetes.io/docs/concepts/containers/images/#image-names)
- [Kubernetes Pod `ContainerStatus` API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#ContainerStatus)
- [kubectl events reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Automatic migration from the Public Operator to the CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)

## Issues Found

- The post used the nonexistent setting name `auto_upgrade.enabled`. Changed every SQL command and explanation to the documented `cluster.auto_upgrade.enabled`, and noted that the setting was introduced in v23.2.
- The post treated completion of finalization as the rollback cutoff. CockroachDB makes rollback unsupported when finalization begins, while `SHOW CLUSTER SETTING version` can continue to show the prior version until migration jobs finish. Updated the prerequisites, result interpretation, recovery section, and conclusion to use the start of finalization as the hard boundary and to require a matching nonempty `cluster.preserve_downgrade_option`.
- The SQL command claimed to connect to the system virtual cluster but used only `--host`, which selects the default virtual cluster when virtualization is enabled. Replaced it with the documented `--url` form containing `options=-ccluster=system`, while retaining a version-specific fallback for older non-virtualized releases.
- The Public Operator itself selects the SQL database named `system` but does not add a system-virtual-cluster routing option. Added a scope warning that its preserve-setting write and rollback check are not guaranteed to target the system virtual cluster on virtualized deployments; those deployments require release-specific Cockroach Labs guidance.
- The post implied that changing the `CrdbCluster` could reverse a partial or stalled mixed-image rollout. The actor refuses a new version action while the StatefulSet is updating, including while `currentRevision` and `updateRevision` differ. Added this controller precondition and directed partial-rollout incidents to settle the existing rollout safely or obtain a version-specific recovery plan rather than bypassing the StatefulSet.
- The database namespace was assumed to be `cockroach-operator-system`, conflating the `CrdbCluster` namespace with the manager Deployment namespace. Split these into `NAMESPACE` and `OPERATOR_NAMESPACE` and used each for the appropriate resources.
- `kubectl rollout status statefulset` can report the currently exposed partition complete before the operator lowers the partition for the next ordinal. Replaced it with an explicit StatefulSet field watch and documented the real completion checks: every pod's binary/image, observed generation, partition `0`, readiness, and matching revisions.
- The post treated `.status.containerStatuses[*].imageID` as a directly reusable image reference. Clarified that `imageID` is runtime-specific evidence, added the database-pod selector, and required a verified registry-pullable `repository@sha256:digest` reference. Also clarified that `cockroachDBVersion` selects an installed `RELATED_IMAGE_COCKROACH_*` mapping and does not itself guarantee digest pinning.
- The event command sorted on the legacy `lastTimestamp` field, and the log command took a snapshot despite being presented as a live watch. Replaced the former with current `kubectl events` and added `--follow` to the operator log stream.
- The cleanup warning said that any remaining new binary could trigger finalization. Automatic finalization requires all live nodes to run the new binary. Reworded the warning to cover a cluster that is or later becomes fully rolled forward.
- CockroachDB has major YY.R release series and patch releases, not minor releases. Replaced ambiguous `major/minor` wording with `YY.R major-version series` where it described CockroachDB versions.

## Review Notes

- The Public Operator and its v1alpha1 API are deprecated. The guide correctly distinguishes them from the current v1beta1 CockroachDB Operator and links to the official migration controller.
- Innovation-release skip logic depends on the installed Public Operator. The verified `24.3` to `24.1` and `25.2` to `24.3` rollback examples are present in v2.18.4; the skip logic first appeared in v2.18.0.
- `cluster.auto_upgrade.enabled` is unavailable on releases before v23.2, so the post correctly retains a version-availability caveat and explains that the legacy operator specifically requires `cluster.preserve_downgrade_option` for its rollback check.
- Public Operator timeouts and exact readiness behavior are release-specific. The post correctly avoids promising that the controller can recover an already unhealthy replication topology.
- All eight outbound links in the post returned HTTP 200 and pointed to the described official resources on 2026-08-27.
- Bash blocks passed a syntax check, the JSONPath forms were checked against kubectl syntax, and the edited Markdown passed `git diff --check`. No live Kubernetes/CockroachDB cluster was available for an end-to-end destructive rollback test.

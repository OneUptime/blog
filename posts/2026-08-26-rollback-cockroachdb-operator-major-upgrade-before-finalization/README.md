# How to Roll Back a CockroachDB Operator Major Upgrade Before Auto-Finalization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Upgrade, Rollback, Finalization, StatefulSet

Description: Roll a deprecated public-operator cluster back to a source-allowed prior release while CockroachDB still preserves that target cluster version and finalization has not begun.

---

A CockroachDB major-version upgrade has two boundaries. Replacing the binaries is reversible within the supported mixed-version window; starting cluster-version finalization runs migrations and makes a binary rollback unsupported. A Kubernetes rollout that looks complete may still be on the reversible side of that boundary, but only the database settings can prove it.

The deprecated CockroachDB public operator was designed around this distinction. Before a supported release transition, its partitioned-update code sets `cluster.preserve_downgrade_option` to the current YY.R major-version series, then updates StatefulSet pods one at a time. A rollback is permitted only when that preserved version matches the requested older version. Its current release-cycle logic can skip Innovation releases—for example, it permits `24.3` to `24.1` and `25.2` to `24.3`—so the target is not always the immediately preceding release. Do not reset the setting until the acceptance window is over.

This guide applies to the public `cockroach-operator` and `crdb.cockroachlabs.com/v1alpha1`. The current `v1beta1` CockroachDB Operator has different status and rollout resources. The public operator's internal upgrade connection selects the SQL database named `system`, but it does not explicitly route to the system virtual cluster. On a deployment with cluster virtualization enabled, use this guide only with version-specific Cockroach Labs guidance. It also assumes the target source and destination releases form an officially supported upgrade path; release-specific instructions override a generic runbook.

## Determine Whether Rollback Is Still Possible

Rollback requires all of these to be true:

- the requested target is one of the prior releases allowed by the installed operator's release-cycle logic;
- upgrade finalization has not begun;
- the target YY.R major-version series is still preserved;
- the StatefulSet has no update in progress, including matching `currentRevision` and `updateRevision` values and an observed latest generation;
- no application change now depends on features or semantics exclusive to the new version;
- the previous image digest remains available; and
- CockroachDB health is sufficient for a one-node-at-a-time rollout.

The start of finalization is the hard boundary. If it has begun, do not put older binaries back. Recovery then means fixing forward or restoring a compatible backup into a separate cluster according to CockroachDB's documented recovery process.

## Freeze Other Changes and Save Evidence

Stop new schema migrations, cluster-setting changes, node-count changes, certificate rotations, and storage work. Record both desired and actual versions:

```bash
export NAMESPACE=default # Change to the namespace containing the CrdbCluster.
export OPERATOR_NAMESPACE=cockroach-operator-system # Change if installed elsewhere.
export CLUSTER=cockroachdb

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" -o yaml \
  > "${CLUSTER}-before-major-rollback.yaml"

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" -o yaml \
  > "${CLUSTER}-statefulset-before-major-rollback.yaml"

kubectl get pods -n "$NAMESPACE" -o wide
kubectl events -n "$NAMESPACE"
```

Capture the current custom-resource image field and operator annotations:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='cockroachDBVersion={.spec.cockroachDBVersion}{" image="}{.spec.image.name}{"\n"}'

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='generation={.metadata.generation}{" observedGeneration="}{.status.observedGeneration}{" currentRevision="}{.status.currentRevision}{" updateRevision="}{.status.updateRevision}{" image="}{.spec.template.spec.containers[?(@.name=="db")].image}{"\n"}'
```

Container names vary across releases. If the JSONPath returns no image, inspect `.spec.template.spec.containers` directly.

## Ask CockroachDB, Not Kubernetes, About Finalization

Connect to the **system virtual cluster** as an administrative user. When cluster virtualization is enabled, selecting a virtual cluster requires `--url`, not only `--host`. A secure public-operator client pod in the `CrdbCluster` namespace can run this form, which explicitly selects the system virtual cluster:

```bash
kubectl exec -it -n "$NAMESPACE" cockroachdb-client-secure -- \
  /cockroach/cockroach sql \
  --url="postgresql://root@${CLUSTER}-public:26257?options=-ccluster=system&sslmode=verify-full" \
  --certs-dir=/cockroach/cockroach-certs
```

For an older non-virtualized release that does not support cluster selection, use that release's standard `--host="${CLUSTER}-public"` connection form instead.

Then query:

```sql
SHOW CLUSTER SETTING version;
SHOW CLUSTER SETTING cluster.preserve_downgrade_option;
SHOW CLUSTER SETTING cluster.auto_upgrade.enabled;
```

Setting availability is version-dependent. Older public-operator deployments use `cluster.preserve_downgrade_option`; current CockroachDB documentation recommends setting `cluster.auto_upgrade.enabled = false` before upgrades when that setting is supported. It was introduced in v23.2. Either mechanism can prevent auto-finalization, but the public operator's rollback code specifically checks the preserved downgrade option.

Interpret the results carefully. Suppose binaries moved from `vA.B` to `vC.D`:

- `version` still reports `A.B` and `cluster.preserve_downgrade_option` is `A.B`: the preserve setting is still blocking finalization, and the public operator can evaluate rollback if the StatefulSet is no longer updating.
- `version` reports `C.D`: finalization has completed and crossed the compatibility boundary, regardless of what Kubernetes images show.
- the preserve setting is empty or a different YY.R series: stop and investigate. Finalization may have begun, and in any case the public operator will reject the rollback target.

With cluster virtualization, finalization controls are scoped. Check the system virtual cluster and every relevant virtual cluster using the exact guidance for that CockroachDB release. The public operator's own SQL connection does not pass a virtual-cluster selector, so do not assume its preserve-setting write or rollback check targeted the system virtual cluster. A manual session against the system virtual cluster is necessary evidence, but it does not by itself make the public operator's automated rollback path safe on a virtualized deployment.

## Verify Every Binary and the Cluster's Health

A failed roll forward may leave mixed images. Query each pod's actual binary rather than reading only the StatefulSet template:

```bash
for pod in $(kubectl get pods -n "$NAMESPACE" \
  -l app.kubernetes.io/instance="$CLUSTER" \
  -o name); do
  kubectl exec -n "$NAMESPACE" "$pod" -- \
    /cockroach/cockroach version
done
```

Labels and binary paths differ across public-operator releases. Resolve the exact database pods before running a loop. Also verify that all expected pods are Ready, no range is unavailable, and the cluster can tolerate one node restarting. A rollback does not repair an already unhealthy replication topology.

The public operator refuses to start a new version action while the StatefulSet is still updating. In particular, a partial rollout normally leaves `currentRevision` and `updateRevision` different. In that state, patching the `CrdbCluster` back will not start a reverse rollout. Restore enough health for the existing rollout to settle, or obtain a version-specific recovery plan from Cockroach Labs; do not bypass this gate by editing the StatefulSet.

Record runtime image identities as evidence, then retain a registry-pullable `repository@sha256:digest` reference for the previous image:

```bash
kubectl get pods -n "$NAMESPACE" \
  -l app.kubernetes.io/instance="$CLUSTER" \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.containerStatuses[*]}{.name}{"="}{.imageID}{" "}{end}{"\n"}{end}'
```

The `imageID` format is container-runtime-specific and is not guaranteed to be reusable as `spec.image.name`. Verify it against registry or deployment records and retain the normalized pull reference.

Check release notes and technical advisories for both versions. Some patch releases have exceptional downgrade restrictions even inside a normally compatible major line.

## Keep Finalization Disabled During the Decision Window

Do not run either of these until rollback is no longer needed:

```sql
RESET CLUSTER SETTING cluster.preserve_downgrade_option;
SET CLUSTER SETTING cluster.auto_upgrade.enabled = true;
```

On versions where `cluster.auto_upgrade.enabled` exists, current official guidance prefers disabling it **before** the upgrade because it persists across upgrades:

```sql
SET CLUSTER SETTING cluster.auto_upgrade.enabled = false;
```

For a rollback already in progress, do not improvise setting changes without first recording their existing values and checking the matching-version documentation. The public operator automatically sets the legacy preserve option before a major roll forward; changing it mid-incident can make its own rollback check reject the target.

## Roll Back Through `CrdbCluster`, Not the StatefulSet

Select the same configuration field used before the upgrade. The public-operator webhook requires either `cockroachDBVersion` or `image.name`, but not both.

For an operator-supported version mapped through `RELATED_IMAGE_COCKROACH_*`, patch the old version. `cockroachDBVersion` selects the installed operator's mapping; it does not itself pin a digest, so first confirm that the mapping resolves to the approved retained image:

```bash
export PREVIOUS_CRDB_VERSION=vA.B.PATCH

kubectl patch crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  --type=merge \
  -p="{\"spec\":{\"cockroachDBVersion\":\"${PREVIOUS_CRDB_VERSION}\"}}"
```

For an explicit custom image, patch `spec.image.name` to the approved previous digest instead. Do not switch fields during an emergency unless you also make an atomic webhook-valid change and have tested that transition.

The public operator compares the desired and current semantic versions, reads `cluster.preserve_downgrade_option`, and permits a rollback only when the preserved YY.R series matches the target. It then performs a partitioned StatefulSet update. Never use `kubectl set image statefulset` or delete all pods at once; both bypass controller and database safety checks.

## Watch the Partitioned Rollback

Follow the custom resource, StatefulSet revisions, pods, and operator log:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" -o yaml --watch

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" --watch \
  -o custom-columns='NAME:.metadata.name,GENERATION:.metadata.generation,OBSERVED:.status.observedGeneration,PARTITION:.spec.updateStrategy.rollingUpdate.partition,READY:.status.readyReplicas,UPDATED:.status.updatedReplicas,CURRENT:.status.currentRevision,UPDATE:.status.updateRevision'

kubectl get pods -n "$NAMESPACE" -o wide --watch

kubectl logs -n "$OPERATOR_NAMESPACE" \
  deployment/cockroach-operator-manager \
  --since=1h --all-containers=true --follow
```

Use separate terminals for watches. `kubectl rollout status` is not a whole-operation completion signal here: it can report success for the partition currently exposed while the operator still has lower ordinals to update. The public operator updates one ordinal at a time and checks readiness, but the installed release may have fixed timeouts. If a pod cannot become Ready, preserve its events and logs. Do not manually advance to the next pod by deleting it.

After each restart, verify SQL connectivity, node liveness, range availability, and application error rate. At completion, every pod should run the approved previous digest, the latest StatefulSet generation should be observed, the partition should be `0`, and the StatefulSet's current and update revisions should match.

## Verify the Database After Rollback

Re-run:

```sql
SHOW CLUSTER SETTING version;
SHOW CLUSTER SETTING cluster.preserve_downgrade_option;
SHOW CLUSTER SETTING cluster.auto_upgrade.enabled;
```

The cluster version should remain the preserved target version. Keep auto-upgrade disabled while investigating the failed release. Validate backups, changefeeds, scheduled jobs, schema changes, and client compatibility; a successful pod rollout alone does not prove workload recovery.

Do not immediately reset the preserve option as cleanup. That can permit automatic finalization if the cluster is, or later becomes, fully rolled forward. First prove that every pod runs the old version and that the desired custom resource also points to it.

## If Finalization Already Started

Stop the binary rollback. Once finalization begins, older binaries may not understand migrated system tables or cluster features. `SHOW CLUSTER SETTING version` can continue to report the previous version while migration jobs run, so a matching preserved downgrade option is essential evidence; the new version in `SHOW` proves that finalization completed, but it is a late signal. When the preserve setting does not match the requested target, the public operator's update code returns an error equivalent to “can't rollback since release already finalized.”

Choose one of these supported directions:

- fix forward to a corrected patch in the finalized major line;
- engage Cockroach Labs support for a version-specific recovery plan; or
- restore an eligible pre-upgrade backup into a separate cluster running a compatible version, then cut over through a tested disaster-recovery procedure.

Never change the version setting manually to make it look older. Cluster version is not a cosmetic flag.

## Build a Safer Upgrade Gate

- Set `cluster.auto_upgrade.enabled = false` before a major upgrade when supported.
- Confirm the public operator set the previous `cluster.preserve_downgrade_option` before the first pod changes.
- Pin both old and new images by digest for the full rollback window.
- Record `SHOW CLUSTER SETTING version` throughout the rollout.
- Block schema and application changes that require post-finalization behavior.
- Define explicit observe, rollback, and finalize decision points.
- Take and test a backup before the change.
- Migrate from the deprecated public operator to the current CockroachDB Operator using the official controller.

## Official Documentation

- [CockroachDB public operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public operator partitioned-update controller](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/actor/partitioned_update.go)
- [Public operator major-upgrade and rollback checks](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/update/update_cockroach_version.go)
- [Upgrade CockroachDB self-hosted](https://www.cockroachlabs.com/docs/stable/upgrade-cockroach-version)
- [CockroachDB cluster-version finalization controls](https://www.cockroachlabs.com/docs/stable/work-with-virtual-clusters#upgrade-a-cluster)
- [CockroachDB releases and support policy](https://www.cockroachlabs.com/docs/releases/)
- [Kubernetes StatefulSet rolling updates](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#rolling-updates)
- [Automatic migration from the public operator to the CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)

## Conclusion

Rollback is possible only while CockroachDB still preserves the requested source-allowed target version and finalization has not begun. Prove that boundary with SQL, keep finalization disabled, retain the old digest, and ask the public operator to roll the `CrdbCluster` back one node at a time. If finalization has begun, older binaries are no longer a rollback plan; fix forward or restore through a supported disaster-recovery path.

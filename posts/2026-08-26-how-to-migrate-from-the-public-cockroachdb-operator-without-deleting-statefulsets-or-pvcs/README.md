# How to Migrate from the Public CockroachDB Operator Without Deleting StatefulSets or PVCs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Migration, StatefulSet, Persistent Volumes, Data Safety

Description: Migrate a legacy v1alpha1 Public Operator cluster to the GA v1beta1 CockroachDB Operator with the supported controller, preserving PVCs and deleting the StatefulSet only at the documented handoff point.

---

The supported migration does not begin by deleting a StatefulSet. It lets the new CockroachDB Operator replace its pods one at a time, reusing the existing persistent volume claims, while checking CockroachDB health between replacements. Only after every old StatefulSet pod has been scaled to zero and finalization has finished does the controller ask an administrator to delete the now-empty StatefulSet object.

This distinction matters because two products share similar names:

- the legacy Public Operator uses `crdb.cockroachlabs.com/v1alpha1`, manages a StatefulSet, and lives in `cockroachdb/cockroach-operator`;
- the GA CockroachDB Operator uses `crdb.cockroachlabs.com/v1beta1` plus `CrdbNode` resources and is distributed through `cockroachdb-parent`.

The commands below summarize the official **automatic controller migration**. Pin the chart and operator releases you tested, then follow the matching version of the official guide. Do not combine these steps with the separate manual-migration guide.

## Establish a Recoverable Starting Point

Inventory the cluster before changing controller ownership:

```bash
export CRDBCLUSTER=cockroachdb
export NAMESPACE=database
export REGION=us-east-1
export CLOUD_PROVIDER=aws

kubectl get crdbclusters.v1alpha1.crdb.cockroachlabs.com \
  "$CRDBCLUSTER" -n "$NAMESPACE" -o yaml > public-operator-cr.yaml
kubectl get statefulset "$CRDBCLUSTER" -n "$NAMESPACE" -o wide
kubectl get pvc -n "$NAMESPACE" -o wide
kubectl rollout status statefulset/"$CRDBCLUSTER" -n "$NAMESPACE"
```

All StatefulSet pods must be Running and Ready, with no rollout or scale operation in progress. Check the guide's compatibility table as well. Dedicated WAL-failover PVCs, dedicated log PVCs, ServiceMonitor or PodMonitor resources, and NetworkPolicies have explicit limitations or require separate handling.

Keep the Public Operator running. It is required for automatic rollback before the point of no return. A backup is still prudent, but a backup does not make unsupported resource deletion safe.

For a secure cluster using custom `nodeTLSSecret` or `clientTLSSecret`, the node certificate must already contain the GA join-service names:

```text
<cluster>-join
<cluster>-join.<namespace>
<cluster>-join.<namespace>.svc.cluster.local
```

The migration controller cannot regenerate a user-supplied certificate without its CA private key. It can update cert-manager `Certificate` resources and can regenerate Public Operator self-signed certificates, but custom secrets remain the user's responsibility.

## Stop the Old Controller, Not the Database

First tell the Public Operator not to reconcile this one `v1alpha1` object:

```bash
kubectl label crdbcluster "$CRDBCLUSTER" \
  crdb.io/skip-reconcile=true -n "$NAMESPACE" --overwrite
```

Leave this label in place for as long as the Public Operator is installed. Removing it early can make the old controller recreate the StatefulSet and fight the new operator over services, RBAC, and disruption budgets.

Add the conversion inputs required by the migration:

```bash
kubectl annotate crdbcluster "$CRDBCLUSTER" \
  crdb.cockroachlabs.com/cloudProvider="$CLOUD_PROVIDER" \
  crdb.cockroachlabs.com/regionCode="$REGION" \
  --overwrite -n "$NAMESPACE"
```

Multi-region clusters also need the cloud, region, and zone labels described in the official guide on their Kubernetes nodes. Do not accept the fallback region silently if it is wrong for the deployed cluster.

## Isolate the Two Generations of Admission Webhooks

Before installing the migration-enabled operator, patch both Public Operator webhook entries to use `matchPolicy: Exact`:

```bash
kubectl patch validatingwebhookconfiguration \
  cockroach-operator-validating-webhook-configuration \
  --type=json \
  -p='[{"op":"add","path":"/webhooks/0/matchPolicy","value":"Exact"}]'

kubectl patch mutatingwebhookconfiguration \
  cockroach-operator-mutating-webhook-configuration \
  --type=json \
  -p='[{"op":"add","path":"/webhooks/0/matchPolicy","value":"Exact"}]'
```

The legacy configurations otherwise use Kubernetes' default `Equivalent` policy and can intercept a `v1beta1` request after API conversion. This live patch does not survive a redeploy of the Public Operator, so recheck it throughout coexistence.

Install the GA Operator with migration enabled, a non-colliding application label, and the intended namespace scope:

```bash
helm upgrade --install crdb-operator ./cockroachdb-parent/charts/operator \
  --set migration.enabled=true \
  --set cloudRegion="$REGION" \
  --set appLabel=cockroachdb-operator \
  --set watchNamespaces="$NAMESPACE"
```

The migration controller acts only on a cluster carrying `crdb.io/migrate`. Converted legacy objects otherwise have `spec.mode: Disabled`, so installing the controller is not itself permission to migrate every cluster.

## Start and Observe the Node-by-Node Migration

Start the selected cluster:

```bash
kubectl label crdbcluster "$CRDBCLUSTER" \
  crdb.io/migrate=start -n "$NAMESPACE" --overwrite
```

The documented phase order is:

```text
Init -> CertMigration -> PodMigration -> Finalization -> user deletes STS -> Complete
```

Watch status, events, and `CrdbNode` creation:

```bash
kubectl get crdbcluster "$CRDBCLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.status.migration.phase}{" "}{.status.migration.message}{"\n"}' -w

kubectl get crdbnode -n "$NAMESPACE" \
  -l crdb.cockroachlabs.com/cluster="$CRDBCLUSTER" -w

kubectl get events -n "$NAMESPACE" \
  --field-selector involvedObject.name="$CRDBCLUSTER" \
  --sort-by=.lastTimestamp
```

During `PodMigration`, the controller creates a `CrdbNode`, waits for its pod, endpoint, and SQL health checks, then scales the StatefulSet down by one. It proceeds from the highest ordinal and keeps the logical cluster at its intended size. The associated PVC is reused; do not delete or rename claims.

If health does not converge, the controller can enter `PhaseStopped`. Diagnose the recorded error and cluster health, then resume with the same `crdb.io/migrate=start --overwrite` label. Do not force the StatefulSet replica count or manually construct `CrdbNode` objects around a stopped migration.

## Delete the StatefulSet Only When Finalization Says So

At `Finalization`, verify the exact controller message:

```bash
kubectl get crdbcluster "$CRDBCLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.status.migration.phase}{"\n"}{.status.migration.message}{"\n"}'
```

Proceed only when the message says:

```text
Finalization complete. Delete the StatefulSet to mark migration complete.
```

At this point all StatefulSet pods are already scaled to zero. Delete only the StatefulSet object:

```bash
kubectl get statefulset "$CRDBCLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.spec.replicas}{"\n"}'
# Expected: 0

kubectl delete statefulset "$CRDBCLUSTER" -n "$NAMESPACE"

kubectl get crdbcluster "$CRDBCLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.spec.mode}{" "}{.status.migration.phase}{"\n"}'
# Expected: MutableOnly Complete
```

There is no command here to delete PVCs. Deleting the StatefulSet earlier bypasses the controller's handoff and also crosses an important rollback boundary.

## Respect the Rollback Boundary

The official rollback table is more precise than “rollback is always available.” Automatic rollback is supported in `Init`, `CertMigration`, and `PodMigration`. It is conditional during `Finalization`: the original StatefulSet must still exist. Once that StatefulSet has been deleted and migration reaches `Complete`, automatic rollback is no longer available.

Rollback before that boundary restores service selectors and StatefulSet ownership, deletes migration `CrdbNode` objects, and lets the Public Operator resume last. The rollback path can delete the `CrdbNode` PVCs and let the StatefulSet create fresh claims, with data re-replicated from the surviving cluster. That is different from the forward path's PVC reuse and is another reason to retain enough replication and capacity.

After completion, verify `metadata.generation` equals `status.observedGeneration`, all `CrdbNode` pods are Ready, under-replicated ranges are zero, and the certificate and log configuration survived conversion. Adopt the cluster into the CockroachDB Helm chart if desired. Only after **every** legacy cluster is migrated should you remove the Public Operator, clear coexistence labels, remove `v1alpha1` from the CRD's `storedVersions`, and disable migration mode in the order documented by Cockroach Labs.

## Official Documentation

- [Automatic migration from the Public Operator to the CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [CockroachDB Helm charts and supported migration paths](https://github.com/cockroachdb/helm-charts)
- [GA CockroachDB Operator chart](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md)
- [Kubernetes StatefulSet storage behavior](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

## Conclusion

The safe migration is an ownership transfer, not a storage teardown. Pause the Public Operator with its label, isolate the two API generations' webhooks, let the official controller replace nodes and reuse claims, and treat the finalization message as the sole authorization to delete the zero-replica StatefulSet. PVC deletion is never part of the forward migration.

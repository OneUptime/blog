# How to Stop CockroachDB Operator Scale-Down from Orphaning or Reusing the Wrong PVC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Persistent Volumes, StatefulSet, Scale Down, Data Safety

Description: Prevent the deprecated CockroachDB public operator from reusing a decommissioned store by reconciling database membership, StatefulSet ordinals, PVCs, and PV reclaim policy.

---

The deprecated CockroachDB public operator intentionally leaves persistent volume claims behind after a scale-down unless its alpha automatic-pruning feature is enabled. Kubernetes StatefulSets also retain their claims by default. That protects data from an accidental replica reduction, but it creates a trap: scaling the same ordinal up later can attach the old store whose CockroachDB node ID was permanently decommissioned.

The safe rule is simple but strict: **never decide whether a CockroachDB PVC is stale from its name alone**. Prove that its pod ordinal is absent, its database node is fully decommissioned with zero replicas, and its underlying volume is the one you intend to retire.

This guide covers the public `cockroach-operator` and `crdb.cockroachlabs.com/v1alpha1` `CrdbCluster`, which creates a StatefulSet. The newer `v1beta1` CockroachDB Operator manages `CrdbNode` objects and has a different storage lifecycle. Check the API version before using this runbook.

## Why the Orphan Exists

Four independent controllers or policies participate in the lifecycle:

```text
CrdbCluster.spec.nodes
        |
        v
public operator -> StatefulSet replicas -> Pod ordinal
                                          |
                                          v
                                  PVC -> PV -> storage asset

CockroachDB membership is a separate database state machine.
```

During a public-operator scale-down, CockroachDB decommissions the highest ordinal before the operator lowers the StatefulSet replica count. Lowering a StatefulSet does not normally delete its PVC. The public operator contains its own PVC pruner, but the `AutoPrunePVC` feature gate is alpha and disabled by default. Its source explicitly says the gate remains alpha because a failed decommission combined with deletion could corrupt the database.

This produces two valid post-scale-down states:

- **Retained orphan:** the pod is gone, the node is decommissioned, and the PVC remains for manual review.
- **Pruned storage:** the pod is gone, the node is decommissioned, and a reviewed process removes the unused PVC.

The dangerous state is a newly created pod mounting the retained store after its node ID is already `decommissioned`.

## Inventory Every Identity Before Scaling

Set the namespace and cluster name, then capture the custom resource and StatefulSet:

```bash
export NAMESPACE=cockroach-operator-system
export CLUSTER=cockroachdb

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='api={.apiVersion} requested={.spec.nodes}{"\n"}'

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" -o yaml \
  > "${CLUSTER}-statefulset-before-scale.yaml"

kubectl get pods -n "$NAMESPACE" -o wide
kubectl get pvc -n "$NAMESPACE" -o wide --show-labels
```

For every PVC generated from a `volumeClaimTemplate`, record its ordinal, bound PV, capacity, StorageClass, and UID:

```bash
kubectl get pvc -n "$NAMESPACE" \
  -o custom-columns='NAME:.metadata.name,UID:.metadata.uid,STATUS:.status.phase,VOLUME:.spec.volumeName,CLASS:.spec.storageClassName,CAPACITY:.status.capacity.storage'

kubectl get pv \
  -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,CLAIM:.spec.claimRef.namespace/.spec.claimRef.name,RECLAIM:.spec.persistentVolumeReclaimPolicy,CLASS:.spec.storageClassName'
```

Do not rely on a broad application label to delete claims. Other data, WAL, log, backup, or sidecar volumes can share labels. The public operator's pruner derives expected claim names from the StatefulSet's `volumeClaimTemplates` and treats only ordinals greater than or equal to current replicas as unused.

## Map a Pod Ordinal to a CockroachDB Node ID

A StatefulSet ordinal and a CockroachDB node ID are not interchangeable. Query membership from a healthy pod and match the target pod's advertised address:

```bash
export HEALTHY_POD="${CLUSTER}-0"

kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node status \
  --host="${CLUSTER}-public" \
  --certs-dir=/cockroach/cockroach-certs \
  --decommission
```

For an insecure cluster, replace `--certs-dir` with `--insecure`. A restored or previously replaced ordinal can have a node ID that does not equal ordinal plus one. Preserve the address-to-ID evidence in the change record.

Before scale-down, the target should be active and live. During scale-down it becomes `decommissioning` while replicas move away. Only after membership is `decommissioned` and the replica count is zero is the old store permanently retired.

## Scale Down Through the Custom Resource

Change `CrdbCluster.spec.nodes`; never scale the child StatefulSet directly:

```bash
kubectl patch crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  --type=merge \
  -p '{"spec":{"nodes":4}}'
```

Replace `4` with the reviewed target, and never reduce a production CockroachDB cluster below a supported, survivable topology. Monitor three checkpoints:

1. CockroachDB moves the highest ordinal's replicas and leases to eligible stores.
2. Its membership becomes `decommissioned`.
3. The StatefulSet replica count falls and the pod disappears.

Observe controller conditions, events, and logs while this happens:

```bash
kubectl describe crdbcluster "$CLUSTER" -n "$NAMESPACE"
kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp
kubectl logs -n "$NAMESPACE" \
  deployment/cockroach-operator-manager \
  --since=2h --all-containers=true
```

Adjust the Deployment name to the installed release. If decommission stalls, do not delete its PVC. The node may still own the only surviving copy of a range.

## Classify the PVC After the Pod Is Gone

Suppose the StatefulSet now has four replicas, ordinals 0 through 3, while a claim ending in ordinal 4 remains. Treat that claim as a candidate, not a conclusion.

Verify all of the following:

- StatefulSet `.spec.replicas` is 4 and `.status.readyReplicas` is healthy.
- No pod with ordinal 4 exists or is terminating.
- The recorded CockroachDB node ID for ordinal 4 has membership `decommissioned`.
- It reports zero replicas.
- The claim name matches a current StatefulSet `volumeClaimTemplate` plus cluster name and ordinal.
- The claim UID and bound PV match the pre-change inventory.
- No snapshot, backup, or incident hold requires preserving it.

If membership is only `decommissioning`, decide whether to let removal finish or abort by restoring `spec.nodes` and explicitly recommissioning the node. Do not destroy its storage in either ambiguous state.

## Remove an Orphan Deliberately

First inspect the reclaim policy of the exact bound PV:

```bash
export PVC=datadir-cockroachdb-4
export TARGET_PV=$(kubectl get pvc "$PVC" -n "$NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

kubectl get pvc "$PVC" -n "$NAMESPACE" -o yaml
kubectl get pv "$TARGET_PV" \
  -o jsonpath='pv={.metadata.name} reclaim={.spec.persistentVolumeReclaimPolicy} class={.spec.storageClassName}{"\n"}'
```

Review the resolved names before the deletion command. Do not turn the example variables into an unattended loop.

With reclaim policy `Delete`, deleting the PVC normally causes the dynamically provisioned PV and external storage asset to be deleted. With `Retain`, the PV and storage asset remain in a released state and need a separate sanitization or recovery process. A CSI snapshot is not a substitute for a tested CockroachDB backup, but it can be useful for an approved forensic hold.

After the required backup or snapshot, delete only the confirmed orphan claim:

```bash
kubectl delete pvc "$PVC" -n "$NAMESPACE"
```

Then verify the expected provider-side outcome. Do not manually delete a retained PV until the recovery owner confirms whether the data must be preserved and how the storage asset will be sanitized.

## Make the Next Scale-Up Safe

Before increasing `spec.nodes`, calculate which ordinal the StatefulSet will create. For a four-replica StatefulSet, the next pod is ordinal 4. Confirm no claim from the old ordinal remains:

```bash
kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='replicas={.spec.replicas}{"\n"}'

kubectl get pvc -n "$NAMESPACE" -o name | rg -- "-${CLUSTER}-4$"
```

If `rg` is not installed on the operator workstation, filter the exact generated claim name with `kubectl get pvc`. Absence of the stale claim allows the StatefulSet to provision a fresh store. Raise the custom resource by one, then wait for the new pod to become healthy before adding another:

```bash
kubectl patch crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  --type=merge \
  -p '{"spec":{"nodes":5}}'

kubectl rollout status statefulset "$CLUSTER" -n "$NAMESPACE"
```

Confirm CockroachDB reports a new active node ID and that ranges begin balancing to it. A new Kubernetes pod UID alone is not proof of a new CockroachDB store; the PVC and membership evidence must also be new.

## Understand Automatic Pruning Before Enabling It

The public operator's alpha `AutoPrunePVC` gate prunes claims before and after scaling. The implementation:

- reads the current StatefulSet replica count;
- builds the set of claim names expected for active ordinals;
- filters claims by the StatefulSet selector and claim-template prefixes;
- watches for concurrent replica changes;
- deletes by exact PVC UID and resource version; and
- waits for foreground deletion of each selected claim.

Those safeguards reduce races but do not replace database-level proof or backups. The source itself warns that the feature can delete data and keeps it disabled by default. If an organization chooses to enable it, pin the operator version, test failure injection with the real CSI driver and reclaim policy, serialize scaling operations, and alert on pruning errors. Do not copy an unversioned feature-gate argument from a blog into production; use the manifest and release documentation for the installed version.

## GitOps Guardrails

Add policy checks around every node-count change:

- reject a scale-up if a PVC exists for the next ordinal and its recorded node ID is decommissioned;
- reject a scale-down while another upgrade, resize, or scaling operation is active;
- require database membership and zero-replica evidence before storage deletion;
- require an explicit backup-retention decision for every removed volume;
- compare the PV reclaim policy with the expected provider-side result;
- alert on PVCs whose ordinal is outside the StatefulSet replica range; and
- keep cleanup and scaling as separate, auditable changes.

Do not auto-delete every claim whose ordinal exceeds replicas across arbitrary StatefulSets. The CockroachDB membership check is what makes this workflow safe.

## Official Documentation

- [CockroachDB public operator repository and PVC warning](https://github.com/cockroachdb/cockroach-operator)
- [Public operator scaling and PVC-pruning sequence](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/scale.go)
- [Public operator PVC pruner implementation](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/persistent_volume_pruner.go)
- [Public operator feature gates and `AutoPrunePVC` risk](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/features/operator_features.go)
- [CockroachDB node decommission and membership states](https://www.cockroachlabs.com/docs/stable/node-shutdown?filters=decommission)
- [Kubernetes StatefulSet stable storage](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage)
- [Kubernetes persistent volume reclaim policy](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming)
- [Kubernetes StatefulSet PVC retention policy](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention)

## Conclusion

An orphaned public-operator PVC is a safety mechanism until evidence proves it is stale. Tie together the StatefulSet ordinal, exact claim and PV, CockroachDB node ID, membership state, and reclaim policy. Delete storage only after decommission is complete, then verify that a future scale-up provisions a fresh store. That discipline prevents both sides of the failure: premature data loss during scale-down and reuse of a permanently decommissioned identity during scale-up.

# Why Upscaling During a CockroachDB Operator Downscale Can Leave a Node in `DECOMMISSIONING`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Decommissioning, Scaling, StatefulSet, Incident Recovery

Description: Explain why raising a public-operator node count does not cancel CockroachDB decommissioning, then safely choose between recommissioning the existing node and replacing its storage.

---

Changing a Kubernetes replica target and changing CockroachDB membership are separate operations. During a scale-down, the deprecated CockroachDB public operator first runs `cockroach node decommission --wait=none`, waits for replicas to leave the target, performs the final decommission step, and only then reduces its StatefulSet. Raising `spec.nodes` does not cancel that reconciliation if it is still running. If the reconciliation stalls, fails, times out, or is interrupted before final decommission and StatefulSet reduction, a later reconciliation may find that the StatefulSet already matches the restored requested size while the database node remains in `DECOMMISSIONING`.

The upscale did not roll the membership change back. It only removed the desired-count mismatch that a future operator reconciliation would use to start scaling.

This behavior applies to the public `cockroach-operator` and its `crdb.cockroachlabs.com/v1alpha1` `CrdbCluster`. The current `v1beta1` CockroachDB Operator uses `CrdbNode` resources and a different reconciliation design. During migration, CRD conversion can serve the same cluster object through either API version, so the version returned by `kubectl` is not conclusive by itself. Establish which controller manages the cluster and its migration state before following this recovery path.

## The Two State Machines Do Not Form a Transaction

Consider a five-node public-operator cluster whose desired count is changed to four:

```text
CrdbCluster spec.nodes       5 -> 4
StatefulSet replicas         5
CockroachDB node 5           active -> decommissioning
CockroachDB node 5 replicas  moving toward 0
```

The public operator deliberately retains pod ordinal 4 while its CockroachDB node is decommissioning. Its source starts decommissioning with `--wait=none`, polls `node status --decommission`, and changes the node's membership to `decommissioned` only after its replica count reaches zero. The StatefulSet is reduced afterward.

Now suppose the active decommission reconciliation stalls or exits before final decommission and StatefulSet reduction, and an operator changes `spec.nodes` back to five. On a later reconciliation, the controller can observe that the CockroachDB workload already has five replicas. There is nothing to scale up or down, but CockroachDB membership is still a separate fact:

```text
CrdbCluster spec.nodes       5
StatefulSet replicas         5
CockroachDB node 5           decommissioning
```

The public operator's scale path contains a source-code note about recommissioning after a timed-out decommission, but it does not implement that rollback. Setting the count back is therefore not a recommission command.

## Freeze the Decision and Capture Evidence

Do not keep toggling the count. Record the custom resource, StatefulSet, pod identities, operator version, and database membership:

```bash
export NAMESPACE=cockroach-operator-system
export CLUSTER=cockroachdb
export CRDB_RESOURCE=crdbclusters.v1alpha1.crdb.cockroachlabs.com

kubectl get "$CRDB_RESOURCE" "$CLUSTER" -n "$NAMESPACE" -o yaml \
  > "${CLUSTER}-scaling-state.yaml"

kubectl get "$CRDB_RESOURCE" "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='api={.apiVersion} requested={.spec.nodes} sqlPort={.spec.sqlPort} grpcPort={.spec.grpcPort}{"\n"}'

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='replicas={.spec.replicas} ready={.status.readyReplicas}{"\n"}'

kubectl get pods,pvc -n "$NAMESPACE" -o wide
kubectl get deployment -n "$NAMESPACE" -o wide
kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp
```

During migration, also inspect the cluster's migration or skip labels and the active operator Deployments. The returned `apiVersion` alone does not identify the managing controller.

Record the configured controller image reference rather than relying only on a release name. This field shows a digest only when the Deployment itself uses one; it does not resolve a mutable tag to its runtime digest:

```bash
kubectl get deployment cockroach-operator-manager -n "$NAMESPACE" \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{" "}{.image}{"\n"}{end}'
```

Names differ by installation method and release. Substitute the actual Deployment name.

## Identify the Database Node Behind the Highest Ordinal

Public-operator scale-down works from the highest StatefulSet ordinal. Query membership from a healthy pod using the security mode, Service name, and SQL port actually configured for the cluster:

```bash
export HEALTHY_POD="${CLUSTER}-0"
export SQL_PORT="$(kubectl get "$CRDB_RESOURCE" "$CLUSTER" -n "$NAMESPACE" -o jsonpath='{.spec.sqlPort}')"
export GRPC_PORT="$(kubectl get "$CRDB_RESOURCE" "$CLUSTER" -n "$NAMESPACE" -o jsonpath='{.spec.grpcPort}')"

kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node status \
  --host="${CLUSTER}-public" \
  --port="$SQL_PORT" \
  --certs-dir=/cockroach/cockroach-certs \
  --decommission
```

For an insecure cluster, use `--insecure` instead of `--certs-dir`. Match the pod hostname or address to its CockroachDB node ID. Do not assume node ID 5 belongs to pod ordinal 4; restored stores and previous replacements can break that apparent sequence.

Interpret three fields together:

- `membership=decommissioning` means permanent removal began but is not final;
- `membership=decommissioned` means the node ID is permanently removed; and
- the replica count shows whether data relocation is still in progress.

A decommissioning node can be recommissioned. A fully decommissioned node cannot.

## Choose One Outcome

There are only two coherent outcomes:

1. **Keep this exact CockroachDB node.** Stop the scale-down intent and recommission the node before it becomes fully decommissioned.
2. **Complete removal.** Let decommission finish, remove the pod through the public operator, and treat any later upscale as creation of a new CockroachDB node with a fresh store.

Trying to keep the pod while allowing its membership to become permanently decommissioned creates the dangerous middle state. The Pod can remain in the Kubernetes `Running` phase while its CockroachDB readiness probe fails; Pod phase or container status alone is not evidence that its store is an active member.

## Abort the Scale-Down by Recommissioning

Use this path only while the target's membership is `decommissioning` and the operational decision is to retain it. Confirm first that no public-operator scale-down reconciliation is still advancing the node toward final decommission. Changing `spec.nodes` does not cancel an `EnsureScale` operation already in progress. If one is still running, pause the controller using the procedure appropriate to that installation, recheck membership and replica count, and only then proceed.

First, make the public-operator desired count equal the currently retained StatefulSet size so a later reconcile does not immediately start removing the same ordinal again:

```bash
kubectl patch "$CRDB_RESOURCE" "$CLUSTER" -n "$NAMESPACE" \
  --type=merge \
  -p '{"spec":{"nodes":5}}'
```

Replace `5` with the intended count. Confirm that the custom resource and StatefulSet agree, and check that no controller log shows an in-flight or new final decommission attempt. The previously issued database operation does not disappear merely because the spec changed.

Then recommission the exact node ID:

```bash
kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node recommission TARGET_NODE_ID \
  --host="${CLUSTER}-public" \
  --port="$GRPC_PORT" \
  --certs-dir=/cockroach/cockroach-certs
```

Use `--insecure` for an insecure cluster. Re-run `node status --decommission` until membership is `active` and `is_decommissioning` is false. The official node-shutdown guide notes that a node already in the draining stage may need a restart after recommissioning. Let the public operator perform normal pod reconciliation; do not delete the store.

Finally, verify:

- all expected nodes are live and active;
- ranges are not under-replicated or unavailable;
- replica counts begin balancing back across the recommissioned node;
- SQL and DB Console traffic no longer target a draining process;
- operator logs show no new decommission attempt; and
- any earlier failed `Decommission` action or condition is treated as potentially stale after this out-of-band recovery.

If a final decommission completed between inspection and the recommission command, stop. Do not force the old store to rejoin.

## Complete Removal and Scale Up with a Fresh Store

If membership is already `decommissioned`, CockroachDB documentation is explicit: that node ID cannot be recommissioned. Complete the originally intended public-operator scale-down or resolve why its StatefulSet reduction is stalled. Confirm that the removed ordinal no longer has a pod.

The public operator disables automatic PVC pruning by default. Consequently, a PVC for the removed ordinal may remain. Reusing it during an upscale can restart the permanently decommissioned store identity. Before asking the StatefulSet to recreate that ordinal:

1. verify in CockroachDB that the old node membership is `decommissioned` and owns no replicas;
2. map the absent highest ordinal to its exact PVC and persistent volume;
3. take any backup or forensic snapshot required by policy;
4. verify the StatefulSet no longer claims an active pod for it;
5. remove the stale claim through a reviewed storage change; and
6. only then raise `spec.nodes`, allowing a fresh store to join with a new node ID.

Never delete a PVC simply because its ordinal looks high. Confirm the pod, volume, store, and database node mapping from live evidence. The bound PersistentVolume's reclaim policy, usually inherited from the StorageClass, determines whether deleting the claim also deletes the backing storage asset.

## If Recommissioning Appears to Succeed but the Pod Is Unhealthy

Check whether the node had reached the drain stage. Its membership can be active again while the process remains draining. Review the CockroachDB `OPS` logs and public-operator logs:

```bash
kubectl logs -n "$NAMESPACE" "${CLUSTER}-4" --since=2h

kubectl logs -n "$NAMESPACE" \
  deployment/cockroach-operator-manager \
  --since=2h --all-containers=true
```

Also confirm that certificates, Service DNS, and the store mount match the original pod. A restart can address a recommissioned process that remained drained, but a restart cannot make a permanently decommissioned store valid again.

## Avoid Three Common Recovery Mistakes

### Scaling the StatefulSet directly

`kubectl scale statefulset` changes a child resource the public operator owns. The controller will reconcile it, and Kubernetes may remove a pod before the database transition is safe. Change `CrdbCluster.spec.nodes` only.

### Recommissioning without canceling the desired scale-down

If `spec.nodes` still asks for fewer replicas, the public operator can start decommissioning the same highest ordinal again. Make the desired topology coherent before restoring membership.

### Reusing a decommissioned PVC

A Running pod is not evidence that its CockroachDB store has active membership. Fully decommissioned IDs are permanent; a later scale-up needs a new store and new node identity.

## Prevention

- Serialize node-count changes; reject a second scaling edit while one is in progress.
- Gate GitOps changes on `CrdbCluster` conditions and CockroachDB membership, not only pod readiness.
- Alert when a node remains `decommissioning` without replica-count movement.
- Preserve headroom for range relocation and validate zone constraints before scale-down.
- Document whether orphaned PVC cleanup is manual or controlled by the alpha `AutoPrunePVC` feature gate.
- Test rollback of a decommission in a production-like environment.
- Migrate from the deprecated public operator to the current CockroachDB Operator using the official migration controller.

## Official Documentation

- [CockroachDB public operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public operator scale sequencing and missing recommission rollback](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/scale.go)
- [Public operator decommission implementation](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/drainer.go)
- [CockroachDB node decommissioning, membership states, and recommissioning](https://www.cockroachlabs.com/docs/stable/node-shutdown?filters=decommission)
- [Public operator PVC pruning feature gates](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/features/operator_features.go)
- [Kubernetes StatefulSet storage behavior](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage)
- [Automatic migration from the public operator to the CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)

## Conclusion

Upscaling a public-operator `CrdbCluster` changes desired pod capacity; it does not undo CockroachDB membership changes already started by decommissioning. If the node is still `decommissioning`, make the desired count coherent and explicitly recommission the exact node ID. If it is already `decommissioned`, finish removal and use fresh storage for the next node. Treating those outcomes as interchangeable is how a harmless count correction becomes a stale-store incident.

# How to Diagnose a CockroachDB Operator Scale-Down Stuck After Node Decommissioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Scale Down, Node Decommissioning, StatefulSet, Troubleshooting

Description: Diagnose a stalled scale-down in the deprecated CockroachDB public operator by separating database decommissioning, pod removal, and PVC cleanup before making a safe recovery decision.

---

A CockroachDB scale-down is not just a Kubernetes replica change. A node must stop accepting work, move its range leases and replicas elsewhere, drain SQL connections, become fully decommissioned, and only then lose its pod. If one of those stages cannot complete, the deprecated CockroachDB public operator deliberately leaves the StatefulSet larger than the requested `spec.nodes` value.

This guide is specifically for the public `cockroach-operator` that manages `crdb.cockroachlabs.com/v1alpha1` `CrdbCluster` resources and StatefulSets. Cockroach Labs now calls that controller the **Public operator** and has deprecated it in favor of the newer `v1beta1` CockroachDB Operator, which manages individual `CrdbNode` resources. Confirm which controller owns the cluster before using any recovery command.

## Confirm the Operator Generation

Set the namespace and cluster name, then inspect the stored API version and workloads:

```bash
export NAMESPACE=cockroach-operator-system
export CLUSTER=cockroachdb

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.apiVersion}{"\n"}'

kubectl get statefulset,crdbnode -n "$NAMESPACE"
```

A `crdb.cockroachlabs.com/v1alpha1` object with a StatefulSet is the public-operator topology described here. A `v1beta1` object with `CrdbNode` resources needs the current operator's runbook instead. Do not infer the generation from the Deployment name alone; migration can temporarily run both controllers.

## Understand the Scale-Down State Machine

For the public operator, lowering `spec.nodes` creates a difference between the requested node count and the StatefulSet replica count. The controller then works from the highest StatefulSet ordinal downward. Its implementation:

1. identifies the CockroachDB node ID belonging to the pod that will be removed;
2. starts decommissioning without waiting for completion;
3. polls decommission status while replicas and leases move away;
4. drains the node and performs the final blocking decommission step;
5. reduces the StatefulSet replica count; and
6. optionally prunes the now-unused PVC if the relevant feature is enabled.

`DECOMMISSIONING` is therefore not the same as `DECOMMISSIONED`. A pod can remain Running and Ready while CockroachDB is still relocating data. A large or constrained node can legitimately take hours. Diagnose progress before treating elapsed time alone as failure.

## Capture State Before Changing Anything

Save the desired count, actual count, conditions, recent events, and pod placement:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" -o yaml \
  > "${CLUSTER}-cr-before-recovery.yaml"

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='requested={.spec.nodes}{"\n"}'

kubectl get statefulset "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='replicas={.spec.replicas} ready={.status.readyReplicas} current={.status.currentReplicas}{"\n"}'

kubectl get pods -n "$NAMESPACE" -o wide
kubectl describe crdbcluster "$CLUSTER" -n "$NAMESPACE"
kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp
```

Do not run `kubectl scale statefulset` to force the requested count. The public operator reconciles that object back to its own state, and deleting the pod first can remove the process that must participate in its own drain and decommission.

## Read the Operator's Evidence

Find the controller Deployment rather than assuming its exact release-specific name:

```bash
kubectl get deployment -n "$NAMESPACE" \
  -l app=cockroach-operator

kubectl logs -n "$NAMESPACE" \
  deployment/cockroach-operator-manager \
  --since=2h --all-containers=true
```

Adjust the Deployment name or label to match the installed manifest. Search the output for messages about `decommission`, `drain`, `replicas decommissioning`, command exit status, TLS, and reconciliation errors. Also check whether the leader pod restarted: an old log stream may explain the original failure while the current pod only shows retries.

Common patterns include:

- the StatefulSet does not have all replicas Ready, so the decommission action waits;
- decommission progress stops because ranges cannot find legal replacement stores;
- the operator cannot execute the CockroachDB CLI inside a pod;
- certificate or service DNS problems prevent the CLI from reaching the cluster;
- the target pod or node is unavailable before decommissioning finishes; or
- another rollout, upgrade, or storage operation is keeping the controller from entering the scale action.

## Inspect CockroachDB Decommission Progress

Use a healthy remaining pod and the same security mode as the cluster. A typical secure public-operator deployment mounts client material at `/cockroach/cockroach-certs`:

```bash
export HEALTHY_POD="${CLUSTER}-0"

kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node status \
  --host="${CLUSTER}-public" \
  --certs-dir=/cockroach/cockroach-certs \
  --decommission
```

For an insecure cluster, replace the certificate option with `--insecure`. Use the actual public Service name and certificate directory from the pod specification; do not paste both modes into the same command.

Record the target node ID and watch its live, membership, replica, and lease values. The command's exact columns vary by CockroachDB release, so use the binary from the cluster and consult the matching-version CLI reference. The important distinction is whether replica and lease counts continue trending toward zero or remain unchanged.

If the target still owns replicas, inspect the cluster rather than forcing pod deletion:

```bash
kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node status \
  --host="${CLUSTER}-public" \
  --certs-dir=/cockroach/cockroach-certs \
  --ranges
```

Use the DB Console's Replication and Nodes views as a second source of evidence. Under-replicated or unavailable ranges, dead stores, and a stalled replication queue point to a database placement problem, not a Kubernetes replica problem.

## Fix the Constraint That Blocks Relocation

Decommissioning needs enough healthy capacity that satisfies every applicable zone configuration. Check these in order:

- all remaining CockroachDB pods are Running, Ready, and mutually reachable;
- Kubernetes nodes have enough CPU, memory, and disk for relocated replicas;
- the target is not the last eligible store for a required region, zone, or attribute;
- zone constraints and voter counts are satisfiable after the requested scale-down;
- no remaining store is almost full or rejecting writes;
- the cluster has no unavailable ranges that require the target store; and
- the operator can still run the CockroachDB binary and authenticate from its chosen pod.

If a placement rule requires capacity that the smaller topology cannot provide, change the topology or rule through a reviewed database operation and wait for replication to recover. Do not lower replication factors merely to make the progress indicator reach zero unless that durability reduction is an explicit, temporary incident decision.

If the target Kubernetes node failed, restore that pod's storage and network access when possible. CockroachDB can decommission an unavailable node, but moving replicas from surviving copies can take longer, and unavailable ranges must be repaired before removal can safely finish.

## Decide Whether to Continue or Abort

Continue the scale-down when replica and lease counts are decreasing and the cluster remains healthy. The safest action may simply be to restore capacity and let the controller retry.

Abort only if the operational decision is to keep that CockroachDB node. A node in `DECOMMISSIONING` can be recommissioned, but a fully `DECOMMISSIONED` node ID cannot be brought back. With a matching-version CLI, the explicit operation is:

```bash
kubectl exec -n "$NAMESPACE" "$HEALTHY_POD" -- \
  /cockroach/cockroach node recommission TARGET_NODE_ID \
  --host="${CLUSTER}-public" \
  --certs-dir=/cockroach/cockroach-certs
```

Recommissioning at the database layer is only half of aborting an operator scale-down. The desired `spec.nodes` value must also describe the topology you intend to keep. Changing it during an active reconciliation can expose public-operator edge cases, so first capture state, verify the exact operator release, and follow its release-specific recovery guidance. Avoid repeatedly toggling the count.

Never remove the `CrdbCluster` finalizer, edit its status, or delete a PVC to unstick decommissioning. Those actions erase controller evidence or storage without completing the database transition.

## Treat PVC Cleanup as a Separate Stage

The public operator's README states that automatic PVC pruning is disabled by default because of a known issue. A completed database decommission and reduced StatefulSet can therefore leave an orphaned PVC intentionally. That is not proof that scale-down is still stuck.

After the pod is gone, map PVCs to ordinals and confirm the node is fully decommissioned before considering deletion:

```bash
kubectl get pvc -n "$NAMESPACE" \
  -l app.kubernetes.io/instance="$CLUSTER" \
  -o wide
```

Labels differ across releases, so fall back to `kubectl get pvc -n "$NAMESPACE" --show-labels`. Back up data according to your recovery policy and verify the StatefulSet's current replicas. Deleting the wrong PVC can make a later pod restart unrecoverable; leaving a decommissioned ordinal's PVC in place can cause a future scale-up to reuse stale identity. Handle that decision in a dedicated PVC-reuse runbook.

## Prevent the Next Stall

- Pin the public operator and CockroachDB image to supported, tested versions.
- Test a scale-down with production-like data volume and placement constraints.
- Alert on under-replicated and unavailable ranges before maintenance.
- Leave disk and replica-placement headroom on the remaining nodes.
- Block simultaneous upgrades, storage changes, and node-count changes.
- Capture operator conditions, events, logs, and `node status --decommission` output in the change record.
- Plan migration to the current CockroachDB Operator rather than building new automation around deprecated `v1alpha1` behavior.

## Official Documentation

- [CockroachDB public operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public operator scale-down implementation](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/scale.go)
- [Public operator decommission progress and drain implementation](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/scale/drainer.go)
- [CockroachDB node shutdown, decommission, recommission, and Kubernetes guidance](https://www.cockroachlabs.com/docs/stable/node-shutdown?filters=decommission)
- [CockroachDB replication alerts for self-hosted clusters](https://www.cockroachlabs.com/docs/stable/essential-alerts-self-hosted)
- [Kubernetes StatefulSet scaling behavior](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#deployment-and-scaling-guarantees)

## Conclusion

A public-operator scale-down is safe only when CockroachDB finishes the database transition before Kubernetes removes the pod. Identify the operator generation, preserve evidence, watch replica and lease movement, and fix capacity or placement constraints at their source. Force-scaling the StatefulSet, deleting the target pod, or pruning its PVC can turn a slow decommission into a recovery incident.

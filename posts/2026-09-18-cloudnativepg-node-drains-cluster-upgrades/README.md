# How to Keep PostgreSQL Operator Pods Available During Node Drains and Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, High Availability, Upgrade

Description: Plan CloudNativePG node maintenance around disruption budgets, replica health, storage mobility, and application reconnection.

PostgreSQL availability during node maintenance depends on more than the number of running Pods. A replacement must be schedulable, its storage must be usable, and a healthy standby must be available for promotion before the current primary is removed. Applications also need to recover from the connection break caused by a switchover.

This guide uses CloudNativePG 1.30. Its [maintenance documentation](https://cloudnative-pg.io/docs/1.30/kubernetes_upgrade/) describes operator-managed PodDisruptionBudgets and coordinated primary switchovers. These reduce planned disruption; they cannot guarantee that every client connection survives.

## Check capacity before touching the node

Start with one database Cluster and one node. Inventory any other databases sharing that node, because their budgets and recovery time also affect the drain.

```bash
kubectl get pods -n database -l cnpg.io/cluster=app-db -o wide
kubectl cnpg status app-db -n database --verbose
kubectl get pdb -n database
kubectl get pvc -n database -l cnpg.io/cluster=app-db
kubectl get nodes -L topology.kubernetes.io/zone
```

Verify a current backup, healthy streaming replicas, and enough disk space. Check whether synchronous replication will still have its required acknowledgements while one instance is absent. A Pod can be running while it is too far behind to be a suitable switchover candidate.

Review CPU and memory requests, affinity, tolerations, and volume topology. If three replicas require three separate hosts and only two eligible hosts remain after cordoning, a replacement may stay Pending. Similarly, a zonal disk cannot necessarily attach in a different zone. Kubernetes describes these constraints in [storage topology and volume binding](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode).

Have the operator and Kubernetes version compatibility checked before the wider upgrade. Updating Kubernetes and changing the PostgreSQL major version in the same maintenance event makes failures harder to isolate.

## Let the disruption budgets protect the database

Leave the operator's budgets enabled:

```yaml
# Fragment of an existing CloudNativePG Cluster.
spec:
  instances: 3
  enablePDB: true
```

CloudNativePG protects the primary and coordinates a switchover when its node is drained. With at least three instances, it also limits graceful replica removal to one at a time. A single-instance database cannot switch to another primary, so its budget blocks the drain.

Read the actual PDB selectors, desired availability, and `disruptionsAllowed` values. Do not assume a fixed budget formula applies to every operator version or instance count. Kubernetes explains that [PodDisruptionBudgets cover voluntary evictions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/), not every node failure or every possible way to delete a Pod.

## Drain one node and observe the transition

First cordon the selected node so new ordinary workloads do not land there. Then run a normal eviction-based drain:

```bash
kubectl cordon worker-3
kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data --timeout=30m
```

The empty-directory option removes transient Pod storage, so inspect all workloads on the node before allowing it. CloudNativePG stores PostgreSQL data on PVCs, but unrelated applications might keep important data in an `emptyDir`.

If the command refuses because it encounters a Pod without a recognized controller, inspect that Pod's owner references and recovery mechanism. Use `--force` only after accounting for those workloads; this flag addresses unmanaged-Pod checks and does not itself bypass PDB eviction protection. Do not use `--disable-eviction` as a way around database availability limits. See the [kubectl drain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/).

In separate terminals, run each command below to follow the Cluster, Pods, and service endpoints:

```bash
kubectl get cluster app-db -n database -w
kubectl get pods -n database -l cnpg.io/cluster=app-db -w
kubectl get endpointslices -n database \
  -l kubernetes.io/service-name=app-db-rw -w
```

A blocked drain is useful evidence. Check a failed switchover, unhealthy standby, unavailable volume, or unschedulable replacement before changing the budget. Setting `enablePDB: false` merely removes the protection; it does not create another working database instance.

## Account for local storage

Network-attached volumes can sometimes move with a Pod. A local PV is tied to a node, so its Pod may need to wait for that node to return or be replaced using a fresh replica copy on different storage.

CloudNativePG retains `nodeMaintenanceWindow` for backward compatibility, but recommends direct PDB control for current workflows. Enabling the legacy maintenance mode can change self-healing and volume-reuse behavior. Use it only after rehearsing the exact local-storage scenario, with a clear end condition and an explicit decision about temporary loss of redundancy.

For a production single-instance database, plan a real outage or first add and validate a replica on independent storage. Disabling its budget cannot make its only copy continuously available.

## Validate before the next drain

After node maintenance, uncordon the node:

```bash
kubectl uncordon worker-3
kubectl wait -n database --for=condition=Ready \
  cluster/app-db --timeout=30m
```

Then verify streaming state, available disk, and continuous archiving. Perform an application-level write and read through the normal read-write service. Confirm connection pools have established fresh connections and that retries did not duplicate a business operation.

Only begin the next node when redundancy has recovered. Record the duration of the switchover, client errors, replica rejoin, and any capacity bottleneck. Those measurements turn a successful maintenance window into a repeatable procedure for the next Kubernetes upgrade.

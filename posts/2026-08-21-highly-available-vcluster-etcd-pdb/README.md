# How to Run an HA vCluster Control Plane with etcd and PDBs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, High Availability, etcd, PodDisruptionBudget

Description: Deploy three vCluster control-plane replicas and a three-member etcd quorum, spread them across nodes, and protect voluntary disruptions.

---

A production vCluster needs availability at two layers: multiple control-plane replicas and a backing store that remains available when one member fails. Three vCluster replicas backed by three etcd members tolerate one component failure at each layer when the replicas in each layer are distributed across distinct failure domains and the storage has equivalent durability.

This guide targets vCluster **0.36** with the control plane running as Kubernetes Pods. HA and deployed or embedded etcd availability can depend on the vCluster edition; check the current feature matrix. HA protects against a Pod or eligible node failure, not a complete outage of the control plane cluster.

## Understand the Quorum

With three etcd members, quorum is two. Losing two members makes the backing store unavailable. Three vCluster control-plane Pods provide multiple serving instances, while leader-elected controller work can move to another replica when its leader fails.

PodDisruptionBudgets protect against **voluntary** evictions such as a node drain. They do not prevent hardware failure, node loss, OOM termination, or an administrator deleting a Pod directly. They also cannot create spare capacity, so schedule replicas across real failure domains first.

## Configure Three Control-Plane and etcd Replicas

Create `vcluster.yaml`:

```yaml
controlPlane:
  backingStore:
    etcd:
      deploy:
        enabled: true
        statefulSet:
          highAvailability:
            replicas: 3
          persistence:
            volumeClaim:
              enabled: true
              retentionPolicy: Retain
              size: 10Gi
          scheduling:
            topologySpreadConstraints:
              - maxSkew: 1
                minDomains: 3
                topologyKey: kubernetes.io/hostname
                whenUnsatisfiable: DoNotSchedule
                labelSelector:
                  matchLabels:
                    app: vcluster-etcd
                    release: team-a
  statefulSet:
    highAvailability:
      replicas: 3
    scheduling:
      topologySpreadConstraints:
        - maxSkew: 1
          minDomains: 3
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: vcluster
              release: team-a
  advanced:
    podDisruptionBudget:
      enabled: true
      minAvailable: 2
```

The `release` label equals the Helm/vCluster release name in this example. If your release is not `team-a`, change both selectors. The built-in `controlPlane.advanced.podDisruptionBudget` selects the vCluster control-plane Pods; it does not create a second PDB for the deployed etcd StatefulSet.

For tolerance of any single zone failure, add a second hard topology constraint for `topology.kubernetes.io/zone` with `minDomains: 3`. Use a topology-aware StorageClass with `volumeBindingMode: WaitForFirstConsumer`, or suitable pre-provisioned volumes, so each PVC binds in its Pod's zone. The hard `DoNotSchedule` constraints leave Pods Pending when the cluster lacks three eligible domains. During maintenance, replacements also need a spare schedulable node that satisfies all topology and volume constraints.

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --connect=false \
  --values vcluster.yaml
```

Backing-store choice has restricted post-deployment migration paths. The chart-deployed etcd configuration shown here is not an in-place upgrade target for an existing SQLite tenant. Deploy a new HA tenant with the selected store, or follow only a migration path explicitly supported for your current and target stores; do not add `etcd.deploy.enabled` to production and assume an ordinary upgrade is sufficient.

## Add a PDB for Deployed etcd

First inspect rendered labels:

```bash
kubectl get pod -n team-a-vcluster \
  -l app=vcluster-etcd --show-labels
```

For the v0.36 chart labels shown above, create:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: team-a-etcd
  namespace: team-a-vcluster
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: vcluster-etcd
      release: team-a
```

```bash
kubectl apply -f etcd-pdb.yaml
kubectl get poddisruptionbudget -n team-a-vcluster
```

Manage this host-side PDB in the same platform release process as `vcluster.yaml`. Recheck the selector after chart upgrades because a PDB with a zero-Pod selector match provides no protection.

Do not confuse this with `sync.toHost.podDisruptionBudgets.enabled`, which synchronizes tenant application PDBs. That option does not protect the vCluster control plane or deployed etcd.

## Verify Placement, Storage, and Health

```bash
kubectl get pod -n team-a-vcluster \
  -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,READY:.status.containerStatuses[*].ready'
kubectl get deployment,statefulset -n team-a-vcluster
kubectl get pvc -n team-a-vcluster
kubectl get pdb -n team-a-vcluster
```

All etcd PVCs should be Bound and use a production StorageClass with suitable durability. A PDB cannot help if all three volumes depend on one failed storage appliance or zone.

Because `--connect=false` does not write `/tmp/team-a.kubeconfig`, create it explicitly. Set `TEAM_A_ENDPOINT` to a stable Service or exposed endpoint that is reachable from the client and included in the vCluster serving certificate, then verify the tenant API repeatedly through that endpoint:

```bash
TEAM_A_ENDPOINT=https://team-a.example.com
vcluster connect team-a \
  --namespace team-a-vcluster \
  --server="$TEAM_A_ENDPOINT" \
  --print > /tmp/team-a.kubeconfig

for i in 1 2 3; do
  kubectl --kubeconfig /tmp/team-a.kubeconfig get --raw=/readyz
done
```

Review control-plane logs for stable leader election and etcd errors. Avoid changing `leaseDuration`, `renewDeadline`, or `retryPeriod` unless measurements and the official configuration semantics justify it.

## Test a Voluntary Disruption

Choose one node containing a vCluster or etcd Pod and run a controlled drain in a non-production rehearsal first:

```bash
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data
```

Expected behavior:

- At most one control-plane Pod and one etcd member become unavailable.
- Both PDBs retain at least two matching available Pods.
- Replacement Pods schedule only when a spare eligible node has capacity; the etcd replacement also needs a node compatible with its PVC's volume topology.
- The tenant API remains available through the Service; leader-elected controller work may pause briefly while leadership changes.
- A second simultaneous eviction is blocked while it would violate a PDB.

Uncordon after the test:

```bash
kubectl uncordon <node-name>
```

Also test an involuntary Pod failure, backup and restore, and complete control plane cluster outage assumptions separately. HA is not disaster recovery.

## Capacity and Maintenance Rules

- Keep capacity on a spare eligible node, including a node compatible with each PVC's volume topology.
- Drain one failure domain at a time and wait for etcd membership and Pods to recover.
- Use an odd etcd member count; adding a fourth does not increase tolerated failures.
- Take regular vCluster snapshots, and protect workload volumes separately.
- Alert on etcd quorum, leader changes, fsync latency, disk space, Pod availability, and PDB-blocked drains.
- Ensure node autoscalers and disruption tools respect PDBs; forced termination settings can bypass them.

## Official Documentation

- [vCluster: Deploy in high availability](https://www.vcluster.com/docs/vcluster/deploy/control-plane/kubernetes-pod/high-availability)
- [vCluster: StatefulSet high-availability settings](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/deployment/statefulset)
- [vCluster: Control-plane PodDisruptionBudget configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/other/advanced/)
- [vCluster: Restore and backing-store migration restrictions](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Embedded etcd backing-store configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/backing-store/etcd/embedded)
- [vCluster: Control plane outage behavior](https://www.vcluster.com/docs/vcluster/understand/control-plane-outages)
- [Kubernetes: PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Conclusion

Run three control-plane replicas with a three-member etcd quorum, spread each across real failure domains, and protect voluntary eviction with separate control-plane and etcd PDBs. Then prove the design with a one-node drain. Replica counts without placement, durable storage, spare capacity, and tested recovery are only the appearance of HA.

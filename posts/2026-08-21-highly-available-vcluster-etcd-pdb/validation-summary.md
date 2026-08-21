# Validation Summary: How to Run an HA vCluster Control Plane with etcd and PDBs

## Status

validated

## Post Type

Technical deployment guide / high-availability Kubernetes tutorial

## Technologies Covered

- vCluster 0.36 with a containerized Kubernetes control plane
- vCluster Helm chart configuration and CLI
- Kubernetes Deployments, StatefulSets, Services, and persistent volumes
- Three-member etcd quorum and backing-store availability
- Kubernetes Pod topology spread constraints and failure domains
- Kubernetes PodDisruptionBudgets and the Eviction API
- `kubectl drain`, node maintenance, and disruption testing

## Sources Consulted

- [vCluster 0.36: Deploy in high availability](https://www.vcluster.com/docs/vcluster/deploy/control-plane/kubernetes-pod/high-availability)
- [vCluster 0.36: Deployed/external etcd configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/backing-store/etcd/deploy) and [embedded etcd configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/backing-store/etcd/embedded)
- [vCluster 0.36: Control-plane StatefulSet and high-availability settings](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/deployment/statefulset)
- [vCluster 0.36: Control-plane PodDisruptionBudget settings](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/other/advanced/) and [tenant PDB synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/pod-disruption-budgets)
- [vCluster 0.36 CLI: `vcluster create`](https://www.vcluster.com/docs/vcluster/cli/vcluster_create), [`vcluster connect`](https://www.vcluster.com/docs/vcluster/cli/vcluster_connect), and [access/exposure guidance](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster: Restore snapshots and backing-store migration restrictions](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Control plane outage behavior](https://www.vcluster.com/docs/vcluster/understand/control-plane-outages)
- [vCluster v0.36.1 chart values schema](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.schema.json), [control-plane workload template](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/statefulset.yaml), [persistence/kind selection](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/_persistence.tpl), [deployed-etcd StatefulSet template](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/etcd-statefulset.yaml), and [built-in PDB template](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/pod-disruption-budget.yaml)
- [Kubernetes: Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes: StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode) and [StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/), [`kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/), and [safe node draining](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [etcd v3.6 FAQ](https://etcd.io/docs/v3.6/faq/) and [failure modes](https://etcd.io/docs/v3.6/op-guide/failures/)

## Issues Found

- Both hostname topology-spread constraints omitted `minDomains`. With `DoNotSchedule`, `maxSkew: 1`, and the default effective `minDomains: 1`, Kubernetes can place three replicas 2/1 across two domains or place them all in one domain; the original configuration therefore did not guarantee distinct nodes or make the final Pod remain Pending when fewer than three domains existed. Added `minDomains: 3` to both constraints and required the same setting for the optional zone constraint.
- The zone guidance did not account for volume binding topology. With the default `Immediate` binding mode, a topology-constrained volume can be provisioned before the scheduler knows the Pod's zone and can make the Pod unschedulable. The post now requires a topology-aware StorageClass using `WaitForFirstConsumer`, or suitable pre-provisioned volumes, and explicitly requires three eligible zones for tolerance of any single-zone failure.
- The maintenance expectations implied that replacement and volume attachment were automatic whenever a PDB permitted a drain. A hard hostname constraint needs a spare eligible node, and a StatefulSet replacement reuses its PVC, so a zonal volume also needs a node compatible with that volume's topology. The drain expectation and capacity rule are now conditional on compatible spare capacity.
- The readiness loop referenced `/tmp/team-a.kubeconfig`, but `vcluster create --connect=false` does not create that file. Added an explicit `vcluster connect --server ... --print` command and documented that the selected stable Service or exposed endpoint must be reachable and included in the serving certificate.
- With deployed etcd and the default control-plane persistence setting of `auto`, vCluster 0.36 renders the control plane as a `Deployment` and etcd as a `StatefulSet`. Changed the verification command from `kubectl get statefulset` to `kubectl get deployment,statefulset` so it displays both workloads.
- Tightened two availability statements: the opening now describes replica distribution and storage durability directly, and forced termination is described as bypassing a PDB rather than overriding it.

## Review Notes

- The corrected `vcluster.yaml` was rendered successfully with the official vCluster v0.36.1 chart and Kubernetes 1.35 capabilities. It produces three control-plane replicas, three deployed-etcd replicas, both corrected `minDomains: 3` constraints, and the built-in control-plane PDB with `minAvailable: 2`.
- The v0.36.1 templates confirm the exact Pod selectors used in the post: `app: vcluster, release: team-a` for the control plane and `app: vcluster-etcd, release: team-a` for deployed etcd. They also confirm that the built-in PDB covers only the control plane, so the separate host-side etcd PDB is necessary.
- The etcd quorum calculation, recommendation for an odd member count, `policy/v1` PDB manifest, direct-deletion caveat, drain flags, uncordon command, backing-store migration warning, and control-plane-outage limitation are technically correct.
- Three requests through a Service do not prove that every backend replica was reached. The post's separate Pod readiness and placement checks remain necessary; an EndpointSlice check can provide additional confirmation in a production runbook.
- The cited canonical vCluster URLs currently serve the v0.36 stable documentation and all reviewed links resolve. Those URLs are not immutable version pins, and the create command assumes a matching v0.36 CLI; operators using a later CLI should pin the desired v0.36 patch with `--chart-version` for exact reproducibility.

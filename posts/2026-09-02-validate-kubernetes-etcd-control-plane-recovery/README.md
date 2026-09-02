# How to Validate Kubernetes Recovery by Restoring etcd and Rebuilding the Control Plane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Disaster Recovery, Backup, Testing

Description: Restore etcd safely, rebuild a compatible Kubernetes control plane, and validate cluster state plus workload data end to end.

---

etcd is Kubernetes' backing store for API objects. Restoring it is central to control-plane recovery, but it does not restore container images, node disks, PersistentVolume contents, external secret stores, cloud load balancers, or databases outside the cluster. A Kubernetes recovery test must validate both API state and those external resources.

This guide applies to self-managed control planes. For a managed Kubernetes service, follow the provider's documented backup and recovery mechanism; direct etcd access may be unavailable or unsupported.

## Record the Recovery Compatibility Envelope

Before a disaster, capture:

- Kubernetes, etcd, kubeadm, kubelet, and container-runtime versions;
- stacked versus external etcd topology;
- etcd member names, peer/client URLs, cluster token, and certificates;
- API server endpoint, advertised address, and certificate SANs;
- control-plane static Pod manifests or service definitions;
- encryption-at-rest configuration and key material;
- admission webhooks, APIService objects, CRDs, CNI, CSI, DNS, and cloud-controller versions;
- backup creation time, etcd revision, hash, size, and source cluster ID;
- separate protection for PersistentVolumes and external data.

Kubernetes documentation states that an etcd snapshot contains all Kubernetes state and critical information and should be encrypted. That sensitivity includes Secret objects.

## Prove the Snapshot Before the Exercise

Create snapshots with authenticated etcdctl access according to the deployed topology:

~~~bash
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  snapshot save snapshot.db

etcdutl --write-out=table snapshot status snapshot.db
~~~

These tool roles match etcd 3.6 and later, including the current 3.7 documentation: use `etcdctl` for the online snapshot and `etcdutl` for offline status and restore operations. Use version-matched tools and documentation for the deployed cluster, and certificate paths appropriate to that cluster; do not copy this example blindly. Protect command history, file permissions, snapshot transport, and evidence.

The status command verifies snapshot metadata and reports hash, revision, key count, and size. It does not prove Kubernetes can serve applications from the restored state. Keep automated clean restore tests.

## Restore as a New Logical etcd Cluster

etcd's disaster-recovery documentation explains that snapshot restore creates new data directories and rewrites member and cluster identity, producing a new logical cluster. All restored members should use the same snapshot and a deliberate new membership configuration.

Safety sequence:

1. Isolate the recovery network from production.
2. Stop every API server that can reach the etcd instances being restored.
3. Preserve original data directories and manifests as evidence; select a new empty data directory.
4. Verify snapshot metadata and approved recovery point.
5. Restore each intended member with the exact new name, peer URL, cluster membership, token, and data directory.
6. Start etcd and verify member agreement and health before starting API servers.

For a single-member isolated test:

~~~bash
etcdutl snapshot restore snapshot.db \
  --data-dir=/var/lib/etcd-restored
~~~

A production high-availability restore requires explicit membership arguments matching the intended topology; use the etcd version's official recovery procedure.

### Handle revision rollback for Kubernetes

Restoring an older snapshot makes the etcd revision go backward relative to clients' cached observations. etcd specifically recommends a revision bump plus marking revisions compacted for Kubernetes so watches terminate and informer caches are invalidated:

~~~bash
etcdutl snapshot restore snapshot.db \
  --bump-revision=CALCULATED_SAFE_BUMP \
  --mark-compacted \
  --data-dir=/var/lib/etcd-restored
~~~

Choose the bump from measured write rate and maximum snapshot age according to the current etcd documentation; do not copy a universal number. Restart Kubernetes components as the Kubernetes etcd operations guide recommends so they do not rely on stale data.

## Rebuild the Control Plane

Recreate hosts, networking, runtime, binaries, certificates, kubeconfigs, and static Pod manifests from pinned, reviewed configuration. For kubeadm-managed clusters, use supported kubeadm phases or the organization's tested reconstruction procedure; do not run an unreviewed fresh kubeadm init over restored state.

Verify before startup:

- etcd client endpoints and CA/client credentials in the API server manifest;
- API server encryption provider and all keys needed to decrypt stored resources;
- service and Pod CIDRs;
- cluster DNS domain;
- admission plugin and audit configuration;
- API server certificate SANs for the recovered endpoint;
- front-proxy and service-account signing keys;
- controller-manager and scheduler kubeconfigs;
- cloud-provider credentials and node authorization.

If access URLs change, Kubernetes documentation requires reconfiguring API servers for the new etcd endpoints.

Start components in this order:

1. etcd quorum;
2. API server instances;
3. controller manager and scheduler;
4. cloud controller where used;
5. kubelets and core add-ons;
6. workload controllers.

## Validate etcd and API Health

From an authorized recovery host:

~~~bash
ETCDCTL_API=3 etcdctl \
  --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA" --cert="$ETCD_CERT" --key="$ETCD_KEY" \
  endpoint status --cluster --write-out=table

ETCDCTL_API=3 etcdctl \
  --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA" --cert="$ETCD_CERT" --key="$ETCD_KEY" \
  endpoint health --cluster

kubectl get --raw='/readyz?verbose'
kubectl get --raw='/livez?verbose'
~~~

Use linearizable etcd reads for current consensus-sensitive validation where the tool supports them. A member-local serializable read can legally be stale according to etcd documentation.

Confirm:

- expected members share cluster identity and have no unexpected member;
- leader election is stable and applied indexes converge;
- API readiness checks pass;
- controller-manager and scheduler leader election stabilizes;
- no old API server or control-plane member remains reachable.

## Validate Kubernetes Objects and External State

Compare an approved inventory:

~~~bash
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get crd
kubectl get apiservice
kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations
kubectl get storageclass,persistentvolume
kubectl get ingressclass
~~~

Then test semantics:

- Nodes become Ready with expected identities and taints.
- CoreDNS resolves Service and approved external names.
- CNI provides Pod-to-Pod and network-policy behavior.
- CSI can attach restored or separately recovered storage.
- Service routing and ingress work from a client path.
- admission webhooks respond without deadlocking workload creation;
- Secrets decrypt and mount under least privilege;
- controllers reconcile a new run-tagged object;
- a disposable Deployment schedules, becomes ready, and is removed;
- critical applications complete synthetic transactions and data reconciliation.

An etcd object for a PersistentVolume is metadata, not the volume's bytes. Validate the underlying volume and application-consistent recovery point separately.

## Failure and Rollback Rules

Stop when snapshot identity is ambiguous, decryption keys are missing, version compatibility is unproven, multiple clusters can write the same external state, or integrity checks fail. Keep the environment isolated and read-only while investigating.

Never point production API servers at a partially restored etcd cluster. Kubernetes explicitly cautions that API servers should be stopped before restoring etcd instances.

## Acceptance Criteria

Kubernetes recovery passes when:

- snapshot hash, revision, source, age, and encryption handling are evidenced;
- restore uses supported etcd/Kubernetes versions and a new deliberate membership;
- revision rollback is handled according to current etcd guidance;
- old API servers and writers cannot reach restored etcd or shared state;
- etcd quorum and API health checks pass;
- certificates, encryption keys, admission, DNS, CNI, CSI, and cloud integration work;
- expected cluster objects and separately protected volume data reconcile;
- a disposable workload and critical business transaction succeed;
- measured RTO and RPO meet their contracts;
- raw evidence and cleanup are complete.

Restoring etcd recovers the control plane's memory. End-to-end validation proves that the recovered cluster can safely operate the workload.

## Official References

- [Kubernetes: Operating etcd clusters](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [etcd v3.7: Disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [Kubernetes: kubeadm init phases and control-plane certificates](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/)
- [Kubernetes: API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [etcd v3.7: API and linearizable reads](https://etcd.io/docs/v3.7/learning/api/)

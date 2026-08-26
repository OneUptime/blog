# How to Fix `Permission Denied` on `/cockroach/cockroach-data` in Operator-Managed Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Persistent Volumes, SecurityContext, Troubleshooting

Description: Diagnose and repair data-volume ownership for GA v1beta1 CockroachDB Operator pods without deleting PVCs, using unsafe permissions, or mixing deprecated operator fields.

---

A CockroachDB pod that reports `permission denied` for `/cockroach/cockroach-data` is failing at the filesystem boundary. The problem is normally not SQL permissions. The process identity emitted by the Operator cannot create or modify files on the mounted PersistentVolumeClaim (PVC), or a parent directory prevents traversal.

Treat the PVC as database media. Do not delete and recreate it, run `chmod -R 777`, or repeatedly restart every node. First establish the runtime UID/GID, the PVC involved, and which layer is responsible for setting ownership.

This guide uses the GA `crdb.cockroachlabs.com/v1beta1` API. Current pod settings belong under `spec.template.spec.podTemplate`. The deprecated public operator's `spec.securityContext` and related `v1alpha1` examples are not interchangeable with this API.

## Identify the Exact Failure

Find the affected `CrdbNode`, pod, and claim:

```bash
export NAMESPACE=cockroachdb
export CLUSTER=cockroachdb
export POD=cockroachdb-0

kubectl get crdbcluster,crdbnode,pod,pvc -n "$NAMESPACE"
kubectl describe pod "$POD" -n "$NAMESPACE"
kubectl logs "$POD" -n "$NAMESPACE" -c cockroachdb --previous

kubectl get pod "$POD" -n "$NAMESPACE" -o json |
  jq -r '.spec.volumes[] | select(.persistentVolumeClaim) |
    [.name, .persistentVolumeClaim.claimName] | @tsv'
```

Use `--previous` only when the container actually restarted. If it never started, inspect init-container logs and pod events:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{" state="}{.state}{" last="}{.lastState}{"\n"}{end}'

kubectl logs "$POD" -n "$NAMESPACE" -c cockroachdb-init
```

Copy the real init-container names from the pod. An admission rejection, `FailedMount`, `MountVolume.SetUp failed`, read-only mount, and a CockroachDB process-level `permission denied` have different causes.

If the main container runs long enough, record its effective identity and directory metadata without changing anything:

```bash
kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- id
kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- \
  sh -ec 'for path in / /cockroach /cockroach/cockroach-data; do
    stat -c "path=%n uid=%u gid=%g mode=%a type=%F" "$path"
  done'
```

Do not attach the same `ReadWriteOnce` claim to a second pod while the database pod is using it. That can fail scheduling, create a multi-attach error, or violate the storage driver's safety model.

## Inspect Desired and Generated Security Contexts

The `CrdbCluster` template is only the desired input. Compare it with the generated `CrdbNode` and pod:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.spec.template.spec.podTemplate.spec.securityContext}{"\n"}'

kubectl get crdbnode "$POD" -n "$NAMESPACE" \
  -o jsonpath='{.spec.podTemplate.spec.securityContext}{"\n"}'

kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{.spec.securityContext}{"\n"}{range .spec.containers[*]}{.name}{" "}{.securityContext}{"\n"}{end}'
```

Also inspect the PVC's StorageClass and access mode:

```bash
export PVC=REPLACE_WITH_CLAIM_NAME
export STORAGE_CLASS=$(kubectl get pvc "$PVC" -n "$NAMESPACE" \
  -o jsonpath='{.spec.storageClassName}')

kubectl get pvc "$PVC" -n "$NAMESPACE" -o yaml
kubectl get storageclass "$STORAGE_CLASS" -o yaml
kubectl describe pvc "$PVC" -n "$NAMESPACE"
```

Common causes include:

- a reused volume whose contents belong to an earlier UID/GID;
- a CSI driver that does not implement `fsGroup` ownership or mount-group support;
- an NFS export with `root_squash`, server-side ownership, or restrictive directory modes;
- a pre-provisioned PV whose root is not group-writable;
- a custom pod template that changed `runAsUser`, `runAsGroup`, or `fsGroup` independently;
- `fsGroupChangePolicy: OnRootMismatch` seeing an acceptable root directory while deeper files remain inaccessible; or
- a volume mounted read-only through the PV, PVC, or generated pod.

## Prefer `fsGroup` for a Fresh, Compatible CSI Volume

For the current Operator images, UID/GID 1000 is the conventional non-root identity used by the injected init and certificate-reloader images and by the chart's certificate Jobs. Confirm the live generated pod before standardizing it. Custom images may use another identity.

The GA `v1beta1` shape is:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  template:
    spec:
      podTemplate:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: 1000
            fsGroupChangePolicy: OnRootMismatch
            seccompProfile:
              type: RuntimeDefault
          containers:
            - name: cockroachdb
              securityContext:
                runAsNonRoot: true
                allowPrivilegeEscalation: false
                capabilities:
                  drop:
                    - ALL
```

This is a mergeable fragment, not a complete cluster: retain the existing image, regions, data store, certificates, ports, resources, and other pod-template containers. Helm-managed clusters should make the equivalent change in `cockroachdb.crdbCluster.podTemplate` values and run a reviewed Helm upgrade. Do not use `kubectl apply` to take ownership of a Helm-managed field casually; Helm 4 server-side apply can later report an ownership conflict.

When a volume supports Kubernetes ownership management, `fsGroup` makes it accessible to the supplemental group. `OnRootMismatch` avoids an expensive recursive scan after the root already has the expected ownership. For a one-time repair of a known inconsistent tree, `Always` may be required, but test its startup time on a restored copy first. Large volumes can spend a long time changing metadata.

With a CSI driver that advertises `VOLUME_MOUNT_GROUP`, the CSI driver, not kubelet, applies the group at mount time. In that case `fsGroupChangePolicy` has no effect. The driver and storage backend must implement the requested semantics.

## Understand `dropChownContainer`

The GA CRD retains `spec.template.spec.dropChownContainer`. When false, the Operator may include an init container that changes ownership. That can repair conventional block volumes, but it is incompatible with Kubernetes Restricted Pod Security because ownership changes normally require root. It also cannot overcome an NFS server that maps root to an anonymous identity.

For a Restricted namespace, use:

```yaml
spec:
  template:
    spec:
      dropChownContainer: true
```

Only enable this after proving that `fsGroup` or storage-side provisioning makes the PVC writable. Dropping the chown helper before ownership is correct converts a policy failure into an application failure. Conversely, adding a custom privileged init container is not a durable fix; it weakens admission policy and can recursively rewrite live database files.

## Repair Existing Media Through the Storage Layer

If a restored, imported, NFS, or statically provisioned volume ignores `fsGroup`, pause and follow the storage vendor's documented repair procedure. The safe sequence is:

1. Confirm a recent, restorable CockroachDB backup and record the PV, PVC, volume handle, reclaim policy, and node ID.
2. Verify the other CockroachDB nodes are live and ranges are not unavailable or under-replicated.
3. Work on one affected node and one volume at a time.
4. Stop only that database process through the Operator's normal rollout workflow.
5. Have the storage administrator set the volume root and existing tree to the intended UID/GID and restrictive group-write modes, or correct the NFS export identity mapping.
6. Remount the original claim, verify identity and a small write, then allow the node to rejoin and fully replicate before touching another node.

The exact storage-side command is deliberately not universal. A POSIX block filesystem, EFS, Filestore, CephFS, and an enterprise NFS appliance have different identity and snapshot rules. Running a generic recursive `chown` while CockroachDB is active can race with writes and produce a partial repair.

Do not delete a PVC to get an empty, correctly owned volume. The GA API's `persistentVolumeClaimRetentionPolicy` can default to deletion when a `CrdbNode` is deleted, so seemingly harmless object recreation can also remove storage. A database backup is the recovery boundary; Kubernetes replication of the volume is not a substitute for a tested logical or physical restore plan.

## Roll Out and Validate One Node at a Time

Watch reconciliation and reject a mass restart:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{.metadata.generation}{" observed="}{.status.observedGeneration}{" reconciled="}{.status.reconciled}{"\n"}'

kubectl get crdbnodes,pods,pvc -n "$NAMESPACE" --watch
```

After each node becomes ready:

```bash
kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- id
kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- \
  sh -c 'test -r /cockroach/cockroach-data && test -w /cockroach/cockroach-data'

kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- \
  /cockroach/cockroach node status --ranges --format=table \
  --port=26257 --certs-dir=/cockroach/cockroach-certs
```

For an insecure test cluster, replace the certificate flag with `--insecure`. Continue only when the node is live and unavailable ranges are zero. The under-replicated count may take time to settle after a restart.

## Official Documentation

- [GA v1beta1 CrdbNode API, including `dataStore`, `podTemplate`, and `dropChownContainer`](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator API reference and legacy-field migration table](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [GA v1beta1 pod-template example](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [CockroachDB Operator under-replicated ranges safety check](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#under-replicated-ranges-check)
- [Kubernetes security contexts and `fsGroup`](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes persistent volumes and access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes CSI volume ownership delegation](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#delegating-volume-permission-and-ownership-change-to-csi-driver)

## Conclusion

`/cockroach/cockroach-data: permission denied` is an identity-and-storage mismatch. Record the live UID/GID, generated pod context, exact PVC, StorageClass, and driver behavior before changing anything. Prefer a consistent non-root pod identity plus supported `fsGroup` semantics. For existing media that the kubelet cannot repair, use a storage-specific, one-node-at-a-time maintenance procedure. Never turn a permissions incident into data loss by recreating PVCs or applying world-writable modes.

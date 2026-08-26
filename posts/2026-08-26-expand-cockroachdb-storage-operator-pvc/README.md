# How to Expand CockroachDB Storage When the Operator Does Not Resize the PVC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, PVC, Storage Expansion, CSI, Troubleshooting

Description: Trace a stalled GA v1beta1 CockroachDB storage expansion from Helm or CrdbCluster desired state through CrdbNodes, PVCs, CSI, and filesystem growth without destructive volume recreation.

---

Increasing the storage request in a CockroachDB values file does not prove that a disk expanded. The change must pass through several controllers:

```text
Helm or GitOps -> CrdbCluster -> CrdbNode -> PVC -> CSI controller -> volume -> filesystem
```

A stall at any stage can look like "the Operator did nothing." Diagnose the first object whose desired or observed size is still old. Never use PVC deletion and recreation as a generic resize procedure. The replacement claim can bind to empty storage, and the GA Operator's PVC retention policy may delete a claim when its `CrdbNode` is deleted.

This guide targets `crdb.cockroachlabs.com/v1beta1` and the GA CockroachDB Operator. The deprecated public operator used a different cluster shape. Do not put a current storage request under legacy `spec.dataStore`; in `v1beta1`, the cluster template path is `spec.template.spec.dataStore`.

## Record State and Protect the Recovery Boundary

Before changing capacity, confirm a recent CockroachDB backup can be restored and capture every relevant object:

```bash
export NAMESPACE=cockroachdb
export CLUSTER=cockroachdb
export NEW_SIZE=200Gi

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" -o yaml > crdbcluster-before.yaml
kubectl get crdbnode -n "$NAMESPACE" -o yaml > crdbnodes-before.yaml
kubectl get pvc -n "$NAMESPACE" -o yaml > pvcs-before.yaml
kubectl get pv -o yaml > pvs-before.yaml

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" changed="}{.lastTransitionTime}{"\n"}{end}'
```

These YAML captures are configuration evidence, not backups of database contents. GA `CrdbCluster` conditions expose type, status, and transition time; use namespace events and Operator logs for detailed failure messages. Record the volume handles, reclaim policies, StorageClasses, current PVC request and capacity, and the CockroachDB node using each claim.

Resolve claims from the actual pods rather than assuming a naming convention:

```bash
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=cockroachdb -o json |
  jq -r '.items[] as $pod |
    $pod.spec.volumes[]? |
    select(.persistentVolumeClaim) |
    [$pod.metadata.name, .name, .persistentVolumeClaim.claimName] | @tsv'
```

Adjust the label selector to the labels emitted by your release. The GA Helm chart adds `app.kubernetes.io/name`, `app.kubernetes.io/instance`, and the configured pod-template labels.

## Verify That the StorageClass Can Grow

Kubernetes permits PVC expansion only when the StorageClass has `allowVolumeExpansion: true` and the underlying driver supports expansion:

```bash
export PVC=REPLACE_WITH_ONE_DATA_CLAIM
export STORAGE_CLASS=$(kubectl get pvc "$PVC" -n "$NAMESPACE" \
  -o jsonpath='{.spec.storageClassName}')

kubectl get storageclass "$STORAGE_CLASS" \
  -o jsonpath='class={.metadata.name}{" allowVolumeExpansion="}{.allowVolumeExpansion}{" provisioner="}{.provisioner}{" bindingMode="}{.volumeBindingMode}{"\n"}'

kubectl get pvc "$PVC" -n "$NAMESPACE" \
  -o jsonpath='request={.spec.resources.requests.storage}{" capacity="}{.status.capacity.storage}{" conditions="}{.status.conditions}{"\n"}'
```

An empty or false `allowVolumeExpansion` is a platform limitation for that claim. Editing the StorageClass later does not guarantee that an existing in-tree or CSI volume becomes expandable; confirm support with the driver and cloud-storage documentation. Changing `storageClassName` on a bound PVC is not a resize and is generally immutable.

Kubernetes supports growth, not ordinary shrink. Do not request a smaller value after a successful expansion. On Kubernetes 1.34 and later, a failed oversized request can sometimes be corrected to a smaller request that remains above the volume's actual capacity, but that recovery feature does not shrink storage.

## Check the Desired Size at Every Operator Layer

Read the `CrdbCluster` template first:

```bash
kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='generation={.metadata.generation}{" observed="}{.status.observedGeneration}{" mode="}{.spec.mode}{" size="}{.spec.template.spec.dataStore.volumeClaimTemplate.spec.resources.requests.storage}{"\n"}'
```

The default mode is `MutableOnly`. `CreateOnly` does not reconcile changes into existing `CrdbNode` objects, and `Disabled` stops node reconciliation. Do not switch modes casually during another operation; first understand why the cluster was configured that way.

Then compare every node:

```bash
kubectl get crdbnodes -n "$NAMESPACE" \
  -l "crdb.cockroachlabs.com/cluster=${CLUSTER}" \
  -o json |
  jq -r '.items[] |
    [.metadata.name,
     .spec.dataStore.volumeClaimTemplate.spec.resources.requests.storage,
     .status.observedGeneration] | @tsv'
```

If your installation uses different labels, list all `CrdbNode` objects and filter by owner references or the live cluster label. The first mismatch tells you where to focus:

- old size in `CrdbCluster`: the Helm/GitOps update never reached the custom resource;
- new cluster size but old `CrdbNode` size: reconciliation is paused, blocked, stale, or using a non-mutable mode;
- new `CrdbNode` size but old PVC request: investigate Operator logs, ownership conflicts, and installed Operator version;
- new PVC request but old PVC capacity: investigate CSI events, quota, provider limits, and attachment state;
- new PVC capacity but old filesystem size: investigate node-side filesystem expansion.

## Change the Declarative Source First

For the GA CockroachDB subchart, the values path is:

```yaml
cockroachdb:
  crdbCluster:
    dataStore:
      volumeClaimTemplate:
        metadata: {}
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 200Gi
          volumeMode: Filesystem
          storageClassName: fast-expandable
```

Run `helm template` and inspect the resulting `CrdbCluster` before upgrading. For a release already managed by Helm, update its values and use the documented chart upgrade process so field ownership stays consistent.

For a directly managed custom resource, the equivalent complete-object field is:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  template:
    spec:
      dataStore:
        volumeClaimTemplate:
          metadata: {}
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
            volumeMode: Filesystem
            storageClassName: fast-expandable
```

This snippet omits required cluster fields and must be merged into the existing full manifest. Do not replace the whole object with the snippet. Preserve access modes, volume mode, StorageClass, metadata, and any data source; storage size is the intended change.

## Let the GA Operator Reconcile Before Patching Claims

Operator chart 1.0.0 includes a fix for an edge case where a PVC resize could block pod recovery and prevent expansion from completing. If an earlier release is installed, review its changelog and test an Operator upgrade before taking over individual PVCs.

Watch the controller and PVC events:

```bash
kubectl logs deployment/cockroach-operator \
  -n cockroach-operator-system \
  --since=30m --all-containers=true |
  grep -Ei 'resize|persistentvolumeclaim|pvc|error|conflict'

kubectl get pvc -n "$NAMESPACE" --watch
kubectl get events -n "$NAMESPACE" \
  --field-selector involvedObject.kind=PersistentVolumeClaim \
  --sort-by=.lastTimestamp
```

Use the actual operator namespace and Deployment name. A Server-Side Apply field-ownership conflict must be reconciled at the declarative source. Do not reach for Helm 4 `--force-conflicts` until you have inspected `metadata.managedFields` and intentionally chosen the owner.

## Manually Request Expansion Only as a Controlled Fallback

If the `CrdbCluster` and `CrdbNode` both contain the new size, the StorageClass supports expansion, and the current GA Operator still fails to update a claim, a reviewed PVC patch can move the Kubernetes storage controller forward:

```bash
kubectl patch pvc "$PVC" -n "$NAMESPACE" --type=merge \
  -p "{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"${NEW_SIZE}\"}}}}"
```

Apply it to one verified data claim at a time, then wait for capacity and filesystem completion before moving to the next. The declarative `CrdbCluster` size must already match so the fallback does not create drift. Record the incident because manual ownership may affect later reconciliation.

Never edit `PersistentVolume.spec.capacity` to make the numbers match. Kubernetes warns that doing so can prevent automatic expansion: the control plane may conclude that the backing device is already large enough even though the storage provider was never asked to resize it.

## Observe CSI and Filesystem Completion

```bash
kubectl get pvc "$PVC" -n "$NAMESPACE" -w
kubectl describe pvc "$PVC" -n "$NAMESPACE"

kubectl get pvc "$PVC" -n "$NAMESPACE" \
  -o jsonpath='request={.spec.resources.requests.storage}{" allocated="}{.status.allocatedResources.storage}{" capacity="}{.status.capacity.storage}{" resizeStatus="}{.status.allocatedResourceStatuses.storage}{" conditions="}{.status.conditions}{"\n"}'
```

Field availability varies by Kubernetes version. Events such as quota exhaustion, unsupported expansion, controller resize error, node resize error, or `FileSystemResizePending` identify the responsible layer.

For filesystem-mode volumes, Kubernetes expands supported filesystems when a pod uses the claim in read-write mode. Some CSI drivers support online expansion; others finish at pod startup. Do not delete all CockroachDB pods to trigger it. If the driver explicitly requires a restart, let the Operator replace one node, wait for it to become healthy and re-replicated, then continue.

Validate from the mounted path, not just the PVC object:

```bash
export POD=$(kubectl get pods -n "$NAMESPACE" -o json |
  jq -r --arg pvc "$PVC" \
    '.items[] | select(any(.spec.volumes[]?; .persistentVolumeClaim.claimName == $pvc)) | .metadata.name' |
  head -n 1)
test -n "$POD"

kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- \
  df -hT /cockroach/cockroach-data

kubectl exec "$POD" -n "$NAMESPACE" -c cockroachdb -- \
  /cockroach/cockroach node status --ranges --format=table \
  --port=26257 --certs-dir=/cockroach/cockroach-certs
```

The command resolves `POD` from the live volume-to-claim mapping; compare it with the mapping captured earlier before proceeding. Use `--insecure` only for an intentionally insecure test cluster. Capacity is not complete until the filesystem reports the new usable size and CockroachDB health remains acceptable.

## Official Documentation

- [GA v1beta1 `CrdbNodeSpec` and `DataStore` types](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [GA CockroachDB chart storage values](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB Operator 1.0.0 changelog and PVC-resize fix](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [CockroachDB Operator API reference and deprecated fields](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [Kubernetes persistent volume expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims)
- [Kubernetes StorageClass volume expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/#allow-volume-expansion)
- [Kubernetes recovery from failed volume expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#recovering-from-failure-when-expanding-volumes)

## Conclusion

A CockroachDB resize is complete only when the desired cluster template, generated node, PVC request, backing volume, mounted filesystem, and database health all agree. Update the declarative `v1beta1` source, verify `allowVolumeExpansion` and CSI support, and let the current GA Operator reconcile. Use a one-claim PVC patch only after locating an Operator-layer stall. Never delete claims or fabricate PV capacity to force progress.

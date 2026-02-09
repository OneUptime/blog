# How to Move Stateful Applications Between Kubernetes Namespaces with PVC Data Intact

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Stateful Applications, PersistentVolumeClaim, Namespace Migration

Description: Learn practical techniques to migrate stateful applications across Kubernetes namespaces while preserving PVC data integrity, including cloning strategies and zero-downtime approaches.

---

Moving stateful applications between Kubernetes namespaces presents unique challenges compared to stateless workloads. The primary concern is preserving data stored in PersistentVolumeClaims while ensuring minimal downtime. This guide walks through multiple approaches to safely migrate stateful applications with their data intact.

## Understanding the Challenge

When you delete a StatefulSet or Deployment in one namespace and recreate it in another, the PVCs don't automatically follow. PersistentVolumes are cluster-scoped resources, but PersistentVolumeClaims are namespace-scoped. This means you need a strategy to either move or clone the underlying data.

The key question is whether your storage backend supports volume cloning or snapshots. Modern storage classes like AWS EBS, GCP Persistent Disk, and CSI drivers typically support these features, making migrations significantly easier.

## Method 1: Using Volume Snapshots and Clones

This approach leverages Kubernetes VolumeSnapshot resources to create point-in-time copies of your data. It's the cleanest method when your storage class supports it.

First, verify your storage class supports volume snapshots:

```bash
# Check if your storage class has snapshot capability
kubectl get storageclass -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.provisioner}{"\n"}{end}'

# List available VolumeSnapshotClasses
kubectl get volumesnapshotclass
```

Create a VolumeSnapshot of your existing PVC:

```yaml
# snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-data-snapshot
  namespace: old-namespace
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: postgres-data
```

Apply the snapshot configuration:

```bash
kubectl apply -f snapshot.yaml

# Wait for snapshot to be ready
kubectl get volumesnapshot -n old-namespace -w
```

Now create a new PVC in the target namespace from this snapshot:

```yaml
# new-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: new-namespace
spec:
  dataSource:
    name: postgres-data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

This creates a new PVC in the target namespace with the snapshot data. Deploy your stateful application in the new namespace referencing this PVC.

## Method 2: Manual Data Copy Using Init Containers

When volume snapshots aren't available, you can use an init container to copy data from a temporary mount of the old PVC. This requires ReadWriteMany access mode or a temporary pod to facilitate the copy.

First, create a data migration pod in the old namespace:

```yaml
# data-migration-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-migrator
  namespace: old-namespace
spec:
  containers:
  - name: migrator
    image: busybox
    command: ['sh', '-c', 'tar czf /migration/data.tar.gz -C /data . && sleep 3600']
    volumeMounts:
    - name: old-data
      mountPath: /data
    - name: migration-volume
      mountPath: /migration
  volumes:
  - name: old-data
    persistentVolumeClaim:
      claimName: postgres-data
  - name: migration-volume
    emptyDir: {}
```

Expose the data via a temporary service or copy it to object storage:

```bash
# Copy data to S3 or similar
kubectl exec -n old-namespace data-migrator -- sh -c \
  "aws s3 cp /migration/data.tar.gz s3://backup-bucket/migration/"
```

In the new namespace, create a PVC and use an init container to restore:

```yaml
# statefulset-new-namespace.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: new-namespace
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      initContainers:
      - name: restore-data
        image: amazon/aws-cli
        command:
        - sh
        - -c
        - |
          aws s3 cp s3://backup-bucket/migration/data.tar.gz /tmp/data.tar.gz
          tar xzf /tmp/data.tar.gz -C /data
        volumeMounts:
        - name: postgres-data
          mountPath: /data
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

## Method 3: PV Reclaim Policy Manipulation

This advanced technique involves changing the PersistentVolume's reclaim policy and manually rebinding it to a new PVC in the target namespace.

Scale down the application in the old namespace:

```bash
kubectl scale statefulset postgres --replicas=0 -n old-namespace
```

Identify the PersistentVolume backing your PVC:

```bash
PV_NAME=$(kubectl get pvc postgres-data -n old-namespace -o jsonpath='{.spec.volumeName}')
echo $PV_NAME
```

Change the reclaim policy to Retain to prevent deletion:

```bash
kubectl patch pv $PV_NAME -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

Delete the PVC in the old namespace. The PV will remain in a Released state:

```bash
kubectl delete pvc postgres-data -n old-namespace
```

Edit the PV to remove the claimRef and make it available:

```bash
kubectl patch pv $PV_NAME --type json -p '[{"op": "remove", "path": "/spec/claimRef"}]'
```

Create a new PVC in the target namespace with matching specifications:

```yaml
# new-namespace-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: new-namespace
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: ""  # Empty to allow manual binding
  volumeName: pvc-abc123  # Specify the PV name
```

Kubernetes will bind this PVC to your existing PV, preserving all data.

## Method 4: Zero-Downtime Migration with Replication

For critical workloads, set up replication between the old and new namespaces before cutting over.

Deploy a replica instance in the new namespace:

```yaml
# replica-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
  namespace: new-namespace
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: replica
  template:
    metadata:
      labels:
        app: postgres
        role: replica
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        - name: POSTGRES_PRIMARY_HOST
          value: postgres.old-namespace.svc.cluster.local
        - name: POSTGRES_REPLICATION_MODE
          value: slave
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

Configure PostgreSQL streaming replication from the primary in the old namespace. Once synchronized, promote the replica to primary:

```bash
# Promote replica to primary
kubectl exec -n new-namespace postgres-replica-0 -- \
  pg_ctl promote -D /var/lib/postgresql/data/pgdata
```

Update your application to point to the new namespace service and decommission the old primary.

## Validation and Testing

Before considering the migration complete, verify data integrity:

```bash
# Compare data checksums
kubectl exec -n old-namespace postgres-0 -- \
  psql -U postgres -c "SELECT md5(string_agg(column_name::text, '')) FROM table_name"

kubectl exec -n new-namespace postgres-0 -- \
  psql -U postgres -c "SELECT md5(string_agg(column_name::text, '')) FROM table_name"
```

Test application connectivity and functionality in the new namespace before removing resources from the old namespace.

## Best Practices

Always perform a backup before starting any migration. Use tools like Velero for full cluster backups:

```bash
velero backup create pre-migration-backup --include-namespaces=old-namespace
```

Document your storage class capabilities and test the migration process in a non-production environment first. Label your PVCs clearly to track their migration status:

```bash
kubectl label pvc postgres-data -n new-namespace migration-source=old-namespace
kubectl label pvc postgres-data -n new-namespace migration-date=$(date +%Y-%m-%d)
```

Consider using Kubernetes operators like the CNPG operator for PostgreSQL or MongoDB operators that provide built-in migration tools.

## Conclusion

Moving stateful applications between namespaces requires careful planning and understanding of your storage backend capabilities. Volume snapshots provide the cleanest solution when available, while manual data copying and PV rebinding offer alternatives for environments without snapshot support. Always prioritize data integrity over speed, and thoroughly test your migration process before applying it to production workloads.

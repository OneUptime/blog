# How to Migrate Storage Between Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, Persistent Volume

Description: A practical guide to migrating persistent volume data between Kubernetes clusters managed by Rancher.

Migrating storage between clusters is a common requirement when upgrading infrastructure, changing cloud providers, or consolidating workloads. This guide covers several strategies for moving persistent volume data between Rancher-managed Kubernetes clusters.

## Prerequisites

- Two Rancher-managed Kubernetes clusters (source and destination)
- kubectl access to both clusters
- Sufficient storage capacity on the destination cluster
- Network connectivity between clusters (for some methods)
- VolumeSnapshot CRDs/controller and CSI drivers with snapshot support (for the snapshot method)

## Step 1: Assess Your Migration Requirements

Before migrating, inventory your storage:

```bash
# On the source cluster

kubectl get pv -o custom-columns='NAME:.metadata.name,CAPACITY:.spec.capacity.storage,CLASS:.spec.storageClassName,STATUS:.status.phase,CLAIM:.spec.claimRef.name'

kubectl get pvc --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,SIZE:.spec.resources.requests.storage,CLASS:.spec.storageClassName'
```

Determine:
- Total data volume
- Access mode requirements (RWO, RWX)
- Acceptable downtime window
- Storage backend compatibility

## Step 2: Method 1 - Using Velero for Backup and Restore

Install Velero on both clusters:

```bash
# On source cluster
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent
```

Create a backup of the source namespace:

```bash
velero backup create migration-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup \
  --wait
```

Check backup status:

```bash
velero backup describe migration-backup
velero backup logs migration-backup
```

Restore on the destination cluster:

```bash
# On destination cluster (with same Velero config pointing to the same bucket)
velero restore create migration-restore \
  --from-backup migration-backup \
  --wait
```

## Step 3: Method 2 - Using rsync Between Pods

Deploy an rsync pod on the source cluster:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: rsync-source
  namespace: default
  labels:
    app: rsync-source
spec:
  containers:
  - name: rsync
    image: instrumentisto/rsync-ssh:latest
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: source-data
      mountPath: /data
  volumes:
  - name: source-data
    persistentVolumeClaim:
      claimName: source-pvc
```

Deploy an rsync pod on the destination cluster with a new PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: destination-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: <destination-storage-class>
  resources:
    requests:
      storage: 50Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: rsync-destination
  namespace: default
  labels:
    app: rsync-destination
spec:
  containers:
  - name: rsync
    image: instrumentisto/rsync-ssh:latest
    command:
    - sh
    - -c
    - |
      cat >/tmp/rsyncd.conf <<'EOF'
      uid = 0
      gid = 0
      use chroot = no
      [destination]
        path = /data
        read only = false
      EOF
      rsync --daemon --no-detach --config=/tmp/rsyncd.conf
    ports:
    - containerPort: 873
    volumeMounts:
    - name: dest-data
      mountPath: /data
  volumes:
  - name: dest-data
    persistentVolumeClaim:
      claimName: destination-pvc
```

Expose the destination pod temporarily and use rsync to copy data:

```bash
# Destination cluster: expose the rsync pod with a temporary service
kubectl expose pod/rsync-destination --context=destination-cluster \
  --name=rsync-destination --type=LoadBalancer --port=873 --target-port=873

# Check the external address of the temporary service
kubectl get svc --context=destination-cluster rsync-destination

# Source cluster: copy data to the destination rsync daemon
kubectl exec --context=source-cluster rsync-source -- \
  rsync -avz --progress /data/ rsync://<destination-service-address>/destination
```

## Step 4: Method 3 - Using kubectl cp

For smaller volumes, use kubectl cp if the pods have `tar` installed:

```bash
# Create a tar of the source data
kubectl exec --context=source-cluster source-pod -- tar czf /tmp/data-backup.tar.gz -C /data .

# Copy from source pod to local machine
kubectl cp --context=source-cluster default/source-pod:/tmp/data-backup.tar.gz ./data-backup.tar.gz

# Copy to destination pod
kubectl cp --context=destination-cluster ./data-backup.tar.gz default/dest-pod:/tmp/data-backup.tar.gz

# Extract on destination
kubectl exec --context=destination-cluster dest-pod -- tar xzf /tmp/data-backup.tar.gz -C /data
```

## Step 5: Method 4 - Using Cloud Snapshots

If both clusters are on the same cloud provider, use CSI drivers that can access the same underlying snapshot backend, and have VolumeSnapshot support installed:

```bash
# Create a volume snapshot on source cluster
kubectl apply --context=source-cluster -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: migration-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: source-pvc
EOF

# Wait for snapshot to be ready
kubectl get volumesnapshot --context=source-cluster -n default migration-snapshot -o jsonpath='{.status.readyToUse}'
```

Get the snapshot handle and create a pre-provisioned VolumeSnapshotContent and VolumeSnapshot on the destination cluster referencing it:

```bash
# Get snapshot handle
SNAPSHOT_HANDLE=$(kubectl get volumesnapshotcontent --context=source-cluster \
  $(kubectl get volumesnapshot --context=source-cluster -n default migration-snapshot -o jsonpath='{.status.boundVolumeSnapshotContentName}') \
  -o jsonpath='{.status.snapshotHandle}')

echo "$SNAPSHOT_HANDLE"
```

Create a VolumeSnapshotContent and VolumeSnapshot on the destination cluster referencing the snapshot handle, then create a PVC from that VolumeSnapshot using the `dataSource` field.

## Step 6: Method 5 - Using an Intermediate NFS Share

Mount an NFS share on both clusters:

```yaml
# Source cluster - copy data to NFS
apiVersion: v1
kind: Pod
metadata:
  name: nfs-copy-source
spec:
  containers:
  - name: copy
    image: busybox
    command: ["sh", "-c", "cp -a /source/. /nfs/ && echo done && sleep infinity"]
    volumeMounts:
    - name: source
      mountPath: /source
    - name: nfs
      mountPath: /nfs
  volumes:
  - name: source
    persistentVolumeClaim:
      claimName: source-pvc
  - name: nfs
    nfs:
      server: nfs-server.example.com
      path: /exports/migration
```

Then mount the same NFS share on the destination cluster and copy data to the new PVC.

## Step 7: Verify Data Integrity

After migration, verify the data:

```bash
# Check file count and size on source
kubectl exec --context=source-cluster source-pod -- find /data -type f | wc -l
kubectl exec --context=source-cluster source-pod -- du -sh /data

# Check file count and size on destination
kubectl exec --context=destination-cluster dest-pod -- find /data -type f | wc -l
kubectl exec --context=destination-cluster dest-pod -- du -sh /data

# Compare checksums for critical files
kubectl exec --context=source-cluster source-pod -- md5sum /data/important-file
kubectl exec --context=destination-cluster dest-pod -- md5sum /data/important-file
```

## Step 8: Update Application Configurations

After migrating data, deploy your applications on the destination cluster referencing the new PVCs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:latest
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: destination-pvc
```

## Step 9: Handle Database Migrations

For databases, use native tools for consistent migration:

```bash
# PostgreSQL
kubectl exec --context=source-cluster pg-pod -- sh -c 'PGPASSWORD="<postgres-password>" pg_dump -U postgres mydb' > mydb.sql
kubectl cp mydb.sql --context=destination-cluster default/pg-pod:/tmp/mydb.sql
kubectl exec --context=destination-cluster pg-pod -- sh -c 'PGPASSWORD="<postgres-password>" psql -U postgres mydb < /tmp/mydb.sql'

# MySQL
kubectl exec --context=source-cluster mysql-pod -- sh -c 'mysqldump -u root --password="<mysql-password>" mydb' > mydb.sql
kubectl cp mydb.sql --context=destination-cluster default/mysql-pod:/tmp/mydb.sql
kubectl exec --context=destination-cluster mysql-pod -- sh -c 'mysql -u root --password="<mysql-password>" mydb < /tmp/mydb.sql'
```

## Step 10: Clean Up Source Cluster

After verifying the migration:

```bash
# Scale down source applications
kubectl scale --context=source-cluster deployment/my-app --replicas=0

# Delete migration pods
kubectl delete pod --context=source-cluster rsync-source
kubectl delete pod --context=destination-cluster rsync-destination

# Keep source PVCs until you are confident the migration is successful
# Then delete when ready
# kubectl delete pvc --context=source-cluster source-pvc
```

## Summary

Migrating storage between Rancher-managed clusters can be accomplished through several methods depending on your environment. Velero provides the most comprehensive solution with backup and restore capabilities. For simpler migrations, rsync or kubectl cp work well. Cloud snapshots offer the fastest option when staying within the same provider. Always verify data integrity after migration and maintain source data until you confirm the migration was successful.

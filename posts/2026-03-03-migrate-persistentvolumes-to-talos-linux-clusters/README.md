# How to Migrate PersistentVolumes to Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, PersistentVolume, Storage Migration, Data Migration, CSI

Description: A detailed guide on migrating PersistentVolume data to Talos Linux Kubernetes clusters using multiple strategies for different storage backends.

---

Migrating PersistentVolumes is often the hardest part of any Kubernetes cluster migration. Stateless workloads are easy to redeploy, but data stored in PersistentVolumes needs careful handling to avoid corruption or loss. When moving to a Talos Linux cluster, you likely also need to change your storage backend since Talos uses different CSI drivers than your source cluster. This guide covers multiple strategies for migrating PV data safely and efficiently.

## Understanding the Challenge

PersistentVolumes in Kubernetes are tied to their underlying storage backend. An EBS-backed PV cannot simply be "moved" to a Longhorn-backed cluster. The data inside the volume needs to be copied from one storage system to another. This introduces several challenges:

- Data consistency during the copy (especially for databases)
- Downtime requirements for the migration window
- Network bandwidth for large volumes
- Storage class mapping between source and target clusters

Let us look at each migration strategy and when to use it.

## Strategy 1: Velero with File System Backup

Velero's filesystem backup (using the node-agent, formerly Restic) copies the actual file contents from PVs. This is storage-backend agnostic, making it the most portable option.

### Set Up Velero on Both Clusters

```bash
# Install on the source cluster
velero install \
  --provider aws \
  --bucket velero-migration \
  --secret-file ./credentials \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=http://minio:9000 \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Wait for Velero and node-agent pods to be ready
kubectl get pods -n velero -w
```

### Create Backup with Volume Data

```bash
# Back up a specific namespace with all its PV data
velero backup create pv-migration \
  --include-namespaces production \
  --default-volumes-to-fs-backup \
  --wait

# Check backup status and volume snapshot details
velero backup describe pv-migration --details

# You should see PodVolumeBackups listed for each PV
kubectl get podvolumebackups -n velero
```

### Restore on the Talos Cluster

```bash
# Install Velero on the target Talos cluster with the same storage config
velero install \
  --provider aws \
  --bucket velero-migration \
  --secret-file ./credentials \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=http://minio:9000 \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Restore with storage class mapping
# Create a ConfigMap to map old storage classes to new ones
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: change-storage-class
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/change-storage-class: RestoreItemAction
data:
  gp2: longhorn
  standard: longhorn
  azure-disk: longhorn
EOF

# Now restore
velero restore create pv-restore \
  --from-backup pv-migration \
  --wait

# Check restore status
velero restore describe pv-restore --details
kubectl get podvolumerestores -n velero
```

### Limitations of Velero

Velero's filesystem backup works by running an agent inside each pod that has a PV mounted. This means:

- The pod must be running during backup
- Large volumes take a long time (it is essentially a file copy)
- File permissions and ownership are preserved, but filesystem-level features (snapshots, dedup) are not
- Database files should be backed up with application-level tools, not filesystem copies

## Strategy 2: Application-Level Backup and Restore

For databases and other stateful applications, application-level tools produce more consistent backups:

```bash
# PostgreSQL
# On the source cluster
kubectl exec -n production postgres-0 -- \
  pg_dump -U admin -Fc mydb > mydb.dump

# Create the PVC on the target Talos cluster
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi
EOF

# Deploy PostgreSQL on the target cluster
kubectl apply -f postgres-deployment.yaml -n production

# Copy the dump to the new pod and restore
kubectl cp mydb.dump production/postgres-0:/tmp/mydb.dump
kubectl exec -n production postgres-0 -- \
  pg_restore -U admin -d mydb /tmp/mydb.dump

# MySQL/MariaDB
kubectl exec -n production mysql-0 -- \
  mysqldump -u root --all-databases > all-databases.sql
kubectl cp all-databases.sql production/mysql-0:/tmp/all-databases.sql
kubectl exec -n production mysql-0 -- \
  mysql -u root < /tmp/all-databases.sql

# Redis
kubectl exec -n production redis-0 -- redis-cli BGSAVE
kubectl cp production/redis-0:/data/dump.rdb ./redis-dump.rdb
kubectl cp ./redis-dump.rdb production/redis-0:/data/dump.rdb
kubectl exec -n production redis-0 -- redis-cli DEBUG RELOAD

# Elasticsearch
# Use the snapshot and restore API
kubectl exec -n production es-master-0 -- \
  curl -X PUT "localhost:9200/_snapshot/migration_repo" \
  -H 'Content-Type: application/json' \
  -d '{"type":"fs","settings":{"location":"/snapshots"}}'
```

## Strategy 3: Direct Volume Copy with rsync

For raw file data (not databases), rsync provides an efficient way to copy data between clusters:

```bash
# Step 1: Create a helper pod on the SOURCE cluster with the PVC mounted
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: rsync-source
  namespace: production
spec:
  containers:
    - name: rsync
      image: instrumentisto/rsync-ssh
      command: ["sleep", "infinity"]
      volumeMounts:
        - name: source-data
          mountPath: /data
  volumes:
    - name: source-data
      persistentVolumeClaim:
        claimName: my-app-data
EOF

# Step 2: Create a matching PVC and helper pod on the TARGET cluster
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: rsync-target
  namespace: production
spec:
  containers:
    - name: rsync
      image: instrumentisto/rsync-ssh
      command: ["sleep", "infinity"]
      volumeMounts:
        - name: target-data
          mountPath: /data
  volumes:
    - name: target-data
      persistentVolumeClaim:
        claimName: my-app-data
EOF

# Step 3: Use kubectl cp or port-forward to transfer data
# Option A: Using a temporary tar archive
KUBECONFIG=./source-kubeconfig kubectl exec -n production rsync-source -- \
  tar czf /tmp/data-backup.tar.gz -C /data .

KUBECONFIG=./source-kubeconfig kubectl cp \
  production/rsync-source:/tmp/data-backup.tar.gz ./data-backup.tar.gz

KUBECONFIG=./target-kubeconfig kubectl cp \
  ./data-backup.tar.gz production/rsync-target:/tmp/data-backup.tar.gz

KUBECONFIG=./target-kubeconfig kubectl exec -n production rsync-target -- \
  tar xzf /tmp/data-backup.tar.gz -C /data

# Option B: Direct rsync over port-forward (more efficient for large datasets)
# On the target pod, start an rsync daemon
KUBECONFIG=./target-kubeconfig kubectl exec -n production rsync-target -- \
  rsync --daemon --no-detach --port=8730 &

# Port-forward from target cluster
KUBECONFIG=./target-kubeconfig kubectl port-forward -n production rsync-target 8730:8730 &

# Copy from source to target through the port-forward
KUBECONFIG=./source-kubeconfig kubectl exec -n production rsync-source -- \
  rsync -avz /data/ rsync://localhost:8730/data/
```

## Strategy 4: Shared Storage Migration

If both clusters can access a shared storage system (NFS, S3, or a SAN), you can use it as an intermediary:

```bash
# Step 1: Mount shared storage on a source cluster pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: data-export
  namespace: production
spec:
  containers:
    - name: copy
      image: busybox
      command: ["sleep", "infinity"]
      volumeMounts:
        - name: source
          mountPath: /source
        - name: shared
          mountPath: /shared
  volumes:
    - name: source
      persistentVolumeClaim:
        claimName: my-app-data
    - name: shared
      nfs:
        server: nfs.example.com
        path: /migration
EOF

# Step 2: Copy data to shared storage
kubectl exec -n production data-export -- \
  cp -a /source/. /shared/my-app-data/

# Step 3: On the target Talos cluster, mount the same shared storage
# and copy data into the new PVC
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: data-import
  namespace: production
spec:
  containers:
    - name: copy
      image: busybox
      command: ["sleep", "infinity"]
      volumeMounts:
        - name: target
          mountPath: /target
        - name: shared
          mountPath: /shared
          readOnly: true
  volumes:
    - name: target
      persistentVolumeClaim:
        claimName: my-app-data
    - name: shared
      nfs:
        server: nfs.example.com
        path: /migration
EOF

kubectl exec -n production data-import -- \
  cp -a /shared/my-app-data/. /target/
```

## Handling Storage Class Changes

When migrating to Talos, you will likely use different storage classes. Here is how to handle that:

```bash
# List storage classes on the source cluster
kubectl get sc

# Create equivalent storage classes on the Talos cluster
# Example: Longhorn storage class
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
EOF

# When restoring PVCs, update the storageClassName
# You can use sed or yq to batch-update exported PVC YAML files
yq '.items[].spec.storageClassName = "longhorn"' pvcs.yaml > pvcs-updated.yaml
kubectl apply -f pvcs-updated.yaml
```

## Validating Migrated Data

Always verify data integrity after migration:

```bash
# Compare file counts and sizes
echo "Source:"
kubectl exec -n production rsync-source -- find /data -type f | wc -l
kubectl exec -n production rsync-source -- du -sh /data

echo "Target:"
kubectl exec -n production rsync-target -- find /data -type f | wc -l
kubectl exec -n production rsync-target -- du -sh /data

# For databases, compare row counts
kubectl exec -n production postgres-0 -- \
  psql -U admin -d mydb -c "SELECT COUNT(*) FROM important_table;"

# Generate checksums for critical files
kubectl exec -n production rsync-source -- \
  find /data -type f -exec md5sum {} \; | sort > /tmp/source-checksums.txt
kubectl exec -n production rsync-target -- \
  find /data -type f -exec md5sum {} \; | sort > /tmp/target-checksums.txt
```

## Wrapping Up

PersistentVolume migration is the most time-consuming and risk-prone part of moving to a Talos Linux cluster. The right strategy depends on the type of data you are moving, the size of your volumes, your acceptable downtime window, and your storage backends. For most cases, a combination of application-level backups for databases and Velero filesystem backup for everything else provides the best balance of reliability and speed. Always validate your data after migration, keep the source cluster available for rollback, and plan for enough time - large volume migrations often take longer than expected.

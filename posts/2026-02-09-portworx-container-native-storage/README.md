# How to Deploy Portworx for Container-Native Storage with Data Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Portworx

Description: Deploy Portworx Enterprise on Kubernetes for container-native storage with automated capacity management, data services like encryption and snapshots, and multi-cloud portability.

---

Portworx provides enterprise-grade storage specifically designed for containers with features that go beyond basic block storage. Its data services include encryption at rest, automated capacity expansion, application-aware snapshots, disaster recovery through cloud backups, and cross-cloud migration capabilities. These features make Portworx suitable for running production databases and stateful applications at scale.

This guide covers Portworx installation on Kubernetes, configuring storage pools, implementing encryption and snapshots, and utilizing advanced features like volume auto-scaling and application consistency groups.

## Understanding Portworx Architecture

Portworx runs as a DaemonSet on Kubernetes nodes, aggregating local disks into a distributed storage fabric. The architecture includes several components: the Portworx storage driver manages local storage devices and replication, the control plane handles cluster coordination and metadata, and the CSI driver integrates with Kubernetes for dynamic provisioning.

Each node's Portworx instance coordinates with peers to replicate data across the cluster according to replication policies. When a pod writes data, Portworx synchronously replicates to the configured number of nodes before acknowledging the write, ensuring consistency and durability.

Portworx's data services layer provides encryption, compression, and application integration through pre and post-snapshot hooks. The system automatically handles node failures by creating new replicas on healthy nodes, maintaining data availability without manual intervention.

## Prerequisites and License

Portworx Enterprise requires a valid license. You can obtain a trial license from the Portworx website.

```bash
# Install px command-line tool
curl -fsSL https://install.portworx.com/px-kubectl | bash

# Verify installation
kubectl portworx version
```

Ensure nodes have raw, unmounted block devices available for Portworx. These devices should not contain filesystems or partitions.

```bash
# On each worker node, verify available disks
lsblk
sudo fdisk -l

# Ensure disks are empty (no filesystem)
sudo file -s /dev/sdb
# Output should show "data" not a filesystem type
```

## Generating Portworx Spec

Use the Portworx spec generator to create installation manifests.

```bash
# Generate spec using the online generator
# Visit https://install.portworx.com/
# Or use the CLI

# Example spec generation for on-premises deployment
curl -fsL -o px-spec.yaml "https://install.portworx.com/2.13?comp=pxoperator&kbver=$(kubectl version --short | awk -Fv '/Server Version: /{print $3}')&ns=portworx&c=px-cluster-1&stork=true&csi=true&mon=true&st=k8s&e=KVDB_DEVICE%3D%2Fdev/sdc"

# For cloud deployments with auto-disk provisioning on AWS
curl -fsL -o px-spec.yaml "https://install.portworx.com/2.13?comp=pxoperator&kbver=1.28&ns=portworx&c=px-cluster-aws&stork=true&csi=true&mon=true&st=k8s&cloud=aws&aws=type%3Dgp3%2Csize%3D150"
```

Key parameters:
- `c`: Cluster name
- `stork`: Enable Stork scheduler for hyperconvergence
- `csi`: Enable CSI driver
- `mon`: Enable Prometheus metrics
- `cloud`: Cloud provider (aws, azure, gcp)

## Installing Portworx Operator

The Portworx Operator manages the Portworx cluster lifecycle.

```yaml
# portworx-operator.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: portworx
---
# Download and apply operator manifest
# kubectl apply -f 'https://install.portworx.com/2.13?comp=pxoperator'
```

Apply the generated spec.

```bash
kubectl apply -f px-spec.yaml

# Wait for operator deployment
kubectl wait --for=condition=ready pod \
  -l name=portworx-operator \
  -n portworx \
  --timeout=300s

# Check operator logs
kubectl logs -n portworx -l name=portworx-operator
```

## Deploying Portworx Storage Cluster

Create a StorageCluster custom resource to deploy Portworx.

```yaml
# storage-cluster.yaml
apiVersion: core.libopenstorage.org/v1
kind: StorageCluster
metadata:
  name: px-cluster
  namespace: portworx
spec:
  image: portworx/oci-monitor:2.13.0
  imagePullPolicy: Always
  kvdb:
    internal: true
  storage:
    useAll: true
    useAllWithPartitions: false
    forceUseDisks: false
    devices:
    - /dev/sdb
    - /dev/sdc
    journalDevice: auto
  cloudStorage:
    maxStorageNodesPerZone: 3
    deviceSpecs:
    - type=gp3,size=150
  secretsProvider: k8s
  stork:
    enabled: true
    args:
      webhook-controller: "true"
  autopilot:
    enabled: true
  csi:
    enabled: true
  monitoring:
    prometheus:
      enabled: true
      exportMetrics: true
  env:
  - name: ENABLE_ASG_STORAGE_PARTITIONING
    value: "true"
```

Apply and monitor cluster deployment.

```bash
kubectl apply -f storage-cluster.yaml

# Watch Portworx pod startup
kubectl get pods -n portworx -l name=portworx -w

# Wait for cluster to be online
PX_POD=$(kubectl get pods -l name=portworx -n portworx -o jsonpath='{.items[0].metadata.name}')
kubectl exec $PX_POD -n portworx -- /opt/pwx/bin/pxctl status
```

The status command should show all nodes in an "Online" state with storage pools initialized.

## Creating Storage Classes

Define StorageClasses for different performance and replication requirements.

```yaml
# storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: px-db
provisioner: pxd.portworx.com
parameters:
  repl: "3"
  io_priority: "high"
  snap_interval: "60"
  io_profile: "db_remote"
  fs: "ext4"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: px-replicated
provisioner: pxd.portworx.com
parameters:
  repl: "2"
  io_priority: "medium"
  fs: "ext4"
allowVolumeExpansion: true
volumeBindingMode: Immediate
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: px-encrypted
provisioner: pxd.portworx.com
parameters:
  repl: "3"
  secure: "true"
  io_profile: "sequential"
allowVolumeExpansion: true
```

Apply storage classes.

```bash
kubectl apply -f storage-classes.yaml
kubectl get storageclass
```

## Configuring Volume Encryption

Portworx supports cluster-wide and per-volume encryption using Kubernetes secrets.

```yaml
# encryption-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: px-vol-encryption
  namespace: portworx
type: Opaque
data:
  # Base64 encoded passphrase
  cluster-wide-secret: <base64-encoded-passphrase>
```

Create encrypted PVC.

```yaml
# encrypted-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-encrypted
  annotations:
    px/secret-name: px-vol-encryption
    px/secret-namespace: portworx
    px/secret-key: cluster-wide-secret
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: px-encrypted
  resources:
    requests:
      storage: 50Gi
```

Deploy a database using the encrypted volume.

```yaml
# postgres-encrypted.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-encrypted
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
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: changeme
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
      annotations:
        px/secret-name: px-vol-encryption
        px/secret-namespace: portworx
        px/secret-key: cluster-wide-secret
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: px-encrypted
      resources:
        requests:
          storage: 50Gi
```

Verify encryption is active.

```bash
kubectl apply -f postgres-encrypted.yaml

# Check volume encryption status
PX_POD=$(kubectl get pods -l name=portworx -n portworx -o jsonpath='{.items[0].metadata.name}')
VOL_ID=$(kubectl get pv -o json | jq -r '.items[] | select(.spec.claimRef.name=="data-postgres-encrypted-0") | .spec.csi.volumeHandle')
kubectl exec $PX_POD -n portworx -- /opt/pwx/bin/pxctl volume inspect $VOL_ID | grep -i encrypt
```

## Implementing Application-Consistent Snapshots

Use 3DSnaps for application-consistent snapshots of multiple volumes.

```yaml
# groupsnapshot.yaml
apiVersion: stork.libopenstorage.org/v1alpha1
kind: GroupVolumeSnapshot
metadata:
  name: postgres-group-snapshot
spec:
  preExecRule: postgres-pre-snap
  postExecRule: postgres-post-snap
  pvcSelector:
    matchLabels:
      app: postgres
---
# Pre-snapshot rule to flush database
apiVersion: stork.libopenstorage.org/v1alpha1
kind: Rule
metadata:
  name: postgres-pre-snap
rules:
- podSelector:
    app: postgres
  actions:
  - type: command
    value: psql -U postgres -c "CHECKPOINT"
---
# Post-snapshot rule
apiVersion: stork.libopenstorage.org/v1alpha1
kind: Rule
metadata:
  name: postgres-post-snap
rules:
- podSelector:
    app: postgres
  actions:
  - type: command
    value: echo "Snapshot complete"
```

Create the group snapshot.

```bash
kubectl apply -f groupsnapshot.yaml

# Check snapshot status
kubectl get groupvolumesnapshot postgres-group-snapshot

# List individual snapshots created
kubectl get volumesnapshot
```

## Configuring Autopilot for Auto-Scaling

Autopilot automatically expands volumes when they approach capacity.

```yaml
# autopilot-rule.yaml
apiVersion: autopilot.libopenstorage.org/v1alpha1
kind: AutopilotRule
metadata:
  name: volume-resize
spec:
  enforcement: required
  pollInterval: 60s
  conditions:
    expressions:
    - key: "100 * (px_volume_usage_bytes / px_volume_capacity_bytes)"
      operator: Gt
      values:
      - "80"
  actions:
  - name: openstorage.io.action.volume/resize
    params:
      scalepercentage: "50"
      maxsize: "500Gi"
```

Apply the autopilot rule.

```bash
kubectl apply -f autopilot-rule.yaml

# Monitor autopilot activity
kubectl logs -n portworx -l name=autopilot -f
```

## Setting Up Cloud Backups

Configure S3 for cloud backups and disaster recovery.

```bash
# Create cloud credential
PX_POD=$(kubectl get pods -l name=portworx -n portworx -o jsonpath='{.items[0].metadata.name}')

kubectl exec $PX_POD -n portworx -- /opt/pwx/bin/pxctl credentials create \
  --provider s3 \
  --s3-access-key YOUR_ACCESS_KEY \
  --s3-secret-key YOUR_SECRET_KEY \
  --s3-region us-east-1 \
  --s3-endpoint s3.amazonaws.com \
  backup-creds

# Create scheduled backup
cat <<EOF | kubectl apply -f -
apiVersion: stork.libopenstorage.org/v1alpha1
kind: SchedulePolicy
metadata:
  name: daily-backup
spec:
  daily:
    time: "02:00AM"
    retain: 7
---
apiVersion: stork.libopenstorage.org/v1alpha1
kind: ApplicationBackup
metadata:
  name: postgres-daily-backup
spec:
  schedulePolicyName: daily-backup
  namespaces:
  - default
  selectors:
    app: postgres
  reclaimPolicy: Delete
  backupLocation: s3://my-backups/postgres
EOF
```

Restore from backup.

```bash
# List available backups
kubectl get applicationbackup

# Create restore
cat <<EOF | kubectl apply -f -
apiVersion: stork.libopenstorage.org/v1alpha1
kind: ApplicationRestore
metadata:
  name: postgres-restore
spec:
  backupName: postgres-daily-backup
  namespaceMapping:
    default: postgres-restored
EOF

# Monitor restore
kubectl get applicationrestore postgres-restore -w
```

## Monitoring Portworx

Portworx exposes Prometheus metrics for monitoring.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: portworx
  namespace: portworx
spec:
  selector:
    matchLabels:
      name: portworx
  endpoints:
  - port: px-api
    path: /metrics
    interval: 30s
```

Key metrics to monitor:
- `px_cluster_status_cluster_quorum`: Cluster quorum status
- `px_volume_usage_bytes`: Volume usage
- `px_volume_capacity_bytes`: Volume capacity
- `px_node_status_node_status`: Node health

Portworx delivers enterprise storage capabilities purpose-built for containers with data services that extend beyond basic block storage. Features like encryption, application-consistent snapshots, automated capacity management, and cloud backup integration provide production-ready storage for demanding stateful workloads. The combination of container-native architecture and enterprise features makes Portworx suitable for running critical databases and applications at scale.

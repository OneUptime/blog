# How to Deploy TopoLVM for LVM-Based Thin Provisioning on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, LVM

Description: Implement TopoLVM for topology-aware LVM-based storage provisioning on Kubernetes with thin provisioning, snapshots, and efficient local disk utilization.

---

TopoLVM bridges the gap between Kubernetes persistent volumes and Linux Logical Volume Manager by providing CSI-compliant dynamic provisioning backed by LVM thin pools. Unlike traditional block storage that requires dedicated hardware or network protocols, TopoLVM leverages local disks on each node with intelligent scheduling that considers storage capacity when placing pods.

This guide demonstrates deploying TopoLVM with LVM thin provisioning, configuring volume groups across your cluster, and utilizing topology-aware scheduling to ensure pods land on nodes with sufficient storage capacity.

## Understanding TopoLVM Architecture

TopoLVM consists of three main components: the CSI controller that handles volume provisioning decisions, the CSI node plugin that creates and manages LVM logical volumes on each node, and the scheduler extender that informs Kubernetes scheduler about available storage capacity per node.

When you create a PVC, TopoLVM calculates which nodes have enough free space in their volume groups, updates node labels accordingly, and the scheduler extender filters node candidates based on storage requirements. Once a node is selected, the node plugin creates a thin logical volume from the configured thin pool and formats it for the pod to mount.

Thin provisioning allows you to overcommit storage by allocating logical capacity without immediate physical backing. A 100GB thin volume consumes only the actual written data, growing dynamically as the application writes more information.

## Preparing LVM on Worker Nodes

Before deploying TopoLVM, configure LVM on each worker node. This example assumes you have a raw disk /dev/sdb available.

```bash
# On each worker node, install LVM tools
sudo apt-get update
sudo apt-get install -y lvm2 thin-provisioning-tools

# Create physical volume
sudo pvcreate /dev/sdb

# Create volume group named 'node-vg'
sudo vgcreate node-vg /dev/sdb

# Check VG creation
sudo vgs
sudo pvs

# Create thin pool (80% of VG space)
# Calculate thin pool size
VG_SIZE=$(sudo vgs --noheadings --units g -o vg_size node-vg | tr -d ' G')
THIN_SIZE=$(echo "$VG_SIZE * 0.8" | bc | cut -d'.' -f1)

sudo lvcreate -L ${THIN_SIZE}G -T node-vg/thin-pool

# Verify thin pool creation
sudo lvs
```

The thin pool acts as a parent volume from which thin logical volumes are allocated. TopoLVM will create LVs from this pool.

## Installing TopoLVM with Helm

Deploy TopoLVM using the official Helm chart.

```bash
# Add TopoLVM Helm repository
helm repo add topolvm https://topolvm.github.io/topolvm
helm repo update

# Create namespace
kubectl create namespace topolvm-system

# Install with custom configuration
cat > topolvm-values.yaml <<EOF
# Storage class configuration
storageClasses:
  - name: topolvm-provisioner
    storageClass:
      isDefaultClass: false
      volumeBindingMode: WaitForFirstConsumer
      allowVolumeExpansion: true
      additionalParameters:
        "topolvm.io/device-class": "ssd"

# Node configuration
node:
  lvmdConfigMap: lvmd-config

# Scheduler extender configuration
scheduler:
  enabled: true
  type: deployment

# Webhook for capacity tracking
webhook:
  podMutatingWebhook:
    enabled: true
EOF

helm install topolvm topolvm/topolvm \
  --namespace topolvm-system \
  --values topolvm-values.yaml

# Wait for deployment
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=topolvm \
  -n topolvm-system \
  --timeout=300s
```

## Configuring lvmd on Nodes

TopoLVM requires lvmd configuration on each node specifying which volume groups and device classes to use.

```yaml
# lvmd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lvmd-config
  namespace: topolvm-system
data:
  lvmd.yaml: |
    device-classes:
      - name: ssd
        volume-group: node-vg
        spare-gb: 10
        default: true
        thin-pool:
          name: thin-pool
          overprovision-ratio: 2.0
```

The `spare-gb` reserves space in the volume group for metadata and snapshots. The `overprovision-ratio` allows logical capacity to exceed physical capacity, useful for workloads with known usage patterns.

```bash
kubectl apply -f lvmd-configmap.yaml

# Restart lvmd pods to pick up configuration
kubectl rollout restart daemonset -n topolvm-system topolvm-node
kubectl rollout status daemonset -n topolvm-system topolvm-node
```

## Enabling the TopoLVM Scheduler Extender

Configure the Kubernetes scheduler to use TopoLVM's capacity-aware scheduler extender.

```yaml
# scheduler-policy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-extender-policy
  namespace: kube-system
data:
  policy.cfg: |
    {
      "kind": "Policy",
      "apiVersion": "v1",
      "extenders": [
        {
          "urlPrefix": "http://topolvm-scheduler.topolvm-system.svc:9251",
          "filterVerb": "predicate",
          "prioritizeVerb": "prioritize",
          "nodeCacheCapable": false,
          "weight": 1,
          "managedResources": [
            {
              "name": "topolvm.io/capacity",
              "ignoredByScheduler": true
            }
          ]
        }
      ]
    }
```

For most modern Kubernetes installations using the default scheduler, you can configure this through scheduler configuration files or deploy TopoLVM's built-in scheduler webhook instead.

## Creating Storage Classes

Define storage classes for different performance tiers or device classes.

```yaml
# storageclass-ssd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-ssd
provisioner: topolvm.io
parameters:
  "topolvm.io/device-class": "ssd"
  "csi.storage.k8s.io/fstype": "ext4"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
---
# storageclass-hdd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-hdd
provisioner: topolvm.io
parameters:
  "topolvm.io/device-class": "hdd"
  "csi.storage.k8s.io/fstype": "ext4"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

The `WaitForFirstConsumer` binding mode ensures volumes are created only after a pod is scheduled, enabling topology-aware placement.

```bash
kubectl apply -f storageclass-ssd.yaml
kubectl get storageclass
```

## Testing Dynamic Provisioning

Create a PVC and pod to verify TopoLVM provisions volumes correctly.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: topolvm-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: topolvm-ssd
  resources:
    requests:
      storage: 10Gi
---
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: topolvm-test-pod
spec:
  containers:
  - name: test
    image: ubuntu:22.04
    command: ['bash', '-c']
    args:
    - |
      echo "Writing test data"
      dd if=/dev/zero of=/data/testfile bs=1M count=1024
      echo "Test complete"
      sleep infinity
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: topolvm-test
```

Apply and verify provisioning.

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc topolvm-test -w

# PVC should remain Pending until pod is created
kubectl apply -f test-pod.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/topolvm-test-pod --timeout=120s

# Verify PVC is now bound
kubectl get pvc topolvm-test

# Check that logical volume was created on the node
NODE=$(kubectl get pod topolvm-test-pod -o jsonpath='{.spec.nodeName}')
echo "Pod scheduled on: $NODE"

# SSH to node and check LVM
ssh $NODE sudo lvs
ssh $NODE sudo lvs -o lv_name,lv_size,pool_lv,origin | grep topolvm
```

## Implementing Volume Snapshots

TopoLVM supports CSI snapshots using LVM snapshot functionality.

```yaml
# volumesnapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: topolvm-snapshot
driver: topolvm.io
deletionPolicy: Delete
---
# volumesnapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-snapshot
spec:
  volumeSnapshotClassName: topolvm-snapshot
  source:
    persistentVolumeClaimName: topolvm-test
```

Create and verify the snapshot.

```bash
kubectl apply -f volumesnapshotclass.yaml
kubectl apply -f volumesnapshot.yaml

# Check snapshot status
kubectl get volumesnapshot test-snapshot
kubectl describe volumesnapshot test-snapshot

# Restore from snapshot
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: topolvm-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: topolvm-ssd
  dataSource:
    name: test-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 10Gi
EOF

kubectl get pvc topolvm-restored -w
```

## Monitoring Storage Capacity

TopoLVM exposes metrics for monitoring available capacity per node.

```bash
# Check node capacity annotations
kubectl get nodes -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.metadata.annotations["topolvm.io/capacity"])"'

# View detailed capacity per device class
kubectl get nodes -o json | \
  jq -r '.items[] | {
    name: .metadata.name,
    capacity: .metadata.annotations["topolvm.io/capacity"]
  }'
```

Install Prometheus ServiceMonitor to scrape TopoLVM metrics.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: topolvm-node
  namespace: topolvm-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: node
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics include:
- `topolvm_volumegroup_available_bytes`: Available space in volume group
- `topolvm_thinpool_data_percent`: Data usage percentage in thin pool
- `topolvm_thinpool_metadata_percent`: Metadata usage percentage

Alert on high thin pool usage to prevent out-of-space conditions.

## Deploying StatefulSets with TopoLVM

StatefulSets work seamlessly with TopoLVM's topology-aware scheduling.

```yaml
# statefulset-database.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
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
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: topolvm-ssd
      resources:
        requests:
          storage: 50Gi
```

Each StatefulSet replica gets a dedicated thin logical volume, and the scheduler ensures pods are distributed across nodes with sufficient storage capacity.

## Expanding Thin Pools

When thin pools approach capacity, expand the underlying logical volume.

```bash
# On the node, check thin pool usage
sudo lvs -o lv_name,lv_size,data_percent,metadata_percent node-vg/thin-pool

# Extend thin pool if space available in VG
sudo lvextend -L +50G node-vg/thin-pool

# Verify extension
sudo lvs node-vg/thin-pool

# TopoLVM automatically detects the capacity change
# Check updated capacity annotation
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.topolvm\.io/capacity}'
```

For production environments, monitor thin pool data and metadata percentages, extending before they exceed 80% to maintain performance.

TopoLVM brings efficient local storage to Kubernetes through LVM thin provisioning and topology-aware scheduling. By leveraging existing node disks with intelligent capacity tracking, it eliminates the need for expensive SAN infrastructure while providing features like snapshots and dynamic expansion. The combination of thin provisioning and scheduler integration ensures optimal resource utilization across your cluster.

# How to Deploy Ceph with Rook on Bare-Metal Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ceph, Rook, Kubernetes, Storage, Bare Metal, DevOps

Description: Deploy Ceph storage on bare-metal Kubernetes using Rook operator with disk provisioning, cluster configuration, and storage class setup.

---

Running stateful applications on Kubernetes requires persistent storage that can survive pod restarts and node failures. For bare-metal Kubernetes clusters, Ceph provides a powerful distributed storage solution, and Rook makes deploying and managing Ceph on Kubernetes straightforward. This guide walks you through deploying a production-ready Ceph cluster using Rook on bare-metal infrastructure.

## Understanding Rook and Ceph

### What is Ceph?

Ceph is a unified, distributed storage system designed for excellent performance, reliability, and scalability. It provides three storage interfaces:

- **Block Storage (RBD)**: Provides block devices that can be mounted as file systems or used by databases
- **File Storage (CephFS)**: A POSIX-compliant distributed file system
- **Object Storage (RGW)**: S3-compatible object storage

Ceph stores data as objects within logical storage pools, using the CRUSH algorithm to determine which placement groups should contain the data and which OSDs (Object Storage Daemons) should store those placement groups.

### What is Rook?

Rook is a cloud-native storage orchestrator for Kubernetes. It turns distributed storage systems into self-managing, self-scaling, and self-healing storage services. Rook automates:

- Deployment and bootstrapping of storage clusters
- Monitoring the cluster and recovering from failures
- Scaling the cluster as needed
- Upgrading Ceph versions

Rook runs as a Kubernetes operator, watching for custom resources that define your storage cluster configuration and ensuring the actual state matches the desired state.

### Rook Architecture

The Rook operator architecture consists of several components:

- **Rook Operator**: The main controller that watches for CephCluster and other CRDs
- **Ceph Monitors (MON)**: Maintain cluster state and maps
- **Ceph Managers (MGR)**: Provide monitoring and orchestration interfaces
- **Ceph OSDs**: Store the actual data on disks
- **Optional Components**: MDS for CephFS, RGW for object storage

## Prerequisites

Before deploying Rook and Ceph, ensure your environment meets these requirements:

### Hardware Requirements

- **Minimum Nodes**: 3 nodes for a production cluster (for high availability)
- **RAM per Node**: At least 8GB RAM (16GB or more recommended for production)
- **CPU per Node**: At least 4 cores per node
- **Network**: Low-latency network between nodes (1Gbps minimum, 10Gbps recommended)
- **Disks**: At least one dedicated raw disk per node for Ceph OSDs

### Kubernetes Requirements

- Kubernetes version 1.25 or higher
- kubectl configured with cluster admin access
- Helm 3.x installed (optional but recommended)

### Verify your Kubernetes cluster is running and accessible
```bash
kubectl cluster-info
kubectl get nodes -o wide
```

You should see output showing all your nodes in Ready state:

```
NAME       STATUS   ROLES           AGE   VERSION   INTERNAL-IP     EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
node1      Ready    control-plane   10d   v1.28.3   192.168.1.101   <none>        Ubuntu 22.04.3 LTS   5.15.0-88-generic   containerd://1.7.6
node2      Ready    worker          10d   v1.28.3   192.168.1.102   <none>        Ubuntu 22.04.3 LTS   5.15.0-88-generic   containerd://1.7.6
node3      Ready    worker          10d   v1.28.3   192.168.1.103   <none>        Ubuntu 22.04.3 LTS   5.15.0-88-generic   containerd://1.7.6
```

## Node Preparation

Proper node preparation is critical for a successful Ceph deployment. Each node that will run Ceph OSDs needs specific configuration.

### Step 1: Load Required Kernel Modules

Ceph requires the RBD kernel module for block storage. Load it on all nodes.

Run this on each node that will host OSDs:
```bash
# Load the RBD module
sudo modprobe rbd

# Ensure the module loads on boot
echo "rbd" | sudo tee /etc/modules-load.d/rbd.conf
```

### Step 2: Install LVM2

LVM is required for Ceph OSD management.

Install LVM2 on all nodes:
```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y lvm2

# For RHEL/CentOS/Rocky Linux
sudo dnf install -y lvm2
```

### Step 3: Configure Chrony for Time Synchronization

Ceph requires accurate time synchronization across all nodes.

Install and configure chrony:
```bash
# Install chrony
sudo apt-get install -y chrony

# Enable and start chrony
sudo systemctl enable chrony
sudo systemctl start chrony

# Verify time synchronization
chronyc tracking
```

## Disk Preparation

Ceph OSDs require raw, unformatted disks. This section covers how to identify and prepare disks for use by Ceph.

### Identifying Available Disks

List all block devices on each node to identify which disks are available for Ceph.

Run this command on each node to list available disks:
```bash
lsblk -f
```

Example output showing a raw disk (/dev/sdb) ready for Ceph:
```
NAME   FSTYPE LABEL UUID                                 MOUNTPOINT
sda
|-sda1 ext4         8a9c2d1e-5f6g-7h8i-9j0k-1l2m3n4o5p6q /boot
|-sda2 ext4         1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p /
sdb
sdc
```

Disks without a FSTYPE (like sdb and sdc above) are candidates for Ceph.

### Wiping Disks (If Previously Used)

If your disks were previously used, you must completely wipe them before Ceph can use them.

CAUTION: This will destroy all data on the disk. Make sure you select the correct disk!
```bash
# Replace /dev/sdb with your actual disk device
DISK="/dev/sdb"

# Wipe the disk signature
sudo wipefs -a $DISK

# Zero out the first and last 100MB to clear any partition tables or RAID metadata
sudo dd if=/dev/zero of=$DISK bs=1M count=100 oflag=direct,dsync
sudo dd if=/dev/zero of=$DISK bs=1M count=100 seek=$(( $(sudo blockdev --getsz $DISK) / 2048 - 100 )) oflag=direct,dsync

# Remove any device mapper entries
sudo dmsetup remove_all

# Clear any LVM metadata
sudo sgdisk --zap-all $DISK
```

### Verify Disks Are Clean

After wiping, verify the disks are ready for Ceph:
```bash
# Should show no filesystem type
lsblk -f /dev/sdb

# Should show the disk with no partitions
sudo fdisk -l /dev/sdb
```

## Deploying the Rook Operator

Now we'll deploy the Rook operator to your Kubernetes cluster.

### Step 1: Clone the Rook Repository

Clone the Rook repository to get the deployment manifests:
```bash
# Clone the Rook repository
git clone --single-branch --branch v1.13.4 https://github.com/rook/rook.git
cd rook/deploy/examples
```

### Step 2: Deploy the Rook CRDs

Custom Resource Definitions (CRDs) must be created before deploying the operator.

Apply the Rook CRDs:
```bash
kubectl create -f crds.yaml
```

Expected output:
```
customresourcedefinition.apiextensions.k8s.io/cephblockpoolradosnamespaces.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephblockpools.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephbucketnotifications.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephbuckettopics.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephclients.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephclusters.ceph.rook.io created
...
```

### Step 3: Deploy Common Resources

Deploy common resources including the Rook operator namespace, service accounts, and RBAC rules.

Apply common resources:
```bash
kubectl create -f common.yaml
```

### Step 4: Deploy the Rook Operator

Deploy the operator itself:
```bash
kubectl create -f operator.yaml
```

### Step 5: Verify Operator Deployment

Wait for the operator to be ready before proceeding.

Check the operator pod status:
```bash
# Watch the operator pod until it's running
kubectl -n rook-ceph get pod -l app=rook-ceph-operator -w

# Once running, verify the operator logs for any errors
kubectl -n rook-ceph logs -l app=rook-ceph-operator --tail=50
```

Expected output showing the operator is ready:
```
NAME                                  READY   STATUS    RESTARTS   AGE
rook-ceph-operator-6b8b9bc96c-5xvkj   1/1     Running   0          2m
```

## Creating the Ceph Cluster

With the operator running, we can now create our Ceph cluster using the CephCluster CRD.

### Understanding the CephCluster CRD

The CephCluster CRD defines the desired state of your Ceph cluster. Key sections include:

- **mon**: Configuration for Ceph monitors
- **mgr**: Configuration for Ceph managers
- **storage**: Which nodes and devices to use for OSDs
- **placement**: Pod placement rules using node selectors, tolerations, etc.

### Create the CephCluster Manifest

Create a custom CephCluster configuration for bare-metal deployment.

Save this as cluster.yaml:
```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  # The Ceph image to use
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.1
    allowUnsupported: false

  # The path on the host where Ceph data will be stored
  dataDirHostPath: /var/lib/rook

  # Skip upgrade checks (set to false for production)
  skipUpgradeChecks: false

  # Continue if host networking is required but not available
  continueUpgradeAfterChecksEvenIfNotHealthy: false

  # Wait for cleanup job to complete before removing the cluster
  cleanupPolicy:
    confirmation: ""
    sanitizeDisks:
      method: quick
      dataSource: zero
      iteration: 1
    allowUninstallWithVolumes: false

  # Monitor configuration
  mon:
    # Number of monitors (should be odd: 1, 3, or 5)
    count: 3
    # Allow multiple monitors per node (set to false for production)
    allowMultiplePerNode: false
    # Volume claim template for monitor data
    volumeClaimTemplate:
      spec:
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi

  # Manager configuration
  mgr:
    count: 2
    allowMultiplePerNode: false
    modules:
      - name: pg_autoscaler
        enabled: true
      - name: rook
        enabled: true

  # Dashboard configuration
  dashboard:
    enabled: true
    ssl: true

  # Monitoring configuration (for Prometheus integration)
  monitoring:
    enabled: false
    metricsDisabled: false

  # Network configuration
  network:
    connections:
      encryption:
        enabled: false
      compression:
        enabled: false
      requireMsgr2: false

  # Crash collector configuration
  crashCollector:
    disable: false

  # Log collector configuration
  logCollector:
    enabled: true
    periodicity: daily
    maxLogSize: 500M

  # Resource requests and limits for Ceph components
  resources:
    mgr:
      limits:
        memory: "1Gi"
      requests:
        cpu: "500m"
        memory: "512Mi"
    mon:
      limits:
        memory: "2Gi"
      requests:
        cpu: "500m"
        memory: "1Gi"
    osd:
      limits:
        memory: "4Gi"
      requests:
        cpu: "500m"
        memory: "2Gi"

  # Storage configuration - this is where you define which disks to use
  storage:
    # Use all nodes with matching labels
    useAllNodes: false
    # Use all devices on selected nodes
    useAllDevices: false
    # Only use devices matching this filter (regex)
    # deviceFilter: "^sd[b-z]$"

    # Explicitly define nodes and devices
    nodes:
      - name: "node1"
        devices:
          - name: "sdb"
          - name: "sdc"
      - name: "node2"
        devices:
          - name: "sdb"
          - name: "sdc"
      - name: "node3"
        devices:
          - name: "sdb"
          - name: "sdc"

    # OSD configuration
    config:
      osdsPerDevice: "1"
      # Use BlueStore (default and recommended)
      storeType: bluestore

  # Disruption budget settings
  disruptionManagement:
    managePodBudgets: true
    osdMaintenanceTimeout: 30
    pgHealthCheckTimeout: 0

  # Health check settings
  healthCheck:
    daemonHealth:
      mon:
        disabled: false
        interval: 45s
      osd:
        disabled: false
        interval: 60s
      status:
        disabled: false
        interval: 60s
    livenessProbe:
      mon:
        disabled: false
      mgr:
        disabled: false
      osd:
        disabled: false
```

### Alternative: Use All Available Nodes and Devices

For simpler setups, you can let Rook discover all nodes and devices automatically.

Simplified storage configuration that uses all available disks:
```yaml
storage:
  # Use all nodes in the cluster
  useAllNodes: true
  # Use all available devices on each node
  useAllDevices: true
  # Only consider devices with no filesystem
  config:
    osdsPerDevice: "1"
    storeType: bluestore
  # Optional: filter devices by name pattern
  # deviceFilter: "^sd[b-z]$"
```

### Deploy the Ceph Cluster

Apply the cluster configuration:
```bash
kubectl create -f cluster.yaml
```

### Monitor Cluster Creation

Watch the pods as they come up. This process takes several minutes.

Monitor the cluster deployment progress:
```bash
# Watch all pods in the rook-ceph namespace
kubectl -n rook-ceph get pods -w

# Or use a more detailed view
watch -n 5 "kubectl -n rook-ceph get pods -o wide"
```

You'll see pods appear in this order:
1. Monitors (rook-ceph-mon-a, mon-b, mon-c)
2. Managers (rook-ceph-mgr-a, mgr-b)
3. OSDs (rook-ceph-osd-0, osd-1, etc.)

Example output of a healthy cluster:
```
NAME                                              READY   STATUS      RESTARTS   AGE
csi-cephfsplugin-5x7ck                           2/2     Running     0          5m
csi-cephfsplugin-provisioner-7b8fbf88b4-k4r2j    5/5     Running     0          5m
csi-cephfsplugin-provisioner-7b8fbf88b4-n7t9h    5/5     Running     0          5m
csi-rbdplugin-gk4j8                              2/2     Running     0          5m
csi-rbdplugin-provisioner-6b8b9bc96c-5xvkj       5/5     Running     0          5m
csi-rbdplugin-provisioner-6b8b9bc96c-9nlrk       5/5     Running     0          5m
rook-ceph-mgr-a-7d4f8c6b5-9x2k4                  2/2     Running     0          4m
rook-ceph-mgr-b-5c6f7b8a4-3j5h2                  2/2     Running     0          4m
rook-ceph-mon-a-6b8c9d7e5-f4g3h                  2/2     Running     0          5m
rook-ceph-mon-b-5c7d8e6f4-g5h4i                  2/2     Running     0          5m
rook-ceph-mon-c-4b6c7d5e3-h6i5j                  2/2     Running     0          5m
rook-ceph-operator-6b8b9bc96c-5xvkj              1/1     Running     0          10m
rook-ceph-osd-0-7c8d9e6f5-k7l8m                  2/2     Running     0          3m
rook-ceph-osd-1-6b7c8d5e4-l8m9n                  2/2     Running     0          3m
rook-ceph-osd-2-5a6b7c4d3-m9n0o                  2/2     Running     0          3m
rook-ceph-osd-3-4z5a6b3c2-n0o1p                  2/2     Running     0          3m
rook-ceph-osd-4-3y4z5a2b1-o1p2q                  2/2     Running     0          3m
rook-ceph-osd-5-2x3y4z1a0-p2q3r                  2/2     Running     0          3m
```

## Deploying the Rook Toolbox

The Rook toolbox provides CLI access to Ceph commands for administration and troubleshooting.

### Deploy the Toolbox

Create the toolbox deployment:
```bash
kubectl create -f toolbox.yaml
```

Or create a custom toolbox manifest:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph
  labels:
    app: rook-ceph-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rook-ceph-tools
  template:
    metadata:
      labels:
        app: rook-ceph-tools
    spec:
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: rook-ceph-tools
          image: quay.io/ceph/ceph:v18.2.1
          command:
            - /bin/bash
            - -c
            - |
              # Keep the container running
              while true; do sleep 3600; done
          imagePullPolicy: IfNotPresent
          tty: true
          securityContext:
            runAsNonRoot: false
            runAsUser: 0
            runAsGroup: 0
            capabilities:
              drop: ["ALL"]
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
            - name: ROOK_CEPH_SECRET
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-secret
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - name: mon-endpoint-volume
              mountPath: /etc/rook
      volumes:
        - name: ceph-config
          emptyDir: {}
        - name: mon-endpoint-volume
          configMap:
            name: rook-ceph-mon-endpoints
            items:
              - key: data
                path: mon-endpoints
      tolerations:
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 5
```

### Access the Toolbox

Connect to the toolbox pod for Ceph CLI access:
```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Verifying Cluster Health

Once inside the toolbox, verify your Ceph cluster is healthy.

### Check Overall Cluster Status

Run ceph status to see the cluster health:
```bash
ceph status
```

Expected output for a healthy cluster:
```
  cluster:
    id:     a1b2c3d4-e5f6-7890-abcd-ef1234567890
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum a,b,c (age 10m)
    mgr: a(active, since 9m), standbys: b
    osd: 6 osds: 6 up (since 8m), 6 in (since 8m)

  data:
    pools:   1 pools, 1 pgs
    objects: 0 objects, 0 B
    usage:   6.0 GiB used, 594 GiB / 600 GiB avail
    pgs:     1 active+clean
```

### Check OSD Status

Verify all OSDs are up and running:
```bash
ceph osd status
```

Example output:
```
ID  HOST   USED  AVAIL  WR OPS  WR DATA  RD OPS  RD DATA  STATE
 0  node1  1.0G  99.0G      0        0       0        0   exists,up
 1  node1  1.0G  99.0G      0        0       0        0   exists,up
 2  node2  1.0G  99.0G      0        0       0        0   exists,up
 3  node2  1.0G  99.0G      0        0       0        0   exists,up
 4  node3  1.0G  99.0G      0        0       0        0   exists,up
 5  node3  1.0G  99.0G      0        0       0        0   exists,up
```

### Check OSD Tree

View the CRUSH hierarchy:
```bash
ceph osd tree
```

Example output:
```
ID   CLASS  WEIGHT   TYPE NAME       STATUS  REWEIGHT  PRI-AFF
 -1         0.58319  root default
 -3         0.19440      host node1
  0    hdd  0.09720          osd.0       up   1.00000  1.00000
  1    hdd  0.09720          osd.1       up   1.00000  1.00000
 -5         0.19440      host node2
  2    hdd  0.09720          osd.2       up   1.00000  1.00000
  3    hdd  0.09720          osd.3       up   1.00000  1.00000
 -7         0.19440      host node3
  4    hdd  0.09720          osd.4       up   1.00000  1.00000
  5    hdd  0.09720          osd.5       up   1.00000  1.00000
```

### Verify Monitor Quorum

Check that monitors have quorum:
```bash
ceph mon stat
```

Example output:
```
e3: 3 mons at {a=[v2:10.96.142.115:3300/0,v1:10.96.142.115:6789/0],b=[v2:10.96.143.116:3300/0,v1:10.96.143.116:6789/0],c=[v2:10.96.144.117:3300/0,v1:10.96.144.117:6789/0]}, election epoch 12, leader 0 a, quorum 0,1,2 a,b,c
```

## Creating Storage Classes

Storage classes allow Kubernetes workloads to dynamically provision Ceph storage.

### Create a CephBlockPool

First, create a block pool that will be used by the RBD storage class.

Save this as block-pool.yaml:
```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  # Failure domain - host means replicas are placed on different hosts
  failureDomain: host
  # Number of replicas
  replicated:
    size: 3
    requireSafeReplicaSize: true
  # Parameters for the pool
  parameters:
    compression_mode: none
  # Quotas (optional)
  quotas:
    maxSize: ""
    maxObjects: ""
  # Enable mirroring (optional, for disaster recovery)
  mirroring:
    enabled: false
```

Apply the block pool:
```bash
kubectl apply -f block-pool.yaml
```

### Create the RBD StorageClass

Create a storage class for block storage (RBD).

Save this as rbd-storageclass.yaml:
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
  annotations:
    # Set as the default storage class (optional)
    storageclass.kubernetes.io/is-default-class: "true"
# The provisioner matches the driver name from the CSI plugin
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  # ClusterID is the namespace where the Rook cluster is running
  clusterID: rook-ceph
  # Pool to use for the storage class
  pool: replicapool
  # RBD image format
  imageFormat: "2"
  # RBD image features (layering is required for snapshots)
  imageFeatures: layering

  # Secrets contain credentials for provisioning and attaching volumes
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph

  # Filesystem type to use when mounting the volume
  csi.storage.k8s.io/fstype: ext4

# Allow volume expansion
allowVolumeExpansion: true

# Delete the volume when the PVC is deleted
reclaimPolicy: Delete

# WaitForFirstConsumer ensures the volume is created on the same node as the pod
volumeBindingMode: WaitForFirstConsumer
```

Apply the RBD storage class:
```bash
kubectl apply -f rbd-storageclass.yaml
```

### Create CephFilesystem for CephFS

For shared file system storage, create a CephFilesystem.

Save this as filesystem.yaml:
```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  # Metadata pool settings
  metadataPool:
    replicated:
      size: 3
      requireSafeReplicaSize: true
    parameters:
      compression_mode: none

  # Data pools - you can have multiple for different tiers
  dataPools:
    - name: replicated
      failureDomain: host
      replicated:
        size: 3
        requireSafeReplicaSize: true
      parameters:
        compression_mode: none

  # Preserve pools when the filesystem is deleted
  preservePoolsOnDelete: true

  # Metadata server configuration
  metadataServer:
    # Number of active MDS instances
    activeCount: 1
    # Number of standby MDS instances
    activeStandby: true
    # Resource limits and requests
    resources:
      limits:
        memory: "4Gi"
      requests:
        cpu: "500m"
        memory: "1Gi"
    # Priority class for scheduling
    priorityClassName: system-cluster-critical
```

Apply the filesystem:
```bash
kubectl apply -f filesystem.yaml
```

### Create the CephFS StorageClass

Create a storage class for CephFS.

Save this as cephfs-storageclass.yaml:
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  # ClusterID is the namespace where the Rook cluster is running
  clusterID: rook-ceph
  # The CephFS filesystem name
  fsName: myfs
  # The Ceph pool for the filesystem data
  pool: myfs-replicated

  # Secrets for provisioning
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph

# Allow volume expansion
allowVolumeExpansion: true

# Delete policy
reclaimPolicy: Delete

# WaitForFirstConsumer for better scheduling
volumeBindingMode: WaitForFirstConsumer
```

Apply the CephFS storage class:
```bash
kubectl apply -f cephfs-storageclass.yaml
```

### Verify Storage Classes

List all storage classes to confirm they were created:
```bash
kubectl get storageclass
```

Expected output:
```
NAME                        PROVISIONER                     RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
rook-ceph-block (default)   rook-ceph.rbd.csi.ceph.com     Delete          WaitForFirstConsumer   true                   1m
rook-cephfs                 rook-ceph.cephfs.csi.ceph.com   Delete          WaitForFirstConsumer   true                   30s
```

## Testing Storage Provisioning

Let's verify that storage provisioning works correctly.

### Test RBD Block Storage

Create a test PVC using the RBD storage class.

Save this as test-rbd-pvc.yaml:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-rbd-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-ceph-block
---
apiVersion: v1
kind: Pod
metadata:
  name: test-rbd-pod
  namespace: default
spec:
  containers:
    - name: test-container
      image: busybox
      command: ["/bin/sh", "-c", "echo 'Hello from Ceph RBD!' > /mnt/test/hello.txt && cat /mnt/test/hello.txt && sleep 3600"]
      volumeMounts:
        - name: test-volume
          mountPath: /mnt/test
  volumes:
    - name: test-volume
      persistentVolumeClaim:
        claimName: test-rbd-pvc
```

Apply and verify:
```bash
# Create the PVC and pod
kubectl apply -f test-rbd-pvc.yaml

# Wait for the PVC to be bound
kubectl get pvc test-rbd-pvc -w

# Check the pod status
kubectl get pod test-rbd-pod

# Verify the data was written
kubectl logs test-rbd-pod
```

Expected output:
```
Hello from Ceph RBD!
```

### Test CephFS Shared Storage

Create a test deployment using CephFS for shared storage.

Save this as test-cephfs-pvc.yaml:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-cephfs-pvc
  namespace: default
spec:
  accessModes:
    # CephFS supports ReadWriteMany for shared storage
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-cephfs
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-cephfs-deployment
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-cephfs
  template:
    metadata:
      labels:
        app: test-cephfs
    spec:
      containers:
        - name: test-container
          image: busybox
          command: ["/bin/sh", "-c", "echo $(hostname) >> /mnt/shared/hosts.txt && cat /mnt/shared/hosts.txt && sleep 3600"]
          volumeMounts:
            - name: shared-volume
              mountPath: /mnt/shared
      volumes:
        - name: shared-volume
          persistentVolumeClaim:
            claimName: test-cephfs-pvc
```

Apply and verify:
```bash
# Create the PVC and deployment
kubectl apply -f test-cephfs-pvc.yaml

# Wait for pods to be ready
kubectl get pods -l app=test-cephfs -w

# Verify both pods can see each other's writes
kubectl logs -l app=test-cephfs
```

### Cleanup Test Resources

After testing, clean up the test resources:
```bash
kubectl delete -f test-rbd-pvc.yaml
kubectl delete -f test-cephfs-pvc.yaml
```

## Accessing the Ceph Dashboard

Rook deploys a Ceph Dashboard for web-based cluster management.

### Get Dashboard Credentials

Retrieve the admin password for the dashboard:
```bash
# Get the dashboard password
kubectl -n rook-ceph get secret rook-ceph-dashboard-password -o jsonpath="{['data']['password']}" | base64 --decode && echo
```

### Access the Dashboard

Create a port-forward to access the dashboard:
```bash
# Port-forward to the dashboard service
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
```

Open your browser and navigate to `https://localhost:8443`. Log in with:
- Username: `admin`
- Password: (the password retrieved above)

### Alternative: Expose Dashboard via Ingress

For production, expose the dashboard through an Ingress.

Save this as dashboard-ingress.yaml:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-mgr-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: ceph.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rook-ceph-mgr-dashboard
                port:
                  number: 8443
  tls:
    - hosts:
        - ceph.example.com
      secretName: ceph-dashboard-tls
```

## Troubleshooting Common Issues

### OSD Pods Not Starting

If OSD pods fail to start, check these common causes:

Check OSD prepare job logs for disk detection issues:
```bash
# List OSD prepare jobs
kubectl -n rook-ceph get jobs -l app=rook-ceph-osd-prepare

# Check prepare job logs
kubectl -n rook-ceph logs -l app=rook-ceph-osd-prepare --tail=100
```

Common causes and solutions:
- **Disk not clean**: Ensure disks are completely wiped (see Disk Preparation section)
- **LVM not installed**: Install lvm2 on all nodes
- **Permissions issue**: Ensure the rook-ceph pods have access to devices

### Cluster Health Warnings

Check and resolve health warnings:
```bash
# Get detailed health information
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail

# Check for slow requests
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph daemon osd.0 dump_historic_slow_ops
```

### Monitor Quorum Issues

If monitors lose quorum:
```bash
# Check monitor status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat

# Check monitor logs
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=100
```

### CSI Plugin Issues

If volumes fail to provision or attach:
```bash
# Check CSI provisioner logs
kubectl -n rook-ceph logs -l app=csi-rbdplugin-provisioner --tail=100

# Check CSI plugin logs on a specific node
kubectl -n rook-ceph logs -l app=csi-rbdplugin --tail=100
```

## Production Recommendations

For production deployments, consider these additional configurations:

### Enable Monitoring with Prometheus

Enable the monitoring section in your CephCluster CR:
```yaml
monitoring:
  enabled: true
  metricsDisabled: false
```

Then apply ServiceMonitors for Prometheus to scrape Ceph metrics.

### Configure Resource Limits

Set appropriate resource limits based on your workload:
```yaml
resources:
  osd:
    limits:
      cpu: "2"
      memory: "8Gi"
    requests:
      cpu: "1"
      memory: "4Gi"
```

### Enable Network Encryption

For sensitive data, enable network encryption:
```yaml
network:
  connections:
    encryption:
      enabled: true
```

### Set Up Regular Backups

Configure RBD mirroring or use Velero with Ceph snapshots for backup and disaster recovery.

## Conclusion

You have successfully deployed Ceph on bare-metal Kubernetes using Rook. Your cluster now provides:

- **Block storage (RBD)**: High-performance storage for databases and single-pod workloads
- **File storage (CephFS)**: Shared storage for multi-pod access
- **Self-healing**: Automatic recovery from component failures
- **Scalability**: Easy addition of new nodes and storage capacity

As next steps, consider:

1. Setting up monitoring with Prometheus and Grafana
2. Configuring alerting for cluster health issues
3. Implementing a backup strategy using Ceph snapshots
4. Fine-tuning performance based on your workload characteristics
5. Setting up RBD mirroring for disaster recovery

Rook simplifies Ceph operations significantly, but understanding the underlying Ceph concepts will help you troubleshoot issues and optimize performance. The Rook toolbox provides full access to Ceph CLI commands, making it easy to manage your storage cluster directly when needed.

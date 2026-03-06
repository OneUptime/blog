# How to Configure Rook-Ceph on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rook-Ceph, Storage Operator, Kubernetes, Distributed Storage

Description: A detailed guide to configuring Rook-Ceph on Talos Linux including operator tuning, cluster settings, and production best practices.

---

Rook is a storage orchestrator for Kubernetes that turns Ceph into a cloud-native storage service. On Talos Linux, Rook-Ceph is the recommended way to deploy distributed storage because it handles all the complexity of Ceph lifecycle management through Kubernetes-native resources. This guide goes beyond basic setup and focuses on configuration tuning, production settings, and the specific adjustments needed for Talos Linux.

## Talos Linux Prerequisites for Rook-Ceph

Talos Linux is a minimal, immutable operating system. This means some things that Rook-Ceph expects from traditional Linux nodes need explicit configuration.

### Machine Configuration for Rook-Ceph

Apply this machine configuration to all nodes that will participate in the Ceph cluster:

```yaml
machine:
  kernel:
    modules:
      - name: rbd    # Required for Ceph block devices
      - name: ceph   # Ceph kernel module
  kubelet:
    extraMounts:
      # Rook data directory
      - destination: /var/lib/rook
        type: bind
        source: /var/lib/rook
        options:
          - bind
          - rshared
  sysctls:
    # Network tuning for Ceph
    net.core.rmem_max: "8388608"
    net.core.wmem_max: "8388608"
  files:
    # Increase open file limits for Ceph OSD processes
    - content: |
        [Service]
        LimitNOFILE=1048576
      permissions: 0o644
      path: /var/cri/conf.d/rook-limits.conf
```

Apply the configuration to your nodes:

```bash
# Apply to all worker nodes that will run Ceph
talosctl apply-config --nodes 192.168.1.11 --file worker-ceph.yaml
talosctl apply-config --nodes 192.168.1.12 --file worker-ceph.yaml
talosctl apply-config --nodes 192.168.1.13 --file worker-ceph.yaml
```

### Verify Kernel Modules

After applying the config, verify the kernel modules are loaded:

```bash
talosctl get kernelmodules --nodes 192.168.1.11
```

### Verify Available Disks

Check that each node has available disks for Ceph:

```bash
talosctl disks --nodes 192.168.1.11
talosctl disks --nodes 192.168.1.12
talosctl disks --nodes 192.168.1.13
```

Disks intended for Ceph should not be partitioned or configured in the Talos machine config. Leave them raw.

## Installing the Rook Operator

Install the Rook operator with production-appropriate settings:

```bash
# Add Rook Helm repository
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install with custom values
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --values rook-operator-values.yaml
```

Create the values file with Talos-optimized settings:

```yaml
# rook-operator-values.yaml
csi:
  enableRbdDriver: true
  enableCephfsDriver: true
  # Plugin resource limits
  csiRBDPluginResource:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  csiCephFSPluginResource:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  # Enable volume expansion
  enableCSIHostNetwork: true
  # Kubelet directory for Talos
  kubeletDirPath: /var/lib/kubelet

# Operator resource limits
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"

# Enable discovery daemon to find devices
enableDiscoveryDaemon: true
```

## Configuring the Ceph Cluster

Create a CephCluster resource with production-grade settings:

```yaml
# ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2
    allowUnsupported: false

  dataDirHostPath: /var/lib/rook

  # Monitor configuration
  mon:
    count: 3
    allowMultiplePerNode: false
    volumeClaimTemplate:
      spec:
        resources:
          requests:
            storage: 10Gi

  # Manager configuration
  mgr:
    count: 2
    allowMultiplePerNode: false
    modules:
      - name: dashboard
        enabled: true
      - name: prometheus
        enabled: true

  # Dashboard
  dashboard:
    enabled: true
    ssl: true

  # Network configuration
  network:
    provider: host  # Recommended for Talos - better performance

  # Crash collector
  crashCollector:
    disable: false

  # Storage configuration
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "worker-01"
        devices:
          - name: "sdb"
      - name: "worker-02"
        devices:
          - name: "sdb"
      - name: "worker-03"
        devices:
          - name: "sdb"
    config:
      osdsPerDevice: "1"
      # Bluestore tuning
      databaseSizeMB: "1024"
      journalSizeMB: "1024"

  # Resource limits for Ceph daemons
  resources:
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2000m"
        memory: "2Gi"
    osd:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "2000m"
        memory: "4Gi"
    mgr:
      requests:
        cpu: "250m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"

  # Placement constraints
  placement:
    mon:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
    osd:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: node-role.kubernetes.io/worker
                  operator: Exists

  # Health check intervals
  healthCheck:
    daemonHealth:
      mon:
        interval: 45s
      osd:
        interval: 60s
      status:
        interval: 60s
```

Apply the cluster configuration:

```bash
kubectl apply -f ceph-cluster.yaml

# Monitor deployment progress
kubectl -n rook-ceph get pods --watch
```

## Configuring Storage Pools

### Block Pool for General Workloads

```yaml
# block-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: none  # Enable for capacity savings: "aggressive"
```

### Storage Class for Block Storage

```yaml
# block-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten,exclusive-lock
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - discard
```

## Monitoring Rook-Ceph

### Deploy the Toolbox

```bash
kubectl -n rook-ceph apply -f https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/toolbox.yaml
```

### Check Cluster Health

```bash
# Overall cluster status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# OSD status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree

# Pool statistics
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df

# Performance statistics
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

### Prometheus Integration

Rook enables the Prometheus module by default. Configure scraping:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: rook-ceph-mgr
      rook_cluster: rook-ceph
  endpoints:
  - port: http-metrics
    interval: 15s
```

## Troubleshooting on Talos

**OSD pods not starting:**
- Verify disks are available and not partitioned by Talos
- Check that kernel modules are loaded
- Review OSD pod logs: `kubectl -n rook-ceph logs <osd-pod>`

**CSI driver issues:**
- Verify the kubelet directory path matches Talos: `/var/lib/kubelet`
- Check CSI plugin pods: `kubectl -n rook-ceph get pods | grep csi`

**Network connectivity:**
- With `provider: host`, Ceph uses the host network directly
- Verify inter-node connectivity on the Ceph ports (6789, 3300, 6800-7300)

## Summary

Rook-Ceph on Talos Linux requires careful attention to machine configuration (kernel modules, extra mounts, sysctl tuning) and operator settings (kubelet path, CSI driver configuration, network provider). With proper configuration, you get a production-grade distributed storage system that integrates natively with Kubernetes. Monitor cluster health through the Rook toolbox and Prometheus, and plan for at least three nodes with dedicated disks for data resilience.

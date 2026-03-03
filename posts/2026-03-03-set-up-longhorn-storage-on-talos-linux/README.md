# How to Set Up Longhorn Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Longhorn, Kubernetes Storage, Persistent Volumes, CNCF

Description: Deploy Longhorn distributed block storage on Talos Linux for lightweight, replicated persistent volumes in your Kubernetes cluster.

---

Longhorn is a lightweight distributed block storage system built specifically for Kubernetes. Developed by Rancher Labs and now a CNCF incubating project, Longhorn provides replicated storage without the operational complexity of running a full Ceph cluster. For small to medium Talos Linux clusters that need reliable persistent storage, Longhorn offers a compelling balance of simplicity and capability. This guide covers the Talos-specific configuration needed to run Longhorn and walks through the deployment process.

## Why Longhorn on Talos Linux?

Longhorn has several qualities that make it a good fit for Talos environments:

- **Simpler than Ceph** - easier to deploy and operate for teams without deep storage expertise
- **Per-volume replication** - each volume can have its own replication factor
- **Built-in backups** - supports backup to S3-compatible storage
- **Snapshots** - volume snapshots for point-in-time recovery
- **UI dashboard** - web interface for storage management
- **Incremental backups** - efficient backup of changed data only

The trade-off compared to Ceph is that Longhorn only provides block storage (no file or object storage), and it may not scale as well for very large clusters.

## Talos Machine Configuration for Longhorn

Longhorn needs some specific settings on Talos nodes. Here is the machine configuration:

```yaml
machine:
  kernel:
    modules:
      - name: iscsi_tcp  # Required for Longhorn
      - name: dm_crypt   # For encrypted volumes
  kubelet:
    extraMounts:
      # Longhorn data directory
      - destination: /var/lib/longhorn
        type: bind
        source: /var/lib/longhorn
        options:
          - bind
          - rshared
  sysctls:
    # Recommended for Longhorn
    vm.max_map_count: "262144"
```

Apply this to all worker nodes:

```bash
talosctl apply-config --nodes 192.168.1.11 --file worker-longhorn.yaml
talosctl apply-config --nodes 192.168.1.12 --file worker-longhorn.yaml
talosctl apply-config --nodes 192.168.1.13 --file worker-longhorn.yaml
```

## Preparing Storage for Longhorn

Longhorn can use either a directory on the existing filesystem or a dedicated disk. For production, a dedicated disk is recommended.

### Option 1: Using the EPHEMERAL Partition (Development)

For development clusters, Longhorn can store data on the existing EPHEMERAL partition:

```yaml
# No extra disk configuration needed
# Longhorn will use /var/lib/longhorn on the EPHEMERAL partition
```

This is simple but not recommended for production because Longhorn data competes with container images and other Kubernetes data for space.

### Option 2: Dedicated Disk (Production)

Configure a dedicated disk for Longhorn in your Talos machine config:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/longhorn
          size: 0  # Use entire disk
```

This gives Longhorn its own disk with isolated I/O.

## Installing Longhorn

### Using Helm

```bash
# Add the Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install Longhorn
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --values longhorn-values.yaml
```

### Helm Values for Talos

Create a values file with Talos-appropriate settings:

```yaml
# longhorn-values.yaml
defaultSettings:
  # Default data path on Talos nodes
  defaultDataPath: /var/lib/longhorn
  # Default replica count
  defaultReplicaCount: 3
  # Storage over-provisioning percentage
  storageOverProvisioningPercentage: 100
  # Storage minimal available percentage
  storageMinimalAvailablePercentage: 15
  # Default data locality
  defaultDataLocality: best-effort
  # Create default disk on nodes
  createDefaultDiskLabeledNodes: true
  # Node drain policy
  nodeDrainPolicy: block-for-eviction
  # Guaranteed instance manager CPU
  guaranteedInstanceManagerCPU: 12

persistence:
  # Default storage class
  defaultClass: true
  defaultClassReplicaCount: 3
  defaultFsType: ext4

# Resource limits
longhornManager:
  resources:
    requests:
      cpu: 250m
      memory: 256Mi

longhornDriver:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi

# Enable the UI
longhornUI:
  replicas: 2
```

### Wait for Deployment

```bash
# Watch pods come up
kubectl -n longhorn-system get pods --watch

# Check that all components are running
kubectl -n longhorn-system get pods
```

You should see the Longhorn manager, driver deployer, UI, CSI components, and instance managers all running.

## Configuring the Default Storage Class

Longhorn creates a default storage class during installation. Verify it:

```bash
kubectl get storageclass
```

You should see the `longhorn` storage class. If you need to customize it:

```yaml
# custom-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: "ext4"
  dataLocality: "best-effort"
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Testing Longhorn

Create a test workload to verify storage is working:

```yaml
# test-longhorn.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: longhorn-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: longhorn-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "echo 'Longhorn works on Talos!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: longhorn-test
```

```bash
kubectl apply -f test-longhorn.yaml

# Check PVC is bound
kubectl get pvc longhorn-test

# Check pod output
kubectl logs longhorn-test
```

## Configuring Backups

Longhorn supports automated backups to S3-compatible storage:

```yaml
# Create backup target secret
apiVersion: v1
kind: Secret
metadata:
  name: s3-backup-secret
  namespace: longhorn-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_ENDPOINTS: "https://s3.amazonaws.com"
```

Configure the backup target in Longhorn settings:

```bash
# Set backup target through Longhorn settings
kubectl -n longhorn-system patch settings.longhorn.io backup-target \
  --type merge -p '{"value": "s3://my-backup-bucket@us-east-1/"}'

kubectl -n longhorn-system patch settings.longhorn.io backup-target-credential-secret \
  --type merge -p '{"value": "s3-backup-secret"}'
```

## Accessing the Longhorn UI

Expose the Longhorn UI for management:

```bash
# Port forward to access the UI
kubectl -n longhorn-system port-forward svc/longhorn-frontend 8080:80
```

Then open `http://localhost:8080` in your browser.

For production access, create an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ui
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: longhorn-basic-auth
spec:
  rules:
  - host: longhorn.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: longhorn-frontend
            port:
              number: 80
```

## Monitoring Longhorn

Longhorn exposes Prometheus metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
  - port: manager
    interval: 30s
```

Key metrics to watch:
- `longhorn_volume_actual_size_bytes` - actual disk usage per volume
- `longhorn_node_storage_capacity_bytes` - total storage on each node
- `longhorn_node_storage_usage_bytes` - used storage on each node
- `longhorn_volume_state` - volume health state

## Troubleshooting on Talos

**Instance manager pods failing:**
- Verify the `iscsi_tcp` module is loaded: `talosctl get kernelmodules --nodes <ip>`
- Check Longhorn manager logs: `kubectl -n longhorn-system logs -l app=longhorn-manager`

**Volumes stuck in attaching state:**
- Check that the kubelet extra mount is configured correctly
- Verify node connectivity between Longhorn instance managers

**Storage capacity not detected:**
- Confirm the Longhorn data path exists and is mounted
- Check disk permissions and available space

## Summary

Longhorn on Talos Linux provides a straightforward path to distributed block storage for Kubernetes. The setup requires Talos-specific configuration (kernel modules, kubelet mounts, dedicated disk) but the deployment itself is a standard Helm install. Longhorn's built-in backup support, snapshot capabilities, and web UI make it an excellent choice for teams that want reliable persistent storage without the operational overhead of Ceph. Start with the Helm deployment, verify with a test workload, configure backups, and monitor through Prometheus.

# How to Set Up Longhorn Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Longhorn, Kubernetes Storage, Persistent Volume, CNCF

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

Longhorn needs `iscsiadm` and `nsenter` on each node, plus the `iscsi_tcp` kernel module. Talos ships a minimal immutable image with neither of those binaries nor that module, so you cannot load them by adding entries under `machine.kernel.modules`. Instead, you bake two official system extensions into the Talos installer image:

- `siderolabs/iscsi-tools` - provides `iscsiadm` and the `iscsi_tcp` kernel module
- `siderolabs/util-linux-tools` - provides `nsenter`, required by Longhorn v1.5 and later

System extensions are layered into the root filesystem at install/upgrade time via a custom image produced by the Talos [Image Factory](https://factory.talos.dev/). See the official Talos docs on [system extensions](https://www.talos.dev/latest/talos-guides/configuration/system-extensions/) and the [Image Factory](https://www.talos.dev/latest/learn-more/image-factory/) for background.

### Build a Talos installer with the required extensions

Submit a schematic describing the extensions you want:

```bash
cat > longhorn-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
EOF

SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @longhorn-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

# Installer image for machine configs and upgrades
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:v1.9.0"

# Boot assets (ISO, PXE, disk images) are available under the same schematic ID
# https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.9.0/metal-amd64.iso
```

Pin the Talos version (`v1.9.0` above) to whatever your cluster runs.

### Machine config

Reference the factory installer and add the kubelet mount Longhorn needs. This matches the worker patch Sidero uses in the Talos Longhorn integration tests ([`hack/test/patches/longhorn.yaml`](https://github.com/siderolabs/talos/blob/release-1.10/hack/test/patches/longhorn.yaml)):

```yaml
machine:
  install:
    image: factory.talos.dev/installer/<SCHEMATIC_ID>:v1.9.0
  kubelet:
    extraMounts:
      - destination: /var/lib/longhorn
        type: bind
        source: /var/lib/longhorn
        options:
          - bind
          - rshared
          - rw
```

### Extra config for the Longhorn v2 data engine (optional)

The default Longhorn v1 engine only needs the two extensions above. If you plan to enable the v2 data engine (`defaultSettings.v2DataEngine: true`), which uses SPDK over NVMe-over-TCP, also add the v2 engine prerequisites from the Longhorn docs: 2 GiB of 2 MiB hugepages and the `nvme_tcp`, `vfio_pci`, `uio_pci_generic` kernel modules (these ship in the default Talos kernel, so no extension is needed):

```yaml
machine:
  sysctls:
    vm.nr_hugepages: "1024"
  kernel:
    modules:
      - name: nvme_tcp
      - name: vfio_pci
      - name: uio_pci_generic
```

### Apply to worker nodes

For a fresh install, boot each node from the factory ISO and apply the config. For a running cluster, apply the config and run an upgrade pointed at the factory installer so the extensions get layered in:

```bash
for node in 192.168.1.11 192.168.1.12 192.168.1.13; do
  talosctl apply-config --nodes $node --file worker-longhorn.yaml
  talosctl -n $node upgrade \
    --image factory.talos.dev/installer/<SCHEMATIC_ID>:v1.9.0
  talosctl -n $node health
done
```

Verify the extensions are present after the node comes back:

```bash
talosctl -n 192.168.1.11 get extensions
# Expect iscsi-tools and util-linux-tools in the output
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
- Confirm both extensions are installed: `talosctl -n <ip> get extensions` should list `iscsi-tools` and `util-linux-tools`
- Verify the `iscsi_tcp` module is loaded: `talosctl -n <ip> read /proc/modules | grep iscsi`
- Check Longhorn manager logs: `kubectl -n longhorn-system logs -l app=longhorn-manager`

**Volumes stuck in attaching state:**
- Check that the kubelet extra mount is configured correctly
- Verify node connectivity between Longhorn instance managers

**Storage capacity not detected:**
- Confirm the Longhorn data path exists and is mounted
- Check disk permissions and available space

## Summary

Longhorn on Talos Linux provides a straightforward path to distributed block storage for Kubernetes. The setup requires Talos-specific configuration (the `iscsi-tools` and `util-linux-tools` system extensions baked in via the Image Factory, plus kubelet mounts and an optional dedicated disk), but the deployment itself is a standard Helm install. Longhorn's built-in backup support, snapshot capabilities, and web UI make it an excellent choice for teams that want reliable persistent storage without the operational overhead of Ceph. Start with the Helm deployment, verify with a test workload, configure backups, and monitor through Prometheus.

# How to Set Up OpenEBS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OpenEBS, Kubernetes Storage, Container Attached Storage, CNCF

Description: Deploy OpenEBS container-attached storage on Talos Linux for flexible, performant persistent volumes in your Kubernetes cluster.

---

OpenEBS is a container-attached storage (CAS) solution for Kubernetes that provides per-workload storage engines. Unlike traditional distributed storage systems that run as a separate cluster, OpenEBS runs entirely within Kubernetes using containers. This fits well with the Talos Linux philosophy of keeping everything Kubernetes-native. This guide walks through deploying OpenEBS on Talos Linux, covering the different storage engines and the Talos-specific configuration needed.

## OpenEBS Storage Engines

OpenEBS provides several storage engines, each suited for different use cases:

- **Mayastor** - high-performance NVMe-oF based replicated storage (recommended for production)
- **cStor** - replicated block storage using ZFS
- **Jiva** - replicated block storage using iSCSI
- **Local PV Hostpath** - local storage using node directories
- **Local PV Device** - local storage using raw block devices
- **Local PV ZFS** - local storage with ZFS features

For Talos Linux, Mayastor and Local PV are the most commonly used engines.

## Talos Machine Configuration for OpenEBS

Depending on which engine you plan to use, the Talos configuration varies:

### For Mayastor (Replicated Storage)

```yaml
machine:
  kernel:
    modules:
      - name: nvme_tcp       # Required for NVMe over TCP
      - name: nvme_core      # NVMe core module
      - name: nvme_fabrics   # NVMe fabrics support
  kubelet:
    extraMounts:
      - destination: /var/local/openebs
        type: bind
        source: /var/local/openebs
        options:
          - bind
          - rshared
  sysctls:
    # HugePages for Mayastor (required)
    vm.nr_hugepages: "1024"
```

### For Local PV

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/openebs/local
        type: bind
        source: /var/openebs/local
        options:
          - bind
          - rshared
```

Apply the configuration:

```bash
# Apply to worker nodes
for node in 192.168.1.11 192.168.1.12 192.168.1.13; do
  talosctl apply-config --nodes "$node" --file worker-openebs.yaml
done
```

## Installing OpenEBS with Helm

### Install the OpenEBS Operator

```bash
# Add the OpenEBS Helm repository
helm repo add openebs https://openebs.github.io/openebs
helm repo update

# Install OpenEBS
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace \
  --values openebs-values.yaml
```

### Helm Values for Talos

```yaml
# openebs-values.yaml
# Enable only the engines you need
mayastor:
  enabled: true
  etcd:
    replicaCount: 3
  agents:
    node:
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "2000m"
          memory: "2Gi"
    core:
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"

localProvisioner:
  enabled: true
  basePath: /var/openebs/local
  hostpathClass:
    enabled: true
    name: openebs-hostpath
    isDefaultClass: false

# Jiva and cStor disabled for Talos (require additional dependencies)
jivaOperator:
  enabled: false
cstor:
  enabled: false
```

### Wait for Deployment

```bash
# Watch pods come up
kubectl -n openebs get pods --watch

# Verify all components are running
kubectl -n openebs get pods
```

## Setting Up Mayastor Pools

Mayastor needs disk pools to allocate storage from. Create a pool on each node:

```yaml
# mayastor-pool.yaml
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-01
  namespace: openebs
spec:
  node: worker-01
  disks:
    - "aio:///dev/sdb"  # Dedicated disk for Mayastor
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-02
  namespace: openebs
spec:
  node: worker-02
  disks:
    - "aio:///dev/sdb"
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-03
  namespace: openebs
spec:
  node: worker-03
  disks:
    - "aio:///dev/sdb"
```

```bash
kubectl apply -f mayastor-pool.yaml

# Check pool status
kubectl -n openebs get diskpools
```

## Creating Storage Classes

### Mayastor Replicated Storage Class

```yaml
# mayastor-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-replicated
provisioner: io.openebs.csi-mayastor
parameters:
  protocol: nvmf
  repl: "3"
  ioTimeout: "30"
  local: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

### Local PV Storage Class

```yaml
# local-pv-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-local
provisioner: openebs.io/local
parameters:
  hostpath: /var/openebs/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f mayastor-storageclass.yaml
kubectl apply -f local-pv-storageclass.yaml
```

## Testing OpenEBS

### Test Mayastor Volume

```yaml
# test-mayastor.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mayastor-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: mayastor-replicated
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: mayastor-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "dd if=/dev/urandom of=/data/testfile bs=1M count=100 && ls -la /data/ && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: mayastor-test
```

```bash
kubectl apply -f test-mayastor.yaml

# Check PVC is bound
kubectl get pvc mayastor-test

# Check pod status
kubectl get pod mayastor-test

# Verify the write succeeded
kubectl logs mayastor-test
```

### Test Local PV

```yaml
# test-local-pv.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-pv-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: openebs-local
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: local-pv-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "echo 'Local PV works!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: local-pv-test
```

## Performance Tuning

### Mayastor Performance

Mayastor uses SPDK (Storage Performance Development Kit) and NVMe-oF for high performance. For best results:

1. Use NVMe disks as the backing storage
2. Ensure HugePages are configured (already done in machine config)
3. Dedicate CPU cores to Mayastor if possible
4. Use 10 GbE or faster networking between nodes

### Local PV Performance

Local PV provides the best possible performance since there is no network replication:

1. Use dedicated disks mounted at the OpenEBS base path
2. Consider NVMe for latency-sensitive workloads
3. Be aware that data locality means no failover

## Monitoring OpenEBS

### Check Mayastor Volume Replicas

```bash
# List all Mayastor volumes
kubectl -n openebs get mayastorvolumes

# Check replica status
kubectl -n openebs get mayastorvolumes -o yaml
```

### Prometheus Metrics

OpenEBS exposes metrics for monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: openebs
  namespace: openebs
spec:
  selector:
    matchLabels:
      app: openebs
  endpoints:
  - port: metrics
    interval: 30s
```

## Troubleshooting on Talos

**Mayastor pods failing to start:**
- Verify HugePages are configured: check `vm.nr_hugepages` sysctl
- Ensure NVMe kernel modules are loaded
- Check that dedicated disks are available and not partitioned by Talos

**Local PV provisioning failures:**
- Verify the base path directory exists on the node
- Check that the kubelet extra mount is configured
- Ensure sufficient disk space on the target path

**NVMe-oF connection issues:**
- Verify `nvme_tcp` module is loaded
- Check network connectivity between nodes
- Verify firewall rules allow NVMe-oF ports

```bash
# Check module status
talosctl get kernelmodules --nodes 192.168.1.11

# Check OpenEBS agent logs
kubectl -n openebs logs -l app=openebs-agent-core
```

## Summary

OpenEBS on Talos Linux provides flexible storage options ranging from high-performance replicated Mayastor volumes to simple local PV storage. The container-attached storage model fits naturally with Talos's Kubernetes-centric design. Key setup requirements include kernel modules (NVMe for Mayastor, iSCSI for Jiva), HugePages configuration, and dedicated disks for storage pools. Start with Local PV for simple use cases and graduate to Mayastor when you need replicated storage with high performance.

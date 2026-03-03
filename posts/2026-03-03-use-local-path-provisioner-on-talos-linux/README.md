# How to Use Local Path Provisioner on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Local Path Provisioner, Kubernetes Storage, Persistent Volumes, Rancher

Description: Set up Rancher's Local Path Provisioner on Talos Linux for simple, node-local persistent volumes with dynamic provisioning.

---

Not every Kubernetes workload needs distributed, replicated storage. Sometimes you just need a directory on the node where a pod is running - for local caches, single-replica databases, or development environments. The Local Path Provisioner, originally developed by Rancher, provides exactly this: dynamic provisioning of persistent volumes backed by local node storage. On Talos Linux, it is one of the simplest storage solutions to deploy. This guide covers setup, configuration, and the trade-offs of using local storage.

## What is the Local Path Provisioner?

The Local Path Provisioner is a Kubernetes dynamic volume provisioner that creates persistent volumes using local directories on nodes. When a PVC requests storage from the local-path storage class, the provisioner:

1. Identifies a node where the pod will be scheduled
2. Creates a directory on that node
3. Binds a PV to that directory
4. The pod mounts the directory as its persistent volume

There is no data replication, no distributed storage layer, and no network overhead. The pod reads and writes directly to the local filesystem.

## When to Use Local Path Provisioner

Good use cases:
- **Development and testing** - quick, simple persistent storage
- **Single-replica databases** - where the application handles its own replication (MySQL with replicas, MongoDB replica sets)
- **Local caches** - temporary storage that can be rebuilt
- **CI/CD** - build artifacts and workspace storage
- **Monitoring data** - Prometheus and other metrics stores that can tolerate data loss on node failure

Not ideal for:
- **Production data that cannot be lost** - there is no replication
- **Applications that need ReadWriteMany** - local volumes are ReadWriteOnce
- **Workloads that might migrate between nodes** - data stays on the original node

## Talos Machine Configuration

Local Path Provisioner needs a base directory on each node. Configure this in the Talos machine config:

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/local-path-provisioner
        type: bind
        source: /var/local-path-provisioner
        options:
          - bind
          - rshared
```

For nodes with a dedicated disk for local storage:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/local-path-provisioner
          size: 0  # Use entire disk
  kubelet:
    extraMounts:
      - destination: /var/local-path-provisioner
        type: bind
        source: /var/local-path-provisioner
        options:
          - bind
          - rshared
```

Apply to your worker nodes:

```bash
for node in 192.168.1.11 192.168.1.12 192.168.1.13; do
  talosctl apply-config --nodes "$node" --file worker-local-path.yaml
done
```

## Installing Local Path Provisioner

### Using kubectl

```bash
# Deploy the Local Path Provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

### Using Helm

```bash
helm repo add local-path-provisioner https://rancher.github.io/local-path-provisioner/
helm repo update

helm install local-path-provisioner local-path-provisioner/local-path-provisioner \
  --namespace local-path-storage \
  --create-namespace \
  --values local-path-values.yaml
```

### Helm Values for Talos

```yaml
# local-path-values.yaml
storageClass:
  name: local-path
  defaultClass: false  # Set to true if this is your only storage class
  reclaimPolicy: Delete

nodePathMap:
  - node: DEFAULT_PATH_FOR_NON_LISTED_NODES
    paths:
      - /var/local-path-provisioner

# Resource limits
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 128Mi

# Tolerations for running on all nodes
tolerations:
  - operator: Exists
```

## Configuring the Storage Class

The default installation creates a `local-path` storage class. You can customize it:

```yaml
# custom-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  nodePath: /var/local-path-provisioner
```

The `volumeBindingMode: WaitForFirstConsumer` is critical. It delays volume creation until a pod actually needs it, which ensures the volume is created on the same node where the pod runs.

## Testing the Provisioner

Create a test PVC and pod:

```yaml
# test-local-path.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-path-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: local-path-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "echo 'Local path works!' > /data/test.txt && cat /data/test.txt && df -h /data && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: local-path-test
```

```bash
kubectl apply -f test-local-path.yaml

# Check PVC status
kubectl get pvc local-path-test

# Check pod output
kubectl logs local-path-test
```

The PVC will show as Bound, and the pod will successfully write to the local storage.

## Node-Specific Storage Paths

You can configure different paths for different nodes:

```yaml
# configmap for custom paths
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: local-path-storage
data:
  config.json: |-
    {
      "nodePathMap": [
        {
          "node": "worker-01",
          "paths": ["/var/local-path-provisioner/ssd"]
        },
        {
          "node": "worker-02",
          "paths": ["/var/local-path-provisioner/nvme"]
        },
        {
          "node": "DEFAULT_PATH_FOR_NON_LISTED_NODES",
          "paths": ["/var/local-path-provisioner"]
        }
      ]
    }
```

This lets you direct different nodes to use different storage devices based on their hardware.

## Using Multiple Storage Classes

Create different storage classes for different tiers:

```yaml
# Fast local storage (NVMe-backed nodes)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-fast
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  nodePath: /var/local-path-provisioner/fast
---
# Standard local storage (SSD-backed nodes)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-standard
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  nodePath: /var/local-path-provisioner/standard
```

## Node Affinity and Scheduling

Since local path volumes are tied to specific nodes, workloads using them develop node affinity. Once a volume is created on a node, the pod must always run on that node:

```yaml
# StatefulSet with local path storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  serviceName: database
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: db
        image: postgres:16
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: local-path
      resources:
        requests:
          storage: 10Gi
```

Each replica will get its own local volume on the node where it is scheduled.

## Monitoring Storage Usage

Local path volumes share the node's filesystem, so monitor at the node level:

```bash
# Check disk usage on nodes
kubectl top nodes

# Check specific volume sizes
kubectl get pv -o wide
```

Set up Prometheus alerts for filesystem capacity:

```yaml
# Alert when local path storage is running low
- alert: LocalPathStorageLow
  expr: |
    (1 - node_filesystem_avail_bytes{mountpoint="/var/local-path-provisioner"}
    / node_filesystem_size_bytes{mountpoint="/var/local-path-provisioner"}) > 0.85
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Local path storage on {{ $labels.instance }} is over 85% full"
```

## Cleanup and Reclaim

When you delete a PVC with `reclaimPolicy: Delete`, the Local Path Provisioner removes the directory:

```bash
# Delete a PVC
kubectl delete pvc local-path-test

# The PV and data directory are automatically cleaned up
```

For `reclaimPolicy: Retain`, the data persists after PVC deletion. You must manually clean up:

```bash
# Find orphaned PVs
kubectl get pv | grep Released
```

## Troubleshooting

**PVC stuck in Pending:**
- Check that the provisioner pod is running: `kubectl -n local-path-storage get pods`
- Verify the base path exists on the node
- Check provisioner logs: `kubectl -n local-path-storage logs -l app=local-path-provisioner`

**Permission denied errors:**
- Verify the kubelet extra mount is configured correctly in Talos
- Check directory permissions on the base path

**Volume not created on expected node:**
- `WaitForFirstConsumer` binding mode means the volume is created where the pod is scheduled
- Check pod scheduling constraints that might affect node selection

## Summary

The Local Path Provisioner is the simplest way to add dynamic persistent volume provisioning to a Talos Linux cluster. It requires minimal setup - just a base directory on each node and the provisioner deployment. While it lacks the replication and fault tolerance of distributed storage systems, it provides excellent performance and zero operational complexity for workloads that can tolerate node-local storage. Configure it alongside a distributed storage solution to offer both simple local storage and replicated storage options in your cluster.

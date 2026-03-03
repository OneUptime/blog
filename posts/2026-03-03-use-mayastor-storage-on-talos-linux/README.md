# How to Use Mayastor Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Mayastor, Kubernetes, Storage, NVMe, Distributed Storage

Description: Deploy and configure Mayastor NVMe-based distributed storage on your Talos Linux cluster for high-performance persistent volumes.

---

Mayastor is a high-performance distributed storage engine for Kubernetes that leverages NVMe over Fabrics (NVMe-oF) to deliver near-native disk performance for containerized workloads. Developed as part of the OpenEBS project, Mayastor is designed to run in user space using the Storage Performance Development Kit (SPDK), which bypasses the kernel's block layer for lower latency and higher throughput.

On Talos Linux, Mayastor is a compelling choice when you need the performance of local storage with the data protection of replication. This guide covers deploying and using Mayastor on a Talos Linux cluster.

## Prerequisites

Mayastor has specific hardware and software requirements:

- At least 3 worker nodes with NVMe or fast SSD drives
- Each node should have at least 1GB of HugePages memory available
- CPUs that support SSE4.2 instructions (most modern processors do)
- Talos Linux configured with the required kernel parameters
- A minimum of 4 CPU cores per node dedicated to Mayastor

Check your hardware compatibility:

```bash
# Verify NVMe devices on your Talos nodes
talosctl disks --nodes <worker-ip>

# Check CPU feature support
talosctl read /proc/cpuinfo --nodes <worker-ip> | grep sse4_2
```

## Preparing Talos Linux for Mayastor

Mayastor requires HugePages and specific kernel modules. Create a machine config patch:

```yaml
# mayastor-patch.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
  sysctls:
    vm.nr_hugepages: "1024"
    net.core.optmem_max: "40960"
    net.core.rmem_default: "262144"
    net.core.rmem_max: "4194304"
    net.core.wmem_default: "262144"
    net.core.wmem_max: "4194304"
  kernel:
    modules:
      - name: nvme_tcp
      - name: nvme_core
      - name: nvme_fabrics
  kubelet:
    extraMounts:
      - destination: /var/local/mayastor
        type: bind
        source: /var/local/mayastor
        options:
          - bind
          - rshared
          - rw
```

Apply to all worker nodes:

```bash
# Apply the patch to each worker
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @mayastor-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @mayastor-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @mayastor-patch.yaml
```

Verify HugePages are allocated:

```bash
# Check HugePages on a node
talosctl read /proc/meminfo --nodes <worker-ip> | grep HugePages
```

## Labeling Nodes for Mayastor

Label the nodes that will participate in the Mayastor storage pool:

```bash
# Label nodes for Mayastor
kubectl label node worker-1 openebs.io/engine=mayastor
kubectl label node worker-2 openebs.io/engine=mayastor
kubectl label node worker-3 openebs.io/engine=mayastor
```

## Installing Mayastor

Deploy Mayastor using Helm:

```bash
# Add the OpenEBS Helm repository
helm repo add openebs https://openebs.github.io/mayastor-extensions
helm repo update
```

Create a values file:

```yaml
# mayastor-values.yaml
base:
  tag: v2.5.0

agents:
  core:
    resources:
      requests:
        cpu: 500m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 512Mi

io_engine:
  # Number of CPU cores to dedicate to each I/O engine pod
  cpuCount: 2
  resources:
    requests:
      cpu: "2"
      memory: 1Gi
      hugepages-2Mi: 2Gi
    limits:
      cpu: "2"
      memory: 1Gi
      hugepages-2Mi: 2Gi
  nodeSelector:
    openebs.io/engine: mayastor

csi:
  node:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi

etcd:
  replicaCount: 3
  persistence:
    storageClass: "local-path"
    size: 2Gi

loki:
  enabled: false

obs:
  callhome:
    enabled: false
```

```bash
# Install Mayastor
helm install mayastor openebs/mayastor \
  --namespace mayastor \
  --create-namespace \
  -f mayastor-values.yaml

# Watch the pods come up (this takes a few minutes)
kubectl -n mayastor get pods -w
```

## Creating Disk Pools

Once Mayastor is running, create disk pools on each node. You need to identify the raw disk devices on your nodes:

```bash
# List available disks on a node
talosctl disks --nodes <worker-1-ip>
```

```yaml
# disk-pool-1.yaml
apiVersion: "openebs.io/v1beta2"
kind: DiskPool
metadata:
  name: pool-worker-1
  namespace: mayastor
spec:
  node: worker-1
  disks:
    - "aio:///dev/sdb"  # Adjust to your disk device
---
apiVersion: "openebs.io/v1beta2"
kind: DiskPool
metadata:
  name: pool-worker-2
  namespace: mayastor
spec:
  node: worker-2
  disks:
    - "aio:///dev/sdb"
---
apiVersion: "openebs.io/v1beta2"
kind: DiskPool
metadata:
  name: pool-worker-3
  namespace: mayastor
spec:
  node: worker-3
  disks:
    - "aio:///dev/sdb"
```

```bash
# Create the disk pools
kubectl apply -f disk-pool-1.yaml

# Verify pools are online
kubectl -n mayastor get diskpools

# Check pool capacity
kubectl -n mayastor get diskpools -o wide
```

## Creating StorageClasses

Create StorageClasses for different replication levels:

```yaml
# mayastor-sc-replicated.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-3
provisioner: io.openebs.csi-mayastor
parameters:
  protocol: nvmf
  repl_count: "3"
  ioTimeout: "60"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
---
# Single replica for non-critical workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-1
provisioner: io.openebs.csi-mayastor
parameters:
  protocol: nvmf
  repl_count: "1"
  ioTimeout: "60"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

```bash
kubectl apply -f mayastor-sc-replicated.yaml
```

## Using Mayastor Storage

Deploy a workload using Mayastor:

```yaml
# postgres-mayastor.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: mayastor-3
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
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
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              value: "changeme"
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: mayastor-3
        resources:
          requests:
            storage: 50Gi
```

```bash
kubectl create namespace databases
kubectl apply -f postgres-mayastor.yaml

# Verify the PVC is bound
kubectl get pvc -n databases

# Check the Mayastor volume
kubectl -n mayastor get volumes
```

## Monitoring Mayastor

```bash
# Check volume status
kubectl -n mayastor get volumes -o wide

# Check replica status
kubectl -n mayastor get volumes -o json | jq '.items[].status'

# Check disk pool usage
kubectl -n mayastor get diskpools -o wide

# View Mayastor agent logs
kubectl -n mayastor logs deploy/agent-core --tail=50

# View I/O engine logs on a specific node
kubectl -n mayastor logs -l app=io-engine --field-selector spec.nodeName=worker-1 --tail=50
```

## Performance Testing

Run a benchmark to validate Mayastor performance:

```yaml
# fio-benchmark.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fio-bench
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: mayastor-3
---
apiVersion: v1
kind: Pod
metadata:
  name: fio-benchmark
  namespace: default
spec:
  containers:
    - name: fio
      image: nixery.dev/fio
      command:
        - fio
        - --name=benchtest
        - --size=1G
        - --filename=/data/test
        - --direct=1
        - --rw=randrw
        - --ioengine=libaio
        - --bs=4k
        - --iodepth=32
        - --numjobs=4
        - --time_based
        - --runtime=60
        - --group_reporting
      volumeMounts:
        - name: data
          mountPath: /data
  restartPolicy: Never
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: fio-bench
```

```bash
kubectl apply -f fio-benchmark.yaml
kubectl logs fio-benchmark -f
```

## Troubleshooting

```bash
# Check if all I/O engine pods are running
kubectl -n mayastor get pods -l app=io-engine

# Verify HugePages are available
kubectl -n mayastor describe pod -l app=io-engine | grep hugepages

# Check for NVMe-oF connectivity issues
kubectl -n mayastor logs -l app=io-engine --tail=100 | grep -i error

# Restart a specific component if needed
kubectl -n mayastor rollout restart deployment agent-core
```

## Summary

Mayastor brings NVMe-level performance to distributed storage on Talos Linux. By running in user space with SPDK and using NVMe over Fabrics for data replication, it achieves significantly lower latency than traditional distributed storage systems. The setup on Talos Linux requires careful preparation with HugePages, kernel modules, and proper disk allocation, but the performance payoff makes it worthwhile for workloads like databases, message queues, and other latency-sensitive applications. If your Talos Linux cluster has NVMe drives and you need both speed and redundancy, Mayastor is a strong contender.

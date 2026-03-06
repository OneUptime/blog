# How to Deploy OpenEBS with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, openebs, kubernetes, storage, gitops, container-attached storage, cstor, mayastor

Description: A comprehensive guide to deploying OpenEBS container-attached storage on Kubernetes using Flux CD for GitOps-based storage management.

---

## Introduction

OpenEBS is a leading open-source container-attached storage (CAS) solution for Kubernetes. It provides multiple storage engines including Mayastor (high-performance NVMe-based), cStor (feature-rich), and LocalPV (for local persistent volumes). OpenEBS turns available storage on Kubernetes worker nodes into local or distributed persistent volumes.

This guide walks through deploying OpenEBS with Flux CD, covering both the LocalPV and Mayastor storage engines for different use cases.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- For Mayastor: nodes with NVMe-capable disks and HugePages enabled
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```
clusters/
  my-cluster/
    storage/
      openebs/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        storageclasses.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/storage/openebs/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openebs
  labels:
    app.kubernetes.io/name: openebs
    app.kubernetes.io/part-of: openebs
```

## Step 2: Add the OpenEBS Helm Repository

```yaml
# clusters/my-cluster/storage/openebs/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: openebs
  namespace: openebs
spec:
  interval: 1h
  # Official OpenEBS Helm chart repository
  url: https://openebs.github.io/openebs
```

## Step 3: Deploy OpenEBS via HelmRelease

```yaml
# clusters/my-cluster/storage/openebs/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: openebs
  namespace: openebs
spec:
  interval: 30m
  chart:
    spec:
      chart: openebs
      version: "4.0.x"
      sourceRef:
        kind: HelmRepository
        name: openebs
        namespace: openebs
  timeout: 15m
  values:
    # Enable LocalPV hostpath provisioner
    localpv-provisioner:
      enabled: true
      hostpathClass:
        # Set as default storage class for simple local volumes
        isDefaultClass: false
        basePath: /var/openebs/local
      deviceClass:
        enabled: true
    # Enable Mayastor for high-performance replicated storage
    mayastor:
      enabled: true
      csi:
        node:
          # Topology-aware volume scheduling
          topology:
            nodeSelector: true
      etcd:
        # Replicas for the etcd cluster used by Mayastor
        replicaCount: 3
        persistence:
          enabled: true
          size: 2Gi
      io_engine:
        # Resource configuration for the IO engine
        resources:
          requests:
            cpu: "1"
            memory: 1Gi
            hugepages-2Mi: 2Gi
          limits:
            cpu: "2"
            memory: 2Gi
            hugepages-2Mi: 2Gi
        # Target nodes for IO engine deployment
        nodeSelector: {}
    # Disable legacy engines if not needed
    cstor:
      enabled: false
    jiva:
      enabled: false
```

## Step 4: Configure HugePages for Mayastor

Mayastor requires HugePages on the worker nodes. Create a DaemonSet to configure them.

```yaml
# clusters/my-cluster/storage/openebs/hugepages-setup.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: hugepages-setup
  namespace: openebs
  labels:
    app: hugepages-setup
spec:
  selector:
    matchLabels:
      app: hugepages-setup
  template:
    metadata:
      labels:
        app: hugepages-setup
    spec:
      # Run on all nodes that will host Mayastor
      hostPID: true
      containers:
        - name: hugepages
          image: busybox:1.36
          # Allocate 1024 HugePages of 2MB each
          command:
            - sh
            - -c
            - |
              echo 1024 > /proc/sys/vm/nr_hugepages
              sleep infinity
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
```

## Step 5: Create Storage Classes

```yaml
# clusters/my-cluster/storage/openebs/storageclasses.yaml
# LocalPV HostPath - best for single-node workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-hostpath
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
    # Description for clarity
    openebs.io/cas-type: local
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
# Mayastor Replicated - best for production workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-replicated
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
parameters:
  # Replicate data across 3 nodes for high availability
  repl: "3"
  # Thin provisioning to optimize space usage
  thin: "true"
  # Protocol for data replication
  protocol: nvmf
  # IO timeout in seconds
  ioTimeout: "30"
provisioner: io.openebs.csi-mayastor
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Mayastor Single Replica - for development/testing
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-single
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
parameters:
  repl: "1"
  thin: "true"
  protocol: nvmf
provisioner: io.openebs.csi-mayastor
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Step 6: Configure Mayastor Disk Pools

Define disk pools on each node for Mayastor to use.

```yaml
# clusters/my-cluster/storage/openebs/diskpools.yaml
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-1
  namespace: openebs
spec:
  # Node where the disk pool will be created
  node: worker-1
  disks:
    # Use the raw block device path
    - uring:///dev/sdb
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-2
  namespace: openebs
spec:
  node: worker-2
  disks:
    - uring:///dev/sdb
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-worker-3
  namespace: openebs
spec:
  node: worker-3
  disks:
    - uring:///dev/sdb
```

## Step 7: Create the Kustomization

```yaml
# clusters/my-cluster/storage/openebs/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - hugepages-setup.yaml
  - storageclasses.yaml
  - diskpools.yaml
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/my-cluster/storage/openebs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: openebs
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/storage/openebs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: openebs
      namespace: openebs
  timeout: 20m
```

## Step 9: Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations openebs

# Check the HelmRelease
flux get helmreleases -n openebs

# Verify all OpenEBS pods are running
kubectl get pods -n openebs

# Check Mayastor disk pools
kubectl get diskpools -n openebs

# Verify storage classes
kubectl get storageclass

# Check Mayastor nodes
kubectl get msn -n openebs
```

## Step 10: Test Storage Provisioning

```yaml
# test-openebs.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-mayastor-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  # Use the replicated Mayastor storage class
  storageClassName: mayastor-replicated
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-openebs-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-openebs
  template:
    metadata:
      labels:
        app: test-openebs
    spec:
      containers:
        - name: fio
          image: nixery.dev/fio
          command: ["sleep", "3600"]
          volumeMounts:
            - mountPath: /data
              name: mayastor-volume
      volumes:
        - name: mayastor-volume
          persistentVolumeClaim:
            claimName: test-mayastor-pvc
```

## Performance Testing

Run a quick FIO benchmark to test storage performance:

```bash
# Execute FIO benchmark inside the test pod
kubectl exec -it deploy/test-openebs-app -- fio \
  --name=randwrite \
  --ioengine=libaio \
  --direct=1 \
  --bs=4k \
  --iodepth=32 \
  --size=1G \
  --numjobs=4 \
  --rw=randwrite \
  --filename=/data/test.fio \
  --group_reporting
```

## Troubleshooting

1. **Mayastor pods not starting**: Verify HugePages are allocated with `cat /proc/meminfo | grep HugePages` on each node.

2. **DiskPool creation fails**: Ensure the specified disk is available, unformatted, and not mounted. Check with `lsblk` on the node.

3. **Volume provisioning hangs**: Check that disk pools have sufficient capacity and that the Mayastor control plane is healthy.

```bash
# Check Mayastor control plane logs
kubectl logs -n openebs -l app=api-rest --tail=100

# Check IO engine logs on a specific node
kubectl logs -n openebs -l app=io-engine --tail=100

# Verify disk pool capacity
kubectl get diskpools -n openebs -o wide
```

## Conclusion

You have successfully deployed OpenEBS on Kubernetes using Flux CD. With Mayastor providing high-performance NVMe-based replicated storage and LocalPV available for simpler use cases, you have a flexible storage platform managed entirely through GitOps. All configuration changes can be tracked, reviewed, and rolled back through your Git repository.

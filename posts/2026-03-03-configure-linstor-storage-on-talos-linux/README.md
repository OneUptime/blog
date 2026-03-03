# How to Configure LINSTOR Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, LINSTOR, Kubernetes, Storage, DRBD, Distributed Storage

Description: Deploy and configure LINSTOR with DRBD-based distributed storage on your Talos Linux Kubernetes cluster for reliable persistent volumes.

---

LINSTOR is a storage management system built on top of DRBD (Distributed Replicated Block Device), a battle-tested Linux kernel module for synchronous block-level replication. LINSTOR adds a management layer that integrates with Kubernetes through a CSI driver, giving you automatically provisioned, replicated block storage. On Talos Linux, LINSTOR is a solid choice for teams that value data consistency and want a storage system with decades of proven reliability behind it.

This guide walks through deploying LINSTOR on Talos Linux, from preparing nodes to creating storage classes and deploying workloads.

## Prerequisites

Before starting:

- A Talos Linux cluster with at least 3 worker nodes
- Each worker should have a dedicated disk or partition for LINSTOR storage
- The DRBD kernel module available (through Talos system extensions)
- Helm and kubectl configured for your cluster

## Preparing Talos Linux for LINSTOR

LINSTOR requires the DRBD kernel module and a few other components. Create a machine config patch:

```yaml
# linstor-patch.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/drbd:9.2.6-v1.6.0
  kernel:
    modules:
      - name: drbd
        parameters:
          - usermode_helper=disabled
      - name: drbd_transport_tcp
  kubelet:
    extraMounts:
      - destination: /var/lib/linstor
        type: bind
        source: /var/lib/linstor
        options:
          - bind
          - rshared
          - rw
```

Apply the patch to your worker nodes:

```bash
# Apply to each worker node
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @linstor-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @linstor-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @linstor-patch.yaml

# Verify DRBD module is loaded
talosctl dmesg --nodes <worker-1-ip> | grep drbd
```

## Installing the Piraeus Operator

Piraeus is the Kubernetes operator for LINSTOR. It handles deployment and lifecycle management of the LINSTOR components:

```bash
# Add the Piraeus Helm repository
helm repo add piraeus-charts https://piraeus.io/helm-charts/
helm repo update
```

Create a values file for the operator:

```yaml
# piraeus-operator-values.yaml
operator:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
```

```bash
# Install the Piraeus operator
helm install piraeus-op piraeus-charts/piraeus-operator \
  --namespace piraeus-system \
  --create-namespace \
  -f piraeus-operator-values.yaml

# Wait for the operator to be ready
kubectl -n piraeus-system rollout status deployment piraeus-operator
```

## Deploying the LINSTOR Cluster

Create a LinstorCluster resource to deploy the actual storage components:

```yaml
# linstor-cluster.yaml
apiVersion: piraeus.io/v1
kind: LinstorCluster
metadata:
  name: linstorcluster
spec:
  repository: quay.io/piraeusdatastore
  linstorPassphraseSecret: linstor-passphrase
  patches:
    - target:
        kind: DaemonSet
        name: linstor-csi-node
      patch: |
        apiVersion: apps/v1
        kind: DaemonSet
        metadata:
          name: linstor-csi-node
        spec:
          template:
            spec:
              containers:
                - name: linstor-csi
                  resources:
                    requests:
                      cpu: 100m
                      memory: 128Mi
    - target:
        kind: Deployment
        name: linstor-controller
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: linstor-controller
        spec:
          template:
            spec:
              containers:
                - name: linstor-controller
                  resources:
                    requests:
                      cpu: 500m
                      memory: 512Mi
                    limits:
                      cpu: "1"
                      memory: 1Gi
```

Create the passphrase secret and apply:

```bash
# Create a passphrase secret for LINSTOR encryption support
kubectl -n piraeus-system create secret generic linstor-passphrase \
  --from-literal=MASTER_PASSPHRASE=$(openssl rand -base64 32)

# Deploy the LINSTOR cluster
kubectl apply -f linstor-cluster.yaml

# Watch the components come up
kubectl -n piraeus-system get pods -w
```

## Configuring Storage Pools

Create storage pools on each node. LINSTOR supports different storage backends:

```yaml
# linstor-satellite-config.yaml
apiVersion: piraeus.io/v1
kind: LinstorSatelliteConfiguration
metadata:
  name: storage-configuration
spec:
  storagePools:
    - name: pool-ssd
      fileThinPool:
        directory: /var/lib/linstor/thin-pool
    # Or for a raw device:
    # - name: pool-nvme
    #   lvmThinPool:
    #     volumeGroup: linstor_vg
    #     thinPool: thinpool
```

For using a dedicated disk as an LVM thin pool:

```yaml
# linstor-lvm-satellite.yaml
apiVersion: piraeus.io/v1
kind: LinstorSatelliteConfiguration
metadata:
  name: lvm-storage
spec:
  storagePools:
    - name: lvm-pool
      lvmThinPool:
        volumeGroup: linstor_vg
        thinPool: thinpool
  patches:
    - target:
        kind: DaemonSet
        name: "*satellite*"
      patch: |
        apiVersion: apps/v1
        kind: DaemonSet
        metadata:
          name: placeholder
        spec:
          template:
            spec:
              initContainers:
                - name: setup-lvm
                  image: quay.io/piraeusdatastore/piraeus-server:latest
                  command:
                    - /bin/sh
                    - -c
                    - |
                      if ! vgs linstor_vg; then
                        pvcreate /dev/sdb
                        vgcreate linstor_vg /dev/sdb
                        lvcreate -l 90%FREE -T linstor_vg/thinpool
                      fi
                  securityContext:
                    privileged: true
                  volumeMounts:
                    - name: dev
                      mountPath: /dev
```

```bash
# Apply the storage pool configuration
kubectl apply -f linstor-satellite-config.yaml

# Verify storage pools
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor storage-pool list
```

## Creating StorageClasses

Define StorageClasses for your LINSTOR pools:

```yaml
# linstor-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: linstor-ssd-r2
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: linstor.csi.linbit.com
parameters:
  linstor.csi.linbit.com/storagePool: pool-ssd
  linstor.csi.linbit.com/placementCount: "2"
  linstor.csi.linbit.com/autoPlace: "2"
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: linstor-ssd-r3
provisioner: linstor.csi.linbit.com
parameters:
  linstor.csi.linbit.com/storagePool: pool-ssd
  linstor.csi.linbit.com/placementCount: "3"
  linstor.csi.linbit.com/autoPlace: "3"
  csi.storage.k8s.io/fstype: xfs
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f linstor-storageclass.yaml
```

## Using LINSTOR Storage

Deploy a workload with LINSTOR storage:

```yaml
# mysql-linstor.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 30Gi
  storageClassName: linstor-ssd-r2
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              value: "changeme"
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-data
```

```bash
kubectl create namespace databases
kubectl apply -f mysql-linstor.yaml
kubectl get pvc -n databases
```

## Monitoring LINSTOR

```bash
# Check LINSTOR node status
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor node list

# Check resource status
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor resource list-volumes

# Check storage pool usage
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor storage-pool list

# Check DRBD connection status
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor resource list
```

## Volume Snapshots

LINSTOR supports CSI snapshots:

```yaml
# linstor-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: linstor-snapshot
driver: linstor.csi.linbit.com
deletionPolicy: Delete
```

```yaml
# create-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot
  namespace: databases
spec:
  volumeSnapshotClassName: linstor-snapshot
  source:
    persistentVolumeClaimName: mysql-data
```

## Troubleshooting

```bash
# Check LINSTOR controller logs
kubectl -n piraeus-system logs deploy/linstor-controller --tail=100

# Check satellite (node agent) logs
kubectl -n piraeus-system logs ds/linstor-satellite --tail=100

# Check DRBD status on a node
kubectl -n piraeus-system exec ds/linstor-satellite -- drbdsetup status

# Check CSI driver logs
kubectl -n piraeus-system logs ds/linstor-csi-node -c linstor-csi --tail=100

# View LINSTOR error log
kubectl -n piraeus-system exec deploy/linstor-controller -- linstor error-report list
```

## Summary

LINSTOR with DRBD provides a proven, high-performance distributed storage solution for Talos Linux. The synchronous replication at the block level ensures strong consistency, which makes it well-suited for databases and other write-heavy workloads. Through the Piraeus operator, deployment and management on Kubernetes are straightforward. The setup on Talos Linux requires the DRBD system extension, but once configured, LINSTOR integrates cleanly through its CSI driver and standard StorageClasses. For teams that want battle-tested storage technology with modern Kubernetes integration, LINSTOR is a strong option.

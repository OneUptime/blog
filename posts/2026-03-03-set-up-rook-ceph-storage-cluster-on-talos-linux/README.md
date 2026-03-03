# How to Set Up Rook-Ceph Storage Cluster on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rook-Ceph, Kubernetes, Storage, Distributed Storage, Ceph

Description: Complete walkthrough for deploying a Rook-Ceph distributed storage cluster on Talos Linux with block, filesystem, and object storage.

---

Running stateful workloads on Kubernetes requires reliable persistent storage, and Rook-Ceph is one of the most mature solutions available. Rook deploys and manages Ceph clusters inside Kubernetes, giving you block storage, shared filesystems, and S3-compatible object storage all from the same system. On Talos Linux, setting up Rook-Ceph requires some specific configuration because of the operating system's immutable design, but once running, it provides enterprise-grade storage for your cluster.

This guide walks through the complete process of deploying Rook-Ceph on Talos Linux.

## Prerequisites

Before starting, you need:

- A Talos Linux cluster with at least 3 worker nodes (for proper Ceph replication)
- Each worker node should have at least one raw, unformatted disk dedicated to Ceph
- At least 4GB of RAM per node for Ceph OSD processes
- kubectl and Helm configured for your cluster

Verify your cluster is ready:

```bash
# Check node status
kubectl get nodes

# Verify the raw disks are available on worker nodes
talosctl disks --nodes <worker-ip>
```

## Preparing Talos Linux for Rook-Ceph

Talos Linux requires specific machine configuration patches to support Rook-Ceph. The key changes are enabling certain kernel modules and allowing Ceph to use the required host paths.

Create a machine config patch:

```yaml
# rook-ceph-patch.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/rook-ceph:v0.1.0
  files:
    - content: |
        [plugins."io.containerd.grpc.v1.cri"]
          enable_unprivileged_ports = true
          enable_unprivileged_icmp = true
      path: /etc/cri/conf.d/20-customization.part
      op: create
  kubelet:
    extraMounts:
      - destination: /var/lib/rook
        type: bind
        source: /var/lib/rook
        options:
          - bind
          - rshared
          - rw
```

Apply the patch to your worker nodes:

```bash
# Apply the patch to each worker node
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @rook-ceph-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @rook-ceph-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @rook-ceph-patch.yaml
```

## Installing the Rook Operator

Deploy the Rook operator using Helm:

```bash
# Add the Rook Helm repository
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install the Rook operator
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableRbdDriver=true \
  --set csi.enableCephfsDriver=true

# Wait for the operator to be ready
kubectl -n rook-ceph rollout status deployment rook-ceph-operator
```

Verify the operator is running:

```bash
# Check operator pods
kubectl get pods -n rook-ceph

# You should see:
# rook-ceph-operator-xxxx    Running
```

## Creating the Ceph Cluster

Now create the CephCluster resource. This tells Rook how to configure Ceph on your Talos nodes:

```yaml
# ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.1
    allowUnsupported: false
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
    allowMultiplePerNode: false
    modules:
      - name: pg_autoscaler
        enabled: true
      - name: rook
        enabled: true
  dashboard:
    enabled: true
    ssl: true
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: "sdb"  # Adjust to match your raw disk device names
    config:
      osdsPerDevice: "1"
  resources:
    mgr:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        memory: 1Gi
    mon:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 2Gi
    osd:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        memory: 4Gi
  placement:
    all:
      tolerations:
        - effect: NoSchedule
          key: storage-node
          operator: Exists
  network:
    provider: host
  healthCheck:
    daemonHealth:
      mon:
        interval: 45s
      osd:
        interval: 60s
    livenessProbe:
      mon:
        probe:
          initialDelaySeconds: 30
      mgr:
        probe:
          initialDelaySeconds: 30
      osd:
        probe:
          initialDelaySeconds: 30
```

Apply the cluster configuration:

```bash
# Create the Ceph cluster
kubectl apply -f ceph-cluster.yaml

# Watch the cluster come up (this takes several minutes)
kubectl -n rook-ceph get pods -w
```

## Monitoring Cluster Health

Check the health of your Ceph cluster:

```bash
# Use the Rook toolbox to run Ceph commands
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Check OSD status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status

# Check available storage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

If you do not have the toolbox deployed, create it:

```yaml
# toolbox.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph
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
      containers:
        - name: rook-ceph-tools
          image: quay.io/ceph/ceph:v18.2.1
          command:
            - /bin/bash
            - -c
            - |
              # Keep the toolbox running
              while true; do sleep 600; done
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
      volumes:
        - name: ceph-config
          projected:
            sources:
              - configMap:
                  name: rook-ceph-mon-endpoints
                  items:
                    - key: data
                      path: mon-endpoints
              - secret:
                  name: rook-ceph-mon
```

## Creating Storage Classes

With the cluster running, create storage classes for different use cases:

```yaml
# block-storage-class.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
# Apply the storage classes
kubectl apply -f block-storage-class.yaml
```

## Accessing the Ceph Dashboard

Rook deploys a Ceph dashboard that you can access through a port forward:

```bash
# Get the dashboard password
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 -d

# Port forward to the dashboard
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 7000:7000

# Open https://localhost:7000 in your browser
# Username: admin, Password: from the command above
```

## Testing Storage

Create a test PVC to verify everything works:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ceph-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: ceph-block
```

```bash
# Create the test PVC
kubectl apply -f test-pvc.yaml

# Verify it is bound
kubectl get pvc test-ceph-pvc

# Clean up
kubectl delete pvc test-ceph-pvc
```

## Summary

Setting up Rook-Ceph on Talos Linux requires preparing the nodes with the right machine configuration patches, deploying the Rook operator, and then creating the CephCluster resource. Once running, you get a fully distributed storage system that provides block, filesystem, and object storage through Kubernetes-native storage classes. The initial setup takes some effort, but the result is a production-grade storage layer that scales with your cluster and handles node failures gracefully.

# How to Set Up an External Ceph Cluster with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, External Cluster, Kubernetes, Storage

Description: Learn how to connect Rook to an existing external Ceph cluster, export credentials, and provision storage from Kubernetes without running Ceph inside it.

---

## What Is an External Ceph Cluster

An external Ceph cluster setup allows Rook to manage Kubernetes storage integration (CSI drivers, StorageClasses, PVC provisioning) while the actual Ceph daemons (MON, OSD, MDS, MGR, RGW) run outside Kubernetes on a separate dedicated Ceph cluster.

This is useful when:
- You already have a large Ceph cluster managed by cephadm or the Ceph dashboard
- You want to share one Ceph cluster across multiple Kubernetes clusters
- You want to separate storage infrastructure from Kubernetes lifecycle

## Architecture

```text
+------------------+          +------------------------+
|   Kubernetes     |          |  External Ceph Cluster |
|                  |          |                        |
|  Rook Operator   +--------> |  MON  OSD  MGR  MDS   |
|  CSI Drivers     |  Ceph    |  (cephadm managed)     |
|  StorageClasses  |  API     |                        |
|  PVCs            |          +------------------------+
+------------------+
```

## Step 1: Export Credentials from the External Ceph Cluster

On the external Ceph cluster, use Rook's script to export the required credentials:

```bash
# On the external Ceph cluster, download and run the import script
curl -O https://raw.githubusercontent.com/rook/rook/master/deploy/examples/create-external-cluster-resources.py

python3 create-external-cluster-resources.py \
  --ceph-conf /etc/ceph/ceph.conf \
  --keyring /etc/ceph/ceph.client.admin.keyring \
  --namespace rook-ceph \
  --format bash \
  --rbd-data-pool-name replicapool \
  --cephfs-filesystem-name myfs \
  --output /tmp/external-cluster-env.sh
```

This script creates:
- A restricted Ceph user with only the permissions Rook needs
- Exports the MON endpoints, user keys, and pool information

## Step 2: Review the Exported Environment Variables

```bash
# The script generates a file with environment variable exports
cat /tmp/external-cluster-env.sh
```

```bash
export ROOK_EXTERNAL_FSID=<cluster-fsid>
export ROOK_EXTERNAL_USERNAME=client.healthchecker
export ROOK_EXTERNAL_CEPH_MON_DATA="a=192.168.1.10:6789"
export ROOK_EXTERNAL_USER_SECRET=<base64-key>
export CSI_RBD_NODE_SECRET=<base64-key>
export CSI_RBD_NODE_SECRET_NAME=<ceph-username>
export CSI_RBD_PROVISIONER_SECRET=<base64-key>
export CSI_RBD_PROVISIONER_SECRET_NAME=<ceph-username>
export CSI_CEPHFS_NODE_SECRET=<base64-key>
export CSI_CEPHFS_NODE_SECRET_NAME=<ceph-username>
export CSI_CEPHFS_PROVISIONER_SECRET=<base64-key>
export CSI_CEPHFS_PROVISIONER_SECRET_NAME=<ceph-username>
export MONITORING_ENDPOINT=<ip-address>
export MONITORING_ENDPOINT_PORT=<port>
export RBD_POOL_NAME=replicapool
export RGW_POOL_PREFIX=default
```

## Step 3: Apply the Credentials to Kubernetes

```bash
# On the Kubernetes cluster, first download the Rook import scripts
curl -O https://raw.githubusercontent.com/rook/rook/master/deploy/examples/common-external.yaml
curl -O https://raw.githubusercontent.com/rook/rook/master/deploy/examples/import-external-cluster.sh

# Apply the common external resources (RBAC, ServiceAccounts)
kubectl apply -f common-external.yaml

# Source the exported environment variables from Step 1
source /tmp/external-cluster-env.sh

# Run the import script to create Kubernetes Secrets and ConfigMaps
bash import-external-cluster.sh
```

## Step 4: Deploy the External CephCluster CRD

```yaml
# cluster-external.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph-external
  namespace: rook-ceph
spec:
  external:
    enable: true
  crashCollector:
    disable: true
```

```bash
kubectl apply -f cluster-external.yaml

# Check the cluster status
kubectl -n rook-ceph get cephcluster
```

```text
NAME                  DATADIRHOSTPATH   MONCOUNT   AGE   PHASE       MESSAGE
rook-ceph-external                                 3m    Connected   Cluster connected successfully
```

## Step 5: Create StorageClasses

With the external cluster connected, create StorageClasses pointing to external pools:

```yaml
# storageclass-rbd-external.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-external
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f storageclass-rbd-external.yaml

# Test with a PVC
kubectl apply -f pvc-test.yaml
kubectl get pvc
```

## Monitoring the External Connection

```bash
# Check Rook operator logs for external connection status
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i external

# Check CSI pod status
kubectl -n rook-ceph get pods | grep csi

# Verify connectivity to external MONs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Updating MON Endpoints

If the external Ceph cluster's monitor addresses change:

```bash
# Update the ConfigMap with new MON endpoints
kubectl -n rook-ceph edit configmap rook-ceph-mon-endpoints
# Update the "data" field with new mon addresses

# Restart CSI pods to pick up new endpoints
kubectl -n rook-ceph rollout restart deploy/csi-rbdplugin-provisioner
kubectl -n rook-ceph rollout restart deploy/csi-cephfsplugin-provisioner
```

## Summary

Connecting Rook to an external Ceph cluster uses the `create-external-cluster-resources.py` script to export restricted credentials and MON endpoints, which are applied as Kubernetes Secrets. The `CephCluster` CRD is created with `external.enable: true` instead of managing Ceph daemons inside Kubernetes. This pattern allows multiple Kubernetes clusters to share a single large Ceph storage cluster managed independently by cephadm or another Ceph orchestration tool.

# How to Use Ceph with containerd for Kubernetes Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Containerd, Kubernetes, CSI, Storage

Description: Configure Ceph storage for Kubernetes clusters using containerd as the container runtime, including CSI driver setup and StorageClass configuration with Rook.

---

containerd is the default container runtime for modern Kubernetes distributions. When running Rook-Ceph alongside containerd, the Ceph CSI drivers communicate with containerd through the kubelet to provision and attach persistent volumes.

## How Rook Works with containerd

The Ceph CSI drivers (ceph-csi) use the Kubernetes CSI interface, which interacts with the kubelet. The kubelet then communicates with containerd via the Container Runtime Interface (CRI). This means Ceph storage works transparently with containerd without any special configuration beyond what Rook provides.

## Verify containerd is the Runtime

Confirm your Kubernetes cluster uses containerd:

```bash
kubectl get nodes -o wide | grep -i container-runtime

# Or check directly on a node
kubectl debug node/node1 -it --image=ubuntu -- \
  chroot /host crictl version
```

## Install the Ceph CSI Drivers

Rook automatically deploys the CSI drivers. Verify they are running:

```bash
kubectl -n rook-ceph get pods -l app=csi-rbdplugin
kubectl -n rook-ceph get pods -l app=csi-cephfsplugin
```

Check CSI driver node registrations:

```bash
kubectl get csinodes
```

## Create a StorageClass for RBD

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
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
mountOptions:
- discard
```

## Create a PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 10Gi
```

Apply and verify:

```bash
kubectl apply -f pvc.yaml
kubectl get pvc myapp-data
kubectl describe pvc myapp-data | grep -E "Status|Volume|StorageClass"
```

## Configure containerd for Ceph RBD Kernel Module

Ensure the `rbd` kernel module is loaded on all nodes:

```bash
# On each node
modprobe rbd
echo "rbd" >> /etc/modules-load.d/rbd.conf
```

Or deploy a DaemonSet that loads the module:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: rbd-module-loader
spec:
  selector:
    matchLabels:
      name: rbd-module-loader
  template:
    metadata:
      labels:
        name: rbd-module-loader
    spec:
      initContainers:
      - name: modprobe
        image: alpine:3.18
        command: ["modprobe", "rbd"]
        securityContext:
          privileged: true
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Troubleshoot CSI with containerd

If volume attachment fails, check the CSI node plugin logs:

```bash
kubectl -n rook-ceph logs -l app=csi-rbdplugin -c csi-rbdplugin --tail=100
kubectl -n rook-ceph logs -l app=csi-rbdplugin -c driver-registrar --tail=50
```

## Summary

Ceph with containerd in Kubernetes is fully supported through Rook's CSI drivers, which communicate with containerd via the standard CRI interface. The only host-level prerequisite is that the `rbd` kernel module is loaded on nodes that will use RBD volumes. Create StorageClasses using the CSI provisioner name and reference the Rook-created secrets for authentication.

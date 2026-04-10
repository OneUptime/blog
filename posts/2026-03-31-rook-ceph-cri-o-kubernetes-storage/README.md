# How to Use Ceph with CRI-O for Kubernetes Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRI-O, Kubernetes, CSI, OpenShift

Description: Configure Rook-Ceph storage for Kubernetes clusters running CRI-O as the container runtime, including CSI driver verification and StorageClass setup for OpenShift deployments.

---

CRI-O is the container runtime used by default in OpenShift and is supported by standard Kubernetes deployments. Rook-Ceph works with CRI-O through the same CSI interface used with other runtimes, but there are OpenShift-specific considerations for security contexts.

## Verify CRI-O as the Runtime

Check if your nodes use CRI-O:

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
```

Output will show `cri-o://X.Y.Z` for CRI-O nodes.

## Install Rook on CRI-O / OpenShift

For OpenShift, deploy the Rook operator using the OpenShift-specific manifests, which include the required Security Context Constraints:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/common.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/operator-openshift.yaml
```

## Verify CSI Drivers with CRI-O

Check that CSI node plugins started on CRI-O nodes:

```bash
kubectl -n rook-ceph get pods -l app=csi-rbdplugin -o wide
kubectl -n rook-ceph get pods -l app=csi-cephfsplugin -o wide
```

Verify CSI socket paths work with CRI-O:

```bash
kubectl -n rook-ceph exec -it <csi-rbdplugin-pod> -- \
  ls /var/lib/kubelet/plugins/rook-ceph.rbd.csi.ceph.com/
```

## Create StorageClasses for CRI-O Clusters

RBD StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
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
reclaimPolicy: Delete
allowVolumeExpansion: true
```

CephFS StorageClass for ReadWriteMany workloads:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## OpenShift Security Context

When running on OpenShift, Ceph pods need additional SCC permissions:

```bash
oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-system

oc adm policy add-scc-to-user anyuid \
  system:serviceaccount:rook-ceph:rook-ceph-default
```

## Load the RBD Kernel Module

Ensure the RBD module is loaded on all CRI-O nodes:

```bash
# On each node
modprobe rbd

# Verify
lsmod | grep rbd
```

## Summary

Rook-Ceph works with CRI-O through the same CSI interface as containerd, making it fully compatible with OpenShift and other CRI-O based distributions. The key differences are the need to apply OpenShift-specific Security Context Constraints before Rook deployment and ensuring the `rbd` kernel module is loaded on all nodes that will host RBD volumes.

# How to Deploy Rook-Ceph on OpenShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenShift, Kubernetes, Storage

Description: Learn how to deploy Rook-Ceph on OpenShift with the required SCCs, namespace setup, and CephCluster configuration for persistent storage.

---

## OpenShift vs Standard Kubernetes

Deploying Rook-Ceph on OpenShift requires additional configuration compared to vanilla Kubernetes because OpenShift enforces Security Context Constraints (SCCs) that restrict pod privileges by default. Rook-Ceph daemons need elevated privileges to manage storage hardware.

Key differences on OpenShift:
- SCCs must be applied for Rook service accounts
- The `privileged` SCC is required for OSD pods
- Namespace security labels differ from standard Kubernetes

## Prerequisites

```bash
# Verify OpenShift version (4.x required)
oc version

# Confirm available nodes with raw storage devices
oc get nodes -o wide

# Check that kernel modules are available (rbd and cephfs)
oc debug node/<node-name> -- chroot /host lsmod | grep -E "rbd|ceph"
```

## Applying Security Context Constraints

Rook requires privileged access for OSD pods to interact with raw block devices.

```bash
# Clone the Rook repository for the deployment manifests
git clone --single-branch --branch v1.13.0 https://github.com/rook/rook.git
cd rook/deploy/examples
```

The `operator-openshift.yaml` manifest includes SCC definitions that grant the `privileged` SCC to the Rook service accounts. Here is an example of what the SCC looks like:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: rook-ceph
allowPrivilegedContainer: true
allowHostDirVolumePlugin: true
allowedCapabilities:
- MKNOD
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: RunAsAny
volumes:
- configMap
- emptyDir
- hostPath
- persistentVolumeClaim
- secret
users:
- system:serviceaccount:rook-ceph:rook-ceph-operator
- system:serviceaccount:rook-ceph:rook-ceph-osd
- system:serviceaccount:rook-ceph:rook-ceph-mgr
```

## Deploy the Rook Operator

```bash
# Create the rook-ceph namespace
oc create namespace rook-ceph

# Apply the operator manifests - use operator-openshift.yaml on OpenShift
oc create -f crds.yaml -f common.yaml -f operator-openshift.yaml

# Wait for the operator to be ready
oc -n rook-ceph rollout status deploy/rook-ceph-operator
```

Note: Use `operator-openshift.yaml` (not `operator.yaml`) on OpenShift - it includes OpenShift-specific settings.

## Create the CephCluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.2
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  dashboard:
    enabled: true
    ssl: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
  placement:
    all:
      tolerations:
        - effect: NoSchedule
          operator: Exists
  resources:
    osd:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

```bash
oc create -f cluster.yaml

# Monitor cluster coming up
oc -n rook-ceph get pods -w
```

## Verify the Cluster

```bash
# Check all Rook pods are running
oc -n rook-ceph get pods

# Check CephCluster status
oc -n rook-ceph get cephcluster

# Deploy the Ceph toolbox (required before running ceph commands)
oc create -f toolbox.yaml

# Use the Ceph toolbox for cluster health
oc -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Create a StorageClass

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
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Troubleshooting on OpenShift

```bash
# OSD pods in pending state - check SCC
oc describe pod <osd-pod> -n rook-ceph | grep -A5 "Warning"

# Verify SCC binding
oc get scc rook-ceph -o yaml

# Check operator logs
oc -n rook-ceph logs deploy/rook-ceph-operator

# Check if raw devices are visible on the node
oc debug node/<node> -- chroot /host lsblk
```

## Summary

Deploying Rook-Ceph on OpenShift requires applying OpenShift-specific SCCs to grant Rook service accounts privileged access needed to manage raw storage devices. Use the `operator-openshift.yaml` manifest instead of the standard operator manifest, configure the `CephCluster` CRD with your device filter and placement settings, and verify the cluster is healthy with `ceph status` from the toolbox pod. The SCC configuration is the most common obstacle on OpenShift deployments.

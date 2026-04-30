# How to Install Longhorn on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Installation

Description: A comprehensive guide to installing Longhorn, the cloud-native distributed block storage system, on a Kubernetes cluster.

## Introduction

Longhorn is a lightweight, reliable, and powerful distributed block storage system for Kubernetes. Developed by Rancher Labs and now a CNCF project, Longhorn provides persistent storage for stateful applications in Kubernetes environments. This guide walks you through the complete installation process.

## Prerequisites

Before installing Longhorn, ensure your cluster meets the following requirements:

- Kubernetes version 1.21 or later
- Container runtime compatible with Kubernetes (Docker v1.13+, containerd v1.3.7+, etc.)
- Each node must have `open-iscsi` installed and the `iscsid` daemon running
- RWX support requires an NFSv4 client on each node
- The host filesystem must support `file extents` (such as `ext4` or `XFS`)
- Each node must have the following utilities installed: `bash`, `curl`, `findmnt`, `grep`, `awk`, `blkid`, `lsblk`
- Mount propagation must be enabled
- Minimum recommended hardware: 3 nodes, 4 vCPU, 4 GiB RAM per node

### Verify Prerequisites

Longhorn provides the `longhornctl` CLI to check if your environment meets all prerequisites:

```bash
# For AMD64 platform
curl -sSfL -o longhornctl https://github.com/longhorn/cli/releases/download/v1.7.3/longhornctl-linux-amd64
# For ARM64 platform
curl -sSfL -o longhornctl https://github.com/longhorn/cli/releases/download/v1.7.3/longhornctl-linux-arm64

chmod +x longhornctl
./longhornctl check preflight
```

You should see output indicating whether each node passes or fails the checks.

### Install Required Packages

On each Kubernetes node (for Debian/Ubuntu):

```bash
# Install required packages
apt-get install -y open-iscsi nfs-common cryptsetup dmsetup

# Enable and start the iscsid service
systemctl enable iscsid
systemctl start iscsid
```

For RHEL/CentOS:

```bash
# Install required packages
yum --setopt=tsflags=noscripts install -y iscsi-initiator-utils nfs-utils cryptsetup device-mapper
echo "InitiatorName=$(/sbin/iscsi-iname)" > /etc/iscsi/initiatorname.iscsi

# Enable and start the iscsid service
systemctl enable iscsid
systemctl start iscsid
```

## Installation Methods

Longhorn can be installed using several methods. This guide covers the primary `kubectl apply` approach. For Helm-based installation, refer to the dedicated Helm guide.

### Method 1: Install Using kubectl

The simplest way to install Longhorn is to apply the official manifest directly:

```bash
# Install Longhorn using the official manifest
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.7.3/deploy/longhorn.yaml
```

This single command installs all Longhorn components in the `longhorn-system` namespace. On Kubernetes versions earlier than 1.25, clusters that still enable the Pod Security Policy admission controller must also apply the `podsecuritypolicy.yaml` manifest.

### Verify the Installation

Monitor the rollout of Longhorn components:

```bash
# Watch the pods come up in the longhorn-system namespace
kubectl get pods -n longhorn-system -w
```

Wait until all pods show a status of `Running`. This may take a few minutes depending on your network speed and cluster resources.

```bash
# Check that all Longhorn components are running
kubectl get pods -n longhorn-system
```

Expected output includes pods for:
- `longhorn-ui`
- `longhorn-manager` (one per node)
- `longhorn-driver-deployer`
- `longhorn-csi-plugin`
- `csi-attacher`, `csi-provisioner`, `csi-resizer`, and `csi-snapshotter`
- `instance-manager`
- `engine-image`

### Access the Longhorn UI

By default, the Longhorn frontend is exposed as a `ClusterIP` service. To access it, use port forwarding:

```bash
# Port-forward the Longhorn frontend service to localhost
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80
```

Now open your browser and navigate to `http://localhost:8080` to access the Longhorn UI.

## Setting Longhorn as Default Storage Class

The official Longhorn manifest already creates the `longhorn` StorageClass and marks it as the default. If you need to reapply that annotation:

```bash
# Patch the longhorn StorageClass to be the default
kubectl patch storageclass longhorn \
  --type merge \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

If another storage class is also marked as the default, replace `local-path` with that storage class name and set its annotation to `false`:

```bash
# Unset the default annotation on the existing default StorageClass
kubectl patch storageclass local-path \
  --type merge \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'
```

## Create a Test PersistentVolumeClaim

Verify Longhorn works by creating a test PVC:

```yaml
# test-pvc.yaml - A simple PVC using the Longhorn storage class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: longhorn-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
```

```bash
# Apply the test PVC
kubectl apply -f test-pvc.yaml

# Check the PVC status (should become Bound)
kubectl get pvc longhorn-test-pvc
```

## Monitoring Installation Status

You can use the Longhorn UI or `kubectl` to confirm the installation is healthy:

```bash
# Check all nodes are detected by Longhorn
kubectl get nodes.longhorn.io -n longhorn-system

# Check volume status
kubectl get volumes.longhorn.io -n longhorn-system
```

## Conclusion

You have successfully installed Longhorn on your Kubernetes cluster. Longhorn is now ready to provide distributed persistent storage for your workloads. You can manage volumes, configure backups, and monitor storage health through the Longhorn UI at any time. For production deployments, consider configuring backup targets, replica counts, and resource quotas to ensure reliability and performance.

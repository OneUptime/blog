# How to Set Up CSI Drivers on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CSI, Kubernetes, Storage Drivers, Container Storage Interface

Description: Learn how to install and configure Container Storage Interface drivers on Talos Linux for different storage backends.

---

The Container Storage Interface (CSI) is the standard way to expose storage systems to Kubernetes. CSI drivers replace the older in-tree volume plugins and provide a consistent, extensible mechanism for adding storage support to your cluster. On Talos Linux, CSI drivers are the only practical way to provision and manage persistent storage because the immutable operating system does not support installing storage utilities directly on nodes.

This guide covers how CSI works, how to install common CSI drivers on Talos Linux, and how to troubleshoot them.

## How CSI Works

A CSI driver consists of several components that run as pods in your cluster:

- **Controller Plugin**: Runs as a Deployment, handles volume creation, deletion, snapshotting, and expansion at the cluster level
- **Node Plugin**: Runs as a DaemonSet on every node, handles mounting and unmounting volumes on individual nodes
- **External components**: Sidecar containers like the attacher, provisioner, resizer, and snapshotter that translate Kubernetes API calls to CSI calls

When you create a PVC, this is what happens:

1. The external provisioner sees the PVC and calls the Controller Plugin to create a volume
2. When a pod is scheduled, the external attacher calls the Controller Plugin to attach the volume to the node
3. The Node Plugin on that node mounts the volume into the pod

## Installing the CSI Snapshot Controller

Many CSI drivers need the snapshot controller for volume snapshot support. Install it first:

```bash
# Install the snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Install the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml

# Verify it is running
kubectl -n kube-system get pods -l app.kubernetes.io/name=snapshot-controller
```

## Installing the NFS CSI Driver

The NFS CSI driver is one of the simplest to set up on Talos Linux:

```bash
# Install via Helm
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set controller.replicas=2 \
  --set driver.name=nfs.csi.k8s.io
```

Verify the installation:

```bash
# Check CSI pods
kubectl -n kube-system get pods -l app.kubernetes.io/name=csi-driver-nfs

# Verify the CSI driver is registered
kubectl get csidrivers
```

## Installing the Rook-Ceph CSI Driver

The Rook-Ceph CSI driver is installed automatically when you deploy Rook. However, you can configure it through the Rook operator:

```yaml
# rook-operator-values.yaml (Helm values)
csi:
  enableRbdDriver: true
  enableCephfsDriver: true
  enableGrpcMetrics: true

  provisionerReplicas: 2

  rbdPluginResource:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

  cephfsPluginResource:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

  provisionerResource:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
```

```bash
# Upgrade the Rook operator with CSI settings
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-operator-values.yaml
```

## Installing the AWS EBS CSI Driver

If your Talos Linux nodes are running on AWS:

```bash
# Add the EBS CSI driver repository
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

# Install the driver
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system \
  --set controller.replicaCount=2
```

Create a StorageClass for EBS:

```yaml
# ebs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Installing the vSphere CSI Driver

For Talos Linux running on VMware vSphere:

```yaml
# vsphere-csi-values.yaml
cloudConfig:
  vcenter: vcenter.example.com
  user: csi-admin@vsphere.local
  password: secure-password
  port: 443
  insecureFlag: false
  datacenter: dc01
  cluster: cluster01
  datastore: datastore01

controller:
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi

node:
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
```

```bash
# Install the vSphere CSI driver
helm install vsphere-csi vsphere-csi/vsphere-csi-driver \
  --namespace vmware-system-csi \
  --create-namespace \
  -f vsphere-csi-values.yaml
```

## Talos Linux CSI Considerations

Talos Linux has specific requirements for CSI drivers:

1. **No SSH access**: You cannot install storage utilities directly on nodes. Everything must run as containers.

2. **Immutable filesystem**: CSI drivers that need to write to host paths must use paths that Talos allows, typically under `/var`.

3. **Kernel modules**: Some CSI drivers need specific kernel modules. Talos loads common modules by default, but you may need system extensions for others.

```yaml
# Machine config for kernel modules needed by CSI drivers
machine:
  kernel:
    modules:
      - name: nbd     # For some block storage drivers
      - name: iscsi_tcp  # For iSCSI-based storage
```

4. **Extra kubelet mounts**: Some CSI drivers need access to specific host directories:

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/lib/kubelet
        type: bind
        source: /var/lib/kubelet
        options:
          - bind
          - rshared
          - rw
```

## Verifying CSI Driver Installation

After installing any CSI driver, verify it is working:

```bash
# List registered CSI drivers
kubectl get csidrivers

# Check the CSI node info
kubectl get csinodes

# Verify CSI pods are running
kubectl get pods -A -l app.kubernetes.io/component=csi-driver

# Check for CSI-related events
kubectl get events -A --field-selector reason=ProvisioningSucceeded
```

## Testing a CSI Driver

Create a test PVC and pod to verify the driver works:

```yaml
# csi-test.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: csi-test-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: your-storage-class-name
---
apiVersion: v1
kind: Pod
metadata:
  name: csi-test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'CSI test' > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: test-vol
          mountPath: /data
  volumes:
    - name: test-vol
      persistentVolumeClaim:
        claimName: csi-test-pvc
```

```bash
# Apply the test
kubectl apply -f csi-test.yaml

# Check PVC binding
kubectl get pvc csi-test-pvc

# Check pod status
kubectl get pod csi-test-pod

# Read the test file
kubectl exec csi-test-pod -- cat /data/test.txt

# Clean up
kubectl delete -f csi-test.yaml
```

## Troubleshooting CSI Drivers

```bash
# Check controller plugin logs
kubectl logs -n <namespace> deploy/<csi-controller> -c csi-provisioner
kubectl logs -n <namespace> deploy/<csi-controller> -c csi-attacher

# Check node plugin logs on a specific node
kubectl logs -n <namespace> -l app=csi-node-plugin --field-selector spec.nodeName=<node-name>

# Check for volume attachment objects
kubectl get volumeattachments

# Look for stuck volume attachments
kubectl get volumeattachments -o json | jq '.items[] | select(.status.attached != true)'

# Force detach a stuck volume (use with caution)
kubectl delete volumeattachment <attachment-name>
```

## Summary

CSI drivers are the standard for storage integration on Talos Linux. Since the OS is immutable, every storage operation must go through the CSI framework running as Kubernetes pods. The setup process varies by driver, but the pattern is consistent: install the controller plugin, verify the node plugin DaemonSet is running on all nodes, create a StorageClass, and test with a PVC. The key Talos-specific considerations are making sure required kernel modules are loaded and that the necessary host paths are available through kubelet extra mounts.

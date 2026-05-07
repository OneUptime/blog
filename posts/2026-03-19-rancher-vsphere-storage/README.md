# How to Configure vSphere Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, vSphere

Description: A step-by-step guide to configuring VMware vSphere storage for persistent volumes in Rancher-managed Kubernetes clusters.

VMware vSphere is one of the most common virtualization platforms for on-premises Kubernetes deployments. Rancher supports vSphere storage through the vSphere CSI driver, enabling dynamic provisioning of VMDKs as persistent volumes when the vSphere cloud provider and CSI components are configured. This guide covers the complete setup.

## Prerequisites

- A running Rancher instance
- A Kubernetes cluster running on vSphere VMs (RKE or RKE2)
- vSphere 7.0 Update 1 or later with vSAN, VMFS, or NFS datastores
- The vSphere cloud provider/CPI enabled so cluster nodes are initialized with a ProviderID before CSI is installed
- vCenter credentials with appropriate permissions
- kubectl access to your cluster

## Step 1: Configure vSphere Permissions

Create a vSphere role with the permissions required for your vSphere CSI deployment, including:

- **Datastore**: Allocate space, Browse datastore, Low level file operations
- **Virtual Machine > Configuration**: Add existing disk, Add new disk, Remove disk
- **Virtual Machine > Inventory**: Create new, Register, Remove, Unregister
- **Network**: Assign network

## Step 2: Create the vSphere Configuration Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vsphere-config-secret
  namespace: vmware-system-csi
stringData:
  csi-vsphere.conf: |
    [Global]
    cluster-id = "rancher-cluster-1"
    [VirtualCenter "vcenter.example.com"]
    insecure-flag = "false"
    user = "csi-user@vsphere.local"
    password = "your-password"
    port = "443"
    datacenters = "Datacenter1"
```

```bash
kubectl create namespace vmware-system-csi
kubectl apply -f vsphere-secret.yaml
```

## Step 3: Install the vSphere CSI Driver

For Rancher-managed RKE2 clusters, enable the vSphere cloud provider and install the Rancher `vSphere CPI` chart before installing the `vSphere CSI` chart from `Apps > Charts`.

If you are deploying the upstream driver manifests manually on a vanilla cluster, apply the official manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.7.0/manifests/vanilla/vsphere-csi-driver.yaml
```

Verify the installation:

```bash
kubectl get pods -n vmware-system-csi
kubectl get csidrivers | grep csi.vsphere.vmware.com
```

## Step 4: Create vSphere Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.vsphere.vmware.com
parameters:
  datastoreurl: "ds:///vmfs/volumes/<datastore-uuid>/"
  csi.storage.k8s.io/fstype: "ext4"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

For vSAN storage:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-vsan
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "vSAN Default Storage Policy"
  csi.storage.k8s.io/fstype: "ext4"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f vsphere-storageclasses.yaml
```

## Step 5: Use Storage Policies

vSphere storage policies define storage capabilities:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-gold
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "Gold Storage Policy"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-silver
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "Silver Storage Policy"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Step 6: Create a PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vsphere-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: vsphere-default
  resources:
    requests:
      storage: 20Gi
```

```bash
kubectl apply -f vsphere-pvc.yaml
```

## Step 7: Deploy an Application

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-with-vsphere
  namespace: default
spec:
  clusterIP: None
  selector:
    app: app-with-vsphere
  ports:
  - name: http
    port: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: app-with-vsphere
  namespace: default
spec:
  serviceName: app-with-vsphere
  replicas: 1
  selector:
    matchLabels:
      app: app-with-vsphere
  template:
    metadata:
      labels:
        app: app-with-vsphere
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
          name: http
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: vsphere-default
      resources:
        requests:
          storage: 50Gi
```

## Step 8: Configure ReadWriteMany with vSAN File Shares

vSAN file services support ReadWriteMany:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-rwx
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "vSAN File Policy"
  csi.storage.k8s.io/fstype: "nfs4"
reclaimPolicy: Delete
```

Create an RWX PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: vsphere-rwx
  resources:
    requests:
      storage: 100Gi
```

## Step 9: Configure Volume Snapshots

Volume snapshots require the `VolumeSnapshot` CRDs and snapshot-controller. If your Kubernetes distribution has not already installed them, deploy the compatible snapshot components first:

```bash
curl -fsSL https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.7.0/manifests/vanilla/deploy-csi-snapshot-components.sh | bash
```

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: vsphere-snapshot-class
driver: csi.vsphere.vmware.com
deletionPolicy: Retain
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: vsphere-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: vsphere-snapshot-class
  source:
    persistentVolumeClaimName: vsphere-pvc
```

## Step 10: Monitor vSphere Storage

```bash
# Check CSI driver pods

kubectl get pods -n vmware-system-csi

# View CSI driver logs
kubectl logs -n vmware-system-csi -l app=vsphere-csi-controller --tail=50

# Check PVCs
kubectl get pvc --all-namespaces

# Describe a PV to see vSphere volume details
kubectl describe pv <pv-name>

# Check volume health (CSI feature)
kubectl get pvc -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,VOLUME:.spec.volumeName'
```

## Troubleshooting

- **CSI driver not starting**: Verify vCenter credentials in the secret
- **PVC Pending**: Check storage policy exists and has capacity
- **Attach failed**: Verify VM hardware compatibility and SCSI controller limits
- **Datastore not found**: Check the datastoreurl parameter matches the datastore URL shown in vCenter
- **Permission denied**: Verify the vSphere user has the required role

## Summary

vSphere storage in Rancher provides enterprise-grade persistent storage for on-premises Kubernetes deployments. The vSphere CSI driver enables dynamic provisioning backed by VMFS, vSAN, or NFS datastores, with support for storage policies, volume expansion, and CSI snapshots when the snapshot components are installed. By mapping Kubernetes StorageClasses to vSphere storage policies, you can offer different storage tiers to your development teams while maintaining centralized storage management.

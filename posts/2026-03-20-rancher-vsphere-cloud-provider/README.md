# How to Configure vSphere Cloud Provider in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, vSphere, VMware, Cloud Provider

Description: Configure the vSphere cloud provider in Rancher to enable dynamic VMware datastore volumes and vSphere load balancer integration for on-premises clusters.

## Introduction

For Rancher-managed RKE2 clusters on vSphere, use the out-of-tree vSphere Cloud Provider Interface (CPI) together with the vSphere CSI driver. CPI sets ProviderID, node addresses, and topology information, while CSI handles dynamic VMDK-backed PersistentVolumes. This guide covers a supported Rancher/RKE2 setup for on-premises vSphere environments.

## Prerequisites

- vSphere 6.7 Update 3, or vSphere 7.0 Update 1 and later
- Linux nodes only
- Kubernetes 1.19 or later
- Rancher managing an RKE2 cluster on vSphere VMs
- A vSphere user account with required permissions
- A unique cluster ID for the vSphere CSI driver
- All VMs configured with VMware Tools installed and disk UUID enabled

## Step 1: Configure vSphere VM Prerequisites

```bash
# Enable disk UUID on VMs (required for vSphere CPI/CSI)

# Run from vSphere CLI or govc on each VM:
govc vm.change -vm "/<datacenter>/vm/<vm-name>" \
  -e="disk.enableUUID=1"

# Verify
govc vm.info -vm "/<datacenter>/vm/<vm-name>" \
  | grep "disk.enableUUID"

# Install VMware Tools on each node
# For Ubuntu:
sudo apt-get install -y open-vm-tools
sudo systemctl enable --now open-vm-tools
```

## Step 2: Create a vSphere Role with Required Privileges

In the vSphere Web Client:

1. Navigate to **Administration → Access Control → Roles**.
2. Create a new role `RancherKubernetesRole` with these privileges:
   - **Cns Privileges**: Searchable
   - **Content library**: Read Storage (if deploying from a content library)
   - **Cryptographic operations**: Direct Access
   - **Datastore**: AllocateSpace, Browse, FileManagement (Low level file operations), UpdateVirtualMachineFiles, UpdateVirtualMachineMetadata
   - **Global**: Set custom attribute
   - **Network**: Assign
   - **Resource**: AssignVMToPool
   - **Virtual Machine**: Config (All), GuestOperations (All), Interact (All), Inventory (All), Provisioning (All)
   - **vSphere Tagging**: Assign or Unassign vSphere Tag, Assign or Unassign vSphere Tag on Object

3. Assign this role to the vSphere user. If Rancher provisions the VMs, assign it as a Global Permission; if you scope it more narrowly, ensure the same privileges are available on the datacenter, datastore, network, resource pool, and VM folder used by the cluster.

## Step 3: Create the vSphere CPI/CSI Config

```yaml
# /var/lib/rancher/rke2/server/manifests/rancher-vsphere-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rancher-vsphere-cpi
  namespace: kube-system
spec:
  valuesContent: |-
    vCenter:
      host: "vcenter.example.com"
      port: 443
      insecureFlag: false          # Set to true if using a self-signed cert
      datacenters: "Datacenter1"
      username: "rancher-k8s@vsphere.local"
      password: "SecurePassword123!"
      credentialsSecret:
        name: "vsphere-cpi-creds"
        generate: true
---
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rancher-vsphere-csi
  namespace: kube-system
spec:
  valuesContent: |-
    vCenter:
      host: "vcenter.example.com"
      port: 443
      insecureFlag: "0"           # Set to "1" if using a self-signed cert
      clusterId: "rancher-vsphere-cluster"  # Must be unique per cluster
      datacenters: "Datacenter1"
      username: "rancher-k8s@vsphere.local"
      password: "SecurePassword123!"
      configSecret:
        name: "vsphere-config-secret"
        generate: true
    storageClass:
      enabled: false
```

```bash
# Place the manifest on RKE2 server nodes
sudo cp rancher-vsphere-config.yaml /var/lib/rancher/rke2/server/manifests/rancher-vsphere-config.yaml
sudo chmod 600 /var/lib/rancher/rke2/server/manifests/rancher-vsphere-config.yaml
```

## Step 4: Configure RKE2 to Use vSphere Provider

```yaml
# /etc/rancher/rke2/config.yaml (all nodes)
cloud-provider-name: rancher-vsphere
```

Restart RKE2 after the configuration change:

```bash
sudo systemctl restart rke2-server  # control-plane nodes
sudo systemctl restart rke2-agent   # worker nodes
```

## Step 5: Configure via Rancher UI

1. When creating the cluster in Rancher, set **Cloud Provider** to **vSphere**.
2. In **Add-On Config**, configure the **vSphere CPI** and **vSphere CSI** options.
3. Fill in:
   - vCenter hostname/IP
   - Username and password
   - Datacenter list
   - A unique CSI cluster ID
4. Click **Save** or **Create**.

## Step 6: Verify vSphere CPI and CSI Deployment

```bash
# RKE2 deploys the packaged CPI and CSI charts after the configuration above is applied
kubectl -n kube-system get pods | grep -E 'rancher-vsphere-cpi|vsphere-csi'

# CPI must set a ProviderID on every node before CSI-backed storage will work
kubectl describe nodes | grep "ProviderID"
```

## Step 7: Create vSphere StorageClasses

```yaml
# vsphere-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-vmdk
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "vSAN Default Storage Policy"  # or your custom policy
  datastoreurl: "ds:///vmfs/volumes/<datastore-id>/"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
kubectl apply -f vsphere-storageclass.yaml
kubectl get storageclass
```

## Step 8: Verify the Integration

```bash
# Test dynamic volume provisioning
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vsphere-pvc-test
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: vsphere-vmdk
  resources:
    requests:
      storage: 10Gi
EOF

# Check PVC status - should transition to Bound
kubectl get pvc vsphere-pvc-test -w

# Verify the VMDK was created in vCenter
# (Check the Datastore browser in vSphere Web Client)
```

## Common Issues

| Issue | Resolution |
|---|---|
| `PVC stuck in Pending` | Check that the CSI pods are running and every node has a `ProviderID` from the CPI |
| `Unable to find VM` | Ensure VMware Tools is running and `disk.enableUUID` is enabled on all nodes |
| `disk.enableUUID not set` | Set `disk.enableUUID=1` on all VMs before provisioning |
| `certificate verify failed` | Set the CPI/CSI `insecureFlag` values appropriately or import the vCenter CA cert |

## Conclusion

With the out-of-tree vSphere CPI and CSI driver, RKE2 clusters managed by Rancher can dynamically provision VMDK-backed PersistentVolumes directly from Kubernetes PVC requests. This removes the need for the deprecated in-tree vSphere storage integration and gives Rancher-managed clusters a supported path for vSphere-backed dynamic storage.

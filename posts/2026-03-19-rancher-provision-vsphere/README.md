# How to Provision a vSphere Cluster from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, vSphere, Cluster Management

Description: A practical guide to provisioning Kubernetes clusters on VMware vSphere infrastructure using Rancher's node driver.

VMware vSphere is one of the most common virtualization platforms in enterprise data centers. Rancher can provision Kubernetes clusters directly on vSphere by creating virtual machines, installing the OS, and bootstrapping Kubernetes. This guide walks you through the complete process.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- VMware vSphere 6.7 Update 3, 7.0 Update 1, or later
- vCenter Server with appropriate permissions
- A VM template or cloud image for node provisioning
- Network connectivity from the Rancher server to vCenter on 443/TCP and to provisioned VMs on 22/TCP and 2376/TCP
- Sufficient vSphere resources (CPU, memory, storage)

## Step 1: Prepare vSphere

### Create a VM Template

Rancher uses VM templates to provision nodes. Create a template with a supported OS:

1. Create a VM in vSphere with Ubuntu 22.04 or RHEL 8
2. Install the required template dependencies, including `cloud-init`, `open-vm-tools`, `openssh-server`, `open-iscsi`, `curl`, `wget`, `git`, `net-tools`, `unzip`, `apparmor-parser`, `ca-certificates`, `cloud-guest-utils`, `cloud-image-utils`, and `cloud-initramfs-growroot`
3. Configure cloud-init for automated provisioning
4. Convert the VM to a template

For cloud-init enabled images, you can use the official cloud images:

```bash
# Download Ubuntu cloud image

wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.ova
```

Import the OVA into vSphere and convert it to a template.

### Configure vSphere Permissions

Create a vSphere role with the following permissions for Rancher:

```yaml
Datastore:
  - Allocate space
  - Browse datastore
  - Low level file operations
  - Update virtual machine files
  - Update virtual machine metadata

Cns Privileges:
  - Searchable

Network:
  - Assign network

Resource:
  - Assign virtual machine to resource pool

Virtual Machine:
  - Configuration (all)
  - Guest operations (all)
  - Interaction (all)
  - Inventory (all)
  - Provisioning (all)

Content library:
  - Read Storage (if using content libraries)

Cryptographic operations:
  - Direct access

Global:
  - Set custom attribute

vSphere Tagging:
  - Assign or unassign vSphere tag
  - Assign or unassign vSphere tag on object
```

Create a vSphere user and assign this role at the appropriate level in the vCenter hierarchy.

## Step 2: Create a Cloud Credential in Rancher

1. Log in to the Rancher UI
2. Go to **Cluster Management > Cloud Credentials**
3. Click **Create**
4. Select **vSphere**
5. Enter:
   - **Name**: `vsphere-credential`
   - **vCenter Server**: `vcenter.yourdomain.com`
   - **Port**: 443
   - **Username**: `rancher-user@vsphere.local`
   - **Password**: Your vSphere user password
6. Click **Create**

## Step 3: Create the Cluster

1. Go to **Cluster Management**
2. Click **Create**
3. Select **vSphere** under the node driver options

### Cluster Configuration

- **Cluster Name**: Enter a name (e.g., `vsphere-production`)
- **Kubernetes Version**: Select an RKE2 or K3s version

### Machine Pool Configuration

Configure machine pools for different node roles.

#### Control Plane Pool

- **Pool Name**: `control-plane`
- **Machine Count**: 3
- **Roles**: etcd, Control Plane

VM settings:

- **CPUs**: 4
- **Memory**: 8192 MB
- **Disk Size**: 40 GB
- **Network**: Select the vSphere port group
- **Datacenter**: Select your datacenter
- **Datastore**: Select the datastore for VM storage
- **Resource Pool**: Select the resource pool
- **Folder**: VM folder path (e.g., `/Datacenter/vm/Rancher`)
- **Template**: Path to your VM template

```plaintext
Template: /Datacenter/vm/Templates/ubuntu-22.04-template
```

#### Worker Pool

- **Pool Name**: `workers`
- **Machine Count**: 3
- **Roles**: Worker

VM settings:

- **CPUs**: 8
- **Memory**: 16384 MB
- **Disk Size**: 100 GB

### Cloud Config (cloud-init)

Add cloud-init configuration for node customization:

```yaml
#cloud-config
package_update: true
packages:
  - open-vm-tools
  - nfs-common
runcmd:
  - swapoff -a
  - sed -i '/swap/d' /etc/fstab
```

## Step 4: Configure Networking

### CNI Selection

Choose the network plugin:

- **Canal**: Default, good for most environments
- **Calico**: Advanced network policy support
- **Cilium**: eBPF-based networking

### vSphere Cloud Provider

For the RKE2/K3s workflow described here, use Rancher's out-of-tree vSphere integration instead of the legacy in-tree `vsphereCloudProvider` YAML used by RKE clusters:

1. In **Cluster Configuration**, set **Cloud Provider** to **vSphere**
2. In **Add-On Config**, configure the vSphere CPI and CSI options, or install the **vSphere CPI** chart first and then the **vSphere CSI** chart from **Apps > Charts** after the cluster is created

This enables:

- vSphere storage provisioning (VMDK volumes)
- ProviderID and node address initialization through CPI
- Node zone/region awareness

### Storage Configuration

Create a vSphere storage class:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "vSAN Default Storage Policy"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## Step 5: Create the Cluster

Review all settings and click **Create**. Rancher will:

1. Clone the VM template to create new VMs
2. Configure each VM with cloud-init
3. Install the Kubernetes distribution (RKE2 or K3s)
4. Deploy Rancher agents
5. Register the cluster

Provisioning takes 15 to 30 minutes depending on vSphere performance and network speed.

## Step 6: Monitor Provisioning

In the Rancher UI:

1. Watch VMs being created in the machine pools
2. Monitor node registration
3. Track cluster status to `Active`

Also check in vCenter:

- VMs appearing in the specified folder
- VM power state and network connectivity
- Resource utilization

## Step 7: Verify the Cluster

Once Active:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system
kubectl get storageclasses
```

Test vSphere integration:

```bash
# Create a PVC to test storage provisioning
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: vsphere-ssd
EOF

kubectl get pvc test-pvc
```

## Step 8: Post-Provisioning

### Install the vSphere CPI and CSI Drivers

If you did not configure them during cluster creation, deploy the vSphere integrations in this order:

1. Go to **Apps > Charts** in the cluster
2. Install the **vSphere CPI** chart and confirm the nodes have a `ProviderID`
3. Install the **vSphere CSI** chart

### Enable Monitoring

Install the Rancher monitoring stack from **Apps**.

### Configure VM Anti-Affinity

For high availability, configure VM anti-affinity rules in vSphere to spread control plane nodes across different ESXi hosts.

## Troubleshooting

- **VM creation fails**: Check vSphere permissions and resource availability (CPU, memory, storage).
- **Cloud-init not running**: Verify the VM template has cloud-init installed and the NoCloud datasource configured.
- **Storage provisioning fails**: Check that the vSphere CPI is installed, verify the vSphere CSI driver logs, and confirm the storage policy exists.
- **Network connectivity issues**: Verify the VM network port group and that DHCP or static IP assignment is working.

## Conclusion

Provisioning Kubernetes clusters on vSphere from Rancher brings cloud-like automation to your on-premises data center. Rancher handles VM creation, OS configuration, and Kubernetes installation, giving you a fully managed cluster on your existing VMware infrastructure. With vSphere CPI/CSI integration, you get native storage provisioning and node topology awareness, making it a comprehensive solution for enterprise Kubernetes on vSphere.

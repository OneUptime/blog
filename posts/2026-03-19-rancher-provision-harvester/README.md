# How to Provision a Harvester Cluster from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Harvester, Cluster Management

Description: Learn how to provision Kubernetes clusters on Harvester HCI using the Rancher Harvester node driver.

Harvester is an open-source hyper-converged infrastructure (HCI) platform built on Kubernetes, designed as a modern alternative to traditional virtualization platforms. Rancher integrates natively with Harvester, allowing you to provision guest Kubernetes clusters on Harvester VMs. This guide covers the complete provisioning process.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- A Harvester cluster registered in Rancher (`v1.2.0+` is recommended for newer RKE2 releases with the Harvester cloud provider)
- VM images uploaded to Harvester
- Sufficient Harvester resources (CPU, memory, storage)
- A Harvester VLAN network for the guest nodes, with DHCP or Managed DHCP available

## Step 1: Register Harvester in Rancher

If your Harvester cluster is not yet registered with Rancher:

1. In Rancher, go to **Virtualization Management**
2. Click **Import Existing** and create the Harvester cluster entry
3. In the Harvester UI, set the `cluster-registration-url` setting to the registration URL that Rancher provides

Alternatively, if you already have the registration URL, you can set it directly on the Harvester cluster and complete the import flow from Rancher.

Verify the Harvester cluster shows as `Active` in Rancher under **Virtualization Management**.

## Step 2: Prepare Harvester Resources

### Upload a VM Image

You need a cloud image for provisioning VMs. In the Harvester UI:

1. Go to **Images**
2. Click **Create**
3. Upload an image or provide a URL:

```plaintext
Name: ubuntu-22.04-cloud
URL: https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img
```

Wait for the image to download and become `Active`.

### Create a VM Network

The Harvester node driver requires a VLAN network for the guest Kubernetes nodes:

1. Go to **Networks** in Harvester
2. Click **Create**
3. Configure the VLAN network:
   - **Name**: `k8s-network`
   - **VLAN ID**: Your VLAN ID
   - **Cluster Network**: Select the cluster network
4. Ensure the network can hand out addresses to the VMs, either through DHCP or Harvester Managed DHCP

### Create Cloud Credentials

In Rancher:

1. Go to **Cluster Management > Cloud Credentials**
2. Click **Create**
3. Select **Harvester**
4. Select **Imported Harvester Cluster**
5. Name the credential and click **Create**

## Step 3: Create the Kubernetes Cluster

1. Go to **Cluster Management > Clusters**
2. Click **Create**
3. Toggle to **RKE2/K3s**
4. Select **Harvester** under the node driver options

## Step 4: Configure Cluster Settings

### Basic Configuration

- **Cluster Name**: Enter a name (e.g., `harvester-prod-cluster`)
- **Cloud Credential**: Select your Harvester credential
- **Kubernetes Version**: Select an RKE2 version (or K3s if you are following the experimental Harvester K3s path)
- **Namespace**: Choose the Harvester namespace for the VMs and keep all guest cluster nodes in the same namespace
- **SSH User**: Use the default user for the image (for example, `ubuntu` for Ubuntu cloud images)

### Machine Pools

#### Control Plane Pool

Configure the control plane VMs:

- **Pool Name**: `control-plane`
- **Machine Count**: 3
- **Roles**: etcd, Control Plane

VM settings:

- **CPU**: 4 cores
- **Memory**: 8 GiB
- **Disk Size**: 40 GiB
- **Image**: Select `ubuntu-22.04-cloud`
- **Network**: Select the VM network
- **Namespace**: `default` (or your preferred namespace)

#### Worker Pool

Configure the worker VMs:

- **Pool Name**: `workers`
- **Machine Count**: 3
- **Roles**: Worker

VM settings:

- **CPU**: 8 cores
- **Memory**: 16 GiB
- **Disk Size**: 100 GiB
- **Image**: Select `ubuntu-22.04-cloud`
- **Network**: Select the VM network

### User Data (cloud-init)

Add cloud-init configuration for node customization:

```yaml
#cloud-config
package_update: true
packages:
  - qemu-guest-agent
  - iptables
  - nfs-common
runcmd:
  - systemctl enable --now qemu-guest-agent
  - swapoff -a
  - sed -i '/swap/d' /etc/fstab
```

### Network Data

If using DHCP on the VLAN network:

```yaml
version: 1
config:
  - type: physical
    name: enp1s0
    subnets:
      - type: dhcp
```

## Step 5: Configure Networking

### CNI Selection

Choose the network plugin:

- **Canal**: Default, suitable for most deployments
- **Calico**: Advanced network policies
- **Cilium**: eBPF-based networking

### Harvester Cloud Provider

For RKE2 clusters, select **Harvester** as the cloud provider. Rancher then deploys the Harvester cloud controller manager and CSI driver automatically. It enables:

- Harvester load balancer integration
- Harvester CSI storage provisioning

### Load Balancer Configuration

The Harvester cloud provider supports DHCP and pool-based load balancers:

```yaml
metadata:
  annotations:
    cloudprovider.harvesterhci.io/ipam: pool
```

Configure an IP pool in Harvester for load balancer IPs:

1. In Harvester, go to **Networks > IP Pools**
2. Create an IP pool with an address range that the guest cluster can use for `LoadBalancer` services

## Step 6: Configure Storage

### Harvester CSI Driver

When you provision an RKE2 cluster with the Harvester cloud provider selected, the Harvester CSI driver is deployed automatically and creates a default storage class:

```bash
kubectl get storageclasses
# harvester (default)
```

### Additional Storage Classes

Create storage classes with specific configurations:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: harvester-ssd
provisioner: driver.harvesterhci.io
parameters:
  hostStorageClass: longhorn-ssd
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Step 7: Create the Cluster

Review all settings and click **Create**. The provisioning process:

1. Creates VMs on the Harvester cluster
2. Configures VMs with cloud-init
3. Installs the selected Kubernetes distribution
4. Deploys Rancher agents and, when selected, the Harvester cloud provider and CSI components
5. Registers the cluster in Rancher

This takes approximately 10 to 20 minutes.

## Step 8: Monitor Provisioning

Watch the provisioning in Rancher:

1. Navigate to the cluster
2. Monitor machine pool status
3. Watch VMs being created in the Harvester UI

In Harvester, verify VMs are running:

1. Go to **Virtual Machines**
2. Check that the provisioned VMs are in `Running` state

## Step 9: Verify the Cluster

Once the cluster shows `Active`:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system

# Verify Harvester CSI
kubectl get storageclasses
kubectl get csidrivers

# Verify cloud provider
kubectl get pods -n kube-system | grep harvester
```

Test storage provisioning:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-harvester-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

kubectl get pvc test-harvester-pvc
```

Test load balancer:

```bash
kubectl create deployment nginx --image=nginx
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: nginx
  annotations:
    cloudprovider.harvesterhci.io/ipam: pool
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
EOF

kubectl get svc nginx
```

## Step 10: Post-Provisioning

### Install Monitoring

Navigate to **Apps** and install the Rancher monitoring stack.

### Configure VM Affinity

For high availability, configure VM affinity rules to spread VMs across Harvester nodes:

In the machine pool configuration, you can set node scheduling rules to distribute VMs.

### Enable Backup

Configure the Rancher backup operator for cluster data protection.

## Troubleshooting

- **VM fails to start**: Check Harvester VM events and logs. Verify the image is valid and resources are available.
- **Cloud-init not applying**: Ensure the image supports cloud-init and qemu-guest-agent is installed.
- **CSI driver issues**: Check the Harvester CSI driver pods and logs in `kube-system`.
- **Load balancer not getting IP**: Verify the IP Pool configuration in Harvester and the `cloudprovider.harvesterhci.io/ipam` annotation on the `LoadBalancer` service.
- **Network connectivity**: Check that the VM network is properly configured and has DHCP or static IP assignment.

## Conclusion

Provisioning Kubernetes clusters on Harvester from Rancher creates a fully integrated open-source infrastructure stack. Harvester provides the HCI platform with VM management, while Rancher handles Kubernetes cluster lifecycle management. The native integration between the two platforms provides seamless storage provisioning, load balancer management, and VM lifecycle operations, making it a compelling alternative to proprietary virtualization and cloud platforms.

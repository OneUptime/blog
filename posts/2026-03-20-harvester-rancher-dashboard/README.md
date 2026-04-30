# How to Manage Harvester from Rancher Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Rancher, Virtualization, HCI, Dashboard

Description: Learn how to manage your Harvester HCI cluster, virtual machines, and infrastructure from the Rancher unified management dashboard.

## Introduction

Once Harvester is integrated with Rancher, you can access the main Harvester management functionality directly from the Rancher dashboard. In Rancher 2.10 and later, this access is provided through the Harvester UI Extension. This eliminates the need to switch between interfaces and provides a unified view of your entire infrastructure - both VMs and Kubernetes clusters. This guide covers the key Harvester management tasks available from Rancher.

## Accessing Harvester from Rancher

### Navigate to the Harvester Cluster

1. Log into the Rancher dashboard at `https://rancher.company.com`
2. Click the hamburger menu and choose **Virtualization Management**
3. On the **Harvester Clusters** page, click your imported Harvester cluster (e.g., `local-harvester`)
4. If Rancher prompts you to install or update the Harvester UI Extension, complete that step first
5. You are now in the Harvester management context within Rancher

If the Harvester feature flag is disabled, imported Harvester clusters also appear on **Cluster Management**. In that case, you can click **Explore** there to open the cluster view.

## Managing Virtual Machines

### View All VMs

From the Harvester cluster view in Rancher:

1. Click **Virtual Machines**
2. You see all VMs with their status, resource usage, and node placement

```bash
# List all virtual machines

export KUBECONFIG=harvester.kubeconfig
kubectl get vm -A

# For running instances and node placement
kubectl get vmi -A -o wide
```

### Create a VM from Rancher

1. Click **Create** in the Virtual Machines view
2. The Harvester VM creation wizard opens within Rancher
3. Fill in the same fields as in the native Harvester UI:
   - Name and namespace
   - CPU and memory
   - Boot image
   - Network
   - Cloud-init

### Monitor VM Metrics

If the `rancher-monitoring` add-on is enabled, from the VM details page in Rancher:
1. Click on a VM name
2. Go to the **VM Metrics** tab
3. View CPU usage, memory usage, network I/O, and disk I/O

## Managing VM Images

### Import Images via Rancher

1. In the Harvester cluster view, click **Images**
2. Click **Create**
3. Provide the image URL and name
4. Click **Create**

```bash
# Monitor image import progress
kubectl get vmimages -n default -w
```

### Manage Image Lifecycle

From the images list in Rancher:
- **Delete**: Remove unused images
- **Download**: Export an image for offline use

## Managing Volumes and Storage

### View Volumes

1. In the Harvester cluster view, click **Volumes**
2. See all PVCs with size, storage class, and attachment status

### Create a Volume

1. Click **Create**
2. Set name, namespace, source, size, and storage class
3. Click **Create**

## Managing VM Networks

### View Networks

1. Navigate to **Networks** → **VM Networks**
2. See all VM networks and their associated configuration, including VLAN IDs for VLAN networks

### Create a VLAN Network

1. Click **Create**
2. Provide:
   - Name and namespace
   - Cluster network
   - VLAN ID
3. Click **Create**

## Managing Cluster Nodes

### View Node Status

1. Navigate to **Hosts** in the Harvester cluster view
2. See each node with CPU, memory, and storage usage

```bash
# Via kubectl
kubectl get nodes -o wide
kubectl top nodes
```

### Cordon/Uncordon a Node

From the nodes list:
1. Click the **⋮** menu on a node
2. Select **Cordon** to prevent new VMs from scheduling
3. Select **Uncordon** to re-enable scheduling

```bash
# Via kubectl
kubectl cordon harvester-node-02
kubectl uncordon harvester-node-02
```

## Managing Rancher Clusters on Harvester

One of the most powerful features of the Rancher-Harvester integration is cluster provisioning:

### Provision a New Kubernetes Cluster

1. In Rancher, navigate to **Cluster Management**
2. Click **Create**
3. Toggle to **RKE2/K3s** and select the **Harvester** node driver
4. Configure node pools with Harvester VM specifications. Use a cloud image and VLAN network. For RKE2, select **Harvester** as the cloud provider if you want Rancher to deploy the Harvester CSI driver and cloud controller manager automatically.
5. Click **Create**

Rancher will automatically:
- Create VMs in Harvester using the Harvester node driver
- Bootstrap RKE2 or K3s on the VMs
- Register the cluster with Rancher
- For RKE2 clusters using the Harvester cloud provider, deploy the Harvester CSI driver and cloud controller manager

K3s clusters can also be provisioned on Harvester, but Harvester cloud provider integration for K3s requires additional manual steps and is documented as experimental.

### View Cluster Health Dashboard

For clusters running on Harvester:

1. Click on the cluster name in Rancher
2. View the cluster dashboard:
   - Node count and health
   - CPU and memory utilization
   - Pod count
   - Deployment health

### Scale Node Pools

1. Click on the cluster
2. Go to **Cluster** → **Machine Pools**
3. Click **Edit** on a pool
4. Change the quantity
5. Click **Save** - new VMs will be created in Harvester automatically

## Using Rancher's Monitoring in Harvester Context

Harvester monitoring is provided by the `rancher-monitoring` add-on, which you can manage from the Rancher-hosted Harvester UI:

```bash
# Enable monitoring on the Harvester cluster
# Via Rancher UI:
# 1. Navigate to the Harvester cluster
# 2. Click Advanced → Add-ons
# 3. Find "rancher-monitoring"
# 4. Select ⋮ → Enable

# Optional CLI configuration:
kubectl edit addons.harvesterhci.io -n cattle-monitoring-system rancher-monitoring
```

## Managing RBAC from Rancher

Harvester leverages Rancher's authentication and cluster/project roles for multi-tenancy. Rancher 2.14.1 and later also provide an experimental Harvester RBAC integration with virtualization-specific role templates.

### Create a Harvester Project

1. Navigate to the Harvester cluster in Rancher
2. Go to **Projects/Namespaces**
3. Click **Create Project**
4. Assign team members with appropriate roles

### Assign VM Management Roles

If the Harvester RBAC integration is installed, assign one of Rancher's built-in virtualization role templates instead of creating custom `kubevirt.io`-only roles:

- **View Virtualization Resources**: Read-only access to Harvester VM, image, volume, network, and host resources
- **Manage Virtualization Resources**: Management access to Harvester VM, image, volume, network, and host resources

## Conclusion

Managing Harvester through the Rancher dashboard provides a significantly improved operational experience compared to using each tool separately. The unified interface reduces context switching, provides consistent RBAC across both VM and container workloads, and makes it straightforward to provision new Kubernetes clusters on your HCI infrastructure. As your organization grows, the Rancher-Harvester integration scales with you - supporting multi-cluster management, fleet deployments, and policy enforcement across your entire hybrid infrastructure.

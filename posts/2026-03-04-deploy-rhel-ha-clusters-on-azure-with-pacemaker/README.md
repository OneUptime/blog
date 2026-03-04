# How to Deploy RHEL HA Clusters on Azure with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, Pacemaker, High Availability, Cluster, Cloud

Description: Deploy a two-node high availability cluster on Azure using RHEL and Pacemaker with an Azure fence agent for reliable failover.

---

Running Pacemaker HA clusters on Azure requires proper fencing to handle node failures. Azure provides a fence agent that can restart or power off failed VMs through the Azure API.

## Prerequisites

You need two RHEL VMs in the same availability set or zone, with the HA add-on subscription enabled. Both nodes must be able to reach each other over the network.

## Install HA Packages

On both nodes, enable the HA repository and install the cluster packages:

```bash
# Enable the HA repo (RHEL 9)
sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms

# Install Pacemaker and fence agents
sudo dnf install -y pcs pacemaker fence-agents-azure-arm
```

## Configure the Cluster

```bash
# Set a password for the hacluster user on both nodes
sudo passwd hacluster

# Start and enable pcsd on both nodes
sudo systemctl enable --now pcsd

# Authenticate nodes (run on one node)
sudo pcs host auth node1 node2 -u hacluster -p 'YourPassword'

# Create the cluster
sudo pcs cluster setup ha-cluster node1 node2

# Start the cluster
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Configure Azure Fencing

Create an Azure AD service principal for the fence agent:

```bash
# Create the service principal (run from Azure CLI)
az ad sp create-for-rbac \
  --name "pacemaker-fencing" \
  --role "Virtual Machine Contributor" \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group>
```

Then configure the fence device on either cluster node:

```bash
# Configure the Azure fence agent
sudo pcs stonith create fence-azure fence_azure_arm \
  subscriptionId="<subscription-id>" \
  resourceGroup="<resource-group>" \
  tenantId="<tenant-id>" \
  login="<app-id>" \
  passwd="<password>" \
  pcmk_monitor_retries=4 \
  pcmk_action_limit=3 \
  power_timeout=240 \
  pcmk_reboot_timeout=900
```

## Verify the Cluster

```bash
# Check cluster status
sudo pcs status

# Test fencing (careful - this will reboot the target node)
sudo pcs stonith fence node2
```

The cluster should detect the fenced node and relocate resources. After the node reboots, it rejoins automatically.

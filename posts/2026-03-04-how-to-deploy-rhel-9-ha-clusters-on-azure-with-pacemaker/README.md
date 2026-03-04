# How to Deploy RHEL 9 HA Clusters on Azure with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Azure, High Availability, Pacemaker

Description: Step-by-step guide on deploy rhel 9 ha clusters on azure with pacemaker with practical examples and commands.

---

Running highly available workloads on Azure requires proper clustering. This guide walks through deploying RHEL 9 HA clusters on Azure using Pacemaker and Corosync.

## Prerequisites

- Two or more RHEL 9 VMs on Azure with an active Red Hat subscription
- Azure CLI installed and configured
- A virtual network with all nodes on the same subnet
- An Azure load balancer for floating IP support

## Install HA Packages

On all cluster nodes, install the high-availability add-on:

```bash
sudo dnf install -y pcs pacemaker fence-agents-azure-arm resource-agents
```

Enable and start the PCS daemon:

```bash
sudo systemctl enable --now pcsd
```

## Set the Cluster Password

Set a password for the `hacluster` user on all nodes:

```bash
echo 'StrongPassword123!' | sudo passwd --stdin hacluster
```

## Authenticate Nodes

From one node, authenticate to all cluster members:

```bash
sudo pcs host auth node1 node2 -u hacluster -p 'StrongPassword123!'
```

## Create the Cluster

```bash
sudo pcs cluster setup azure-ha-cluster node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Configure Azure Fence Agent

Azure requires a service principal for fencing. Create one:

```bash
az ad sp create-for-rbac --name "pacemaker-fence" --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group>
```

Add the fence device:

```bash
sudo pcs stonith create fence-azure fence_azure_arm \
  login=<app-id> \
  passwd=<password> \
  tenantId=<tenant-id> \
  subscriptionId=<subscription-id> \
  resourceGroup=<resource-group> \
  pcmk_reboot_action=reboot \
  pcmk_monitor_timeout=120 \
  power_timeout=240
```

## Configure the Azure Load Balancer Health Probe

Create a health probe resource so the Azure load balancer knows which node is active:

```bash
sudo pcs resource create health-azure-lb azure-lb port=61000
```

## Create a Virtual IP Resource

```bash
sudo pcs resource create vip IPaddr2 \
  ip=10.0.0.100 cidr_netmask=24 \
  op monitor interval=10s
```

## Group Resources

```bash
sudo pcs resource group add ha-group vip health-azure-lb
```

## Set Cluster Properties

```bash
sudo pcs property set stonith-enabled=true
sudo pcs property set no-quorum-policy=freeze
```

## Verify the Cluster

```bash
sudo pcs status
sudo pcs stonith status
```

## Testing Failover

Simulate a failure by stopping one node:

```bash
sudo pcs node standby node1
sudo pcs status
sudo pcs node unstandby node1
```

## Conclusion

You now have a working RHEL 9 HA cluster on Azure with Pacemaker, Corosync, Azure fencing, and load balancer integration. Monitor your cluster regularly and test failover scenarios to validate your high-availability setup.


# How to Configure Multiple Network Interfaces on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machines, Networking, Network Interfaces, NIC, Cloud Infrastructure

Description: Learn how to attach multiple network interfaces to an Azure VM for network segmentation, traffic isolation, and multi-subnet architectures.

---

By default, an Azure VM gets one network interface card (NIC), and for many workloads that is perfectly fine. But there are solid reasons to attach multiple NICs to a single VM - network segmentation, running a network virtual appliance, separating management traffic from application traffic, or connecting to multiple subnets within a VNet.

I first needed multi-NIC VMs when setting up a software firewall appliance in Azure. The firewall needed one NIC facing the public subnet and another facing the private subnet. You cannot do that with a single NIC, and Azure does not support multiple IP configurations on different subnets with one NIC. Multiple NICs were the answer.

## VM Size Matters

Not every VM size supports multiple NICs. The number of NICs you can attach depends entirely on the VM size. Here is a quick reference for some common sizes:

- Standard_B2s: 2 NICs
- Standard_D4s_v5: 2 NICs
- Standard_D8s_v5: 4 NICs
- Standard_D16s_v5: 8 NICs
- Standard_F8s_v2: 4 NICs

The general pattern is that larger VMs support more NICs. Before planning a multi-NIC deployment, verify your chosen VM size supports the number of interfaces you need:

```bash
# Check the maximum NIC count for a VM size
az vm list-sizes --location eastus \
  --query "[?name=='Standard_D4s_v5'].{Name:name, MaxNICs:maxNetworkInterfaces, Memory:memoryInMb, vCPUs:numberOfCores}" \
  -o table
```

## Setting Up the Network Infrastructure

Before attaching multiple NICs, you need a VNet with multiple subnets. Each NIC will connect to a different subnet (or you can put multiple NICs on the same subnet, though that is less common).

```bash
# Create a VNet with two subnets
az network vnet create \
  --resource-group myResourceGroup \
  --name myVNet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name frontend-subnet \
  --subnet-prefix 10.0.1.0/24

# Add a second subnet
az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name backend-subnet \
  --address-prefix 10.0.2.0/24

# Optionally add a management subnet
az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name mgmt-subnet \
  --address-prefix 10.0.3.0/24
```

## Creating Multiple NICs

Now create the network interfaces. Each one attaches to a different subnet:

```bash
# Create the primary NIC (frontend)
az network nic create \
  --resource-group myResourceGroup \
  --name myVM-nic-frontend \
  --vnet-name myVNet \
  --subnet frontend-subnet \
  --network-security-group myNSG-frontend

# Create the secondary NIC (backend)
az network nic create \
  --resource-group myResourceGroup \
  --name myVM-nic-backend \
  --vnet-name myVNet \
  --subnet backend-subnet \
  --network-security-group myNSG-backend

# Create a third NIC (management) if needed
az network nic create \
  --resource-group myResourceGroup \
  --name myVM-nic-mgmt \
  --vnet-name myVNet \
  --subnet mgmt-subnet \
  --network-security-group myNSG-mgmt
```

## Creating a VM with Multiple NICs

When creating a new VM, you can attach multiple NICs at creation time. This is the cleanest approach:

```bash
# Create the VM with multiple NICs
az vm create \
  --resource-group myResourceGroup \
  --name myMultiNicVM \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --nics myVM-nic-frontend myVM-nic-backend myVM-nic-mgmt \
  --admin-username azureuser \
  --generate-ssh-keys
```

The first NIC in the list becomes the primary NIC. The primary NIC is special - it is the one that gets the default route and is used for outbound traffic unless you configure the OS otherwise.

## Adding a NIC to an Existing VM

If you have an existing VM and want to add another NIC, you need to stop the VM first. You cannot hot-add NICs to a running Azure VM.

```bash
# Deallocate the VM
az vm deallocate --resource-group myResourceGroup --name myMultiNicVM

# Create the new NIC
az network nic create \
  --resource-group myResourceGroup \
  --name myVM-nic-new \
  --vnet-name myVNet \
  --subnet backend-subnet

# Attach the new NIC to the VM
az vm nic add \
  --resource-group myResourceGroup \
  --vm-name myMultiNicVM \
  --nics myVM-nic-new

# Start the VM back up
az vm start --resource-group myResourceGroup --name myMultiNicVM
```

## Configuring the Guest OS

Here is where things get interesting. Azure sets up the NICs at the infrastructure level, but the guest OS needs to know how to use them properly. By default, Linux will see all the interfaces but only the primary one will have a default gateway configured. Traffic coming in on a secondary NIC might try to leave through the primary NIC, which breaks things because of asymmetric routing.

### Linux Configuration

On Ubuntu/Debian, you need to set up policy-based routing so each NIC uses its own routing table:

```bash
# First, check which interfaces are available
ip addr show

# You should see eth0 (primary), eth1 (secondary), etc.
# Azure assigns IPs via DHCP, so they should already have addresses

# Create routing tables for secondary interfaces
# Add entries to /etc/iproute2/rt_tables
echo "200 eth1-rt" | sudo tee -a /etc/iproute2/rt_tables
echo "201 eth2-rt" | sudo tee -a /etc/iproute2/rt_tables

# Configure routing rules for eth1 (example with 10.0.2.4 as the IP)
sudo ip route add 10.0.2.0/24 dev eth1 table eth1-rt
sudo ip route add default via 10.0.2.1 dev eth1 table eth1-rt
sudo ip rule add from 10.0.2.4 table eth1-rt priority 200

# Configure routing rules for eth2 (example with 10.0.3.4 as the IP)
sudo ip route add 10.0.3.0/24 dev eth2 table eth2-rt
sudo ip route add default via 10.0.3.1 dev eth2 table eth2-rt
sudo ip rule add from 10.0.3.4 table eth2-rt priority 201
```

To make these rules persistent across reboots, you should add them to your network configuration. On Ubuntu 18.04+ with Netplan:

```yaml
# /etc/netplan/60-multi-nic.yaml
network:
  version: 2
  ethernets:
    eth1:
      dhcp4: true
      dhcp4-overrides:
        use-routes: false
      routes:
        - to: 10.0.2.0/24
          via: 10.0.2.1
          table: 200
        - to: 0.0.0.0/0
          via: 10.0.2.1
          table: 200
      routing-policy:
        - from: 10.0.2.4
          table: 200
          priority: 200
    eth2:
      dhcp4: true
      dhcp4-overrides:
        use-routes: false
      routes:
        - to: 10.0.3.0/24
          via: 10.0.3.1
          table: 201
        - to: 0.0.0.0/0
          via: 10.0.3.1
          table: 201
      routing-policy:
        - from: 10.0.3.4
          table: 201
          priority: 201
```

Apply the configuration:

```bash
sudo netplan apply
```

### Windows Configuration

On Windows, multiple NICs are generally handled better out of the box. Windows will register each NIC with its own IP and gateway. However, you might still want to configure metrics to control which NIC is preferred for outbound traffic:

```powershell
# View all network adapters
Get-NetAdapter

# Set interface metric to control routing preference
# Lower metric = higher priority
Set-NetIPInterface -InterfaceAlias "Ethernet" -InterfaceMetric 10
Set-NetIPInterface -InterfaceAlias "Ethernet 2" -InterfaceMetric 20
```

## Network Architecture Patterns

Here are common architectures that benefit from multi-NIC VMs:

### Network Virtual Appliance (NVA)

The classic use case. A firewall or load balancer VM sits between subnets with one NIC in each. Traffic flows in through one interface, gets inspected or processed, and leaves through another.

```mermaid
graph LR
    Internet --> A[Public NIC - 10.0.1.4]
    A --> B[NVA VM]
    B --> C[Private NIC - 10.0.2.4]
    C --> D[Backend VMs]
```

### Management Separation

A VM with one NIC for application traffic and another for management access. This lets you apply different NSG rules to each path and keep management traffic on a separate, more restricted subnet.

### Database Replication

Database servers with one NIC for client connections and another NIC on a dedicated replication subnet. This isolates replication traffic from client queries and prevents replication storms from affecting application performance.

## Common Pitfalls

**Asymmetric routing**: This is the number one issue. Without policy-based routing, responses to requests on secondary NICs will go out through the primary NIC. The source IP will not match what the client expects, and the connection will fail.

**NSG confusion**: Each NIC can have its own NSG. When troubleshooting connectivity, remember to check the NSG on the specific NIC the traffic is hitting, not just the primary NIC.

**Public IP placement**: Only attach public IPs to the NIC that needs external access. Having public IPs on multiple NICs can create unexpected routing behavior.

**DHCP lease issues**: Azure DHCP manages the IP assignments. Do not configure static IPs inside the guest OS for Azure-managed NICs. Set the static IP at the Azure level and let DHCP deliver it.

## Monitoring Multi-NIC VMs

With multiple NICs, monitoring becomes more important because you need visibility into traffic on each interface separately. Azure Network Watcher can capture traffic on specific NICs, and you can use NSG flow logs to track traffic patterns per interface.

Setting up per-NIC monitoring through tools like OneUptime ensures you can see when one interface is saturated while another is idle, which helps you balance traffic and plan capacity.

## Wrapping Up

Multiple NICs on Azure VMs enable network architectures that are not possible with single-NIC setups. The Azure side of the configuration is straightforward - create NICs, attach them to subnets, assign them to a VM. The guest OS configuration is where you need to be careful, especially around routing tables on Linux. Plan your subnet layout, verify your VM size supports enough NICs, and set up policy-based routing from the start. That saves you from debugging mysterious connectivity issues later.

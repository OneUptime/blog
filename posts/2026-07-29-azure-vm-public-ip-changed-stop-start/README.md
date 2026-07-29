# Why Did My Azure VM Public IP Change After Stop and Start?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Public IP, Networking, Troubleshooting

Description: Explain when an Azure VM public IP can change after deallocation and replace address-dependent designs with static or private connectivity.

---

An Azure VM's public IP can change after a stop and start when the address is dynamically assigned and the VM was **deallocated**. Deallocation releases compute placement, and a dynamic address is not a promise to return the same public IP at the next allocation.

The durable fix is to attach a supported static Standard public IP, or preferably remove direct public exposure and connect through Azure Bastion, VPN, ExpressRoute, or a load balancer with a stable frontend.

## Identify which address changed

An Azure VM can involve several addresses:

- a private IP on the NIC;
- an optional public IP resource associated with a NIC IP configuration;
- an inbound NAT frontend on Azure Load Balancer;
- an outbound SNAT address from NAT Gateway, Load Balancer, or another platform mechanism;
- a DNS name that resolves to one of those addresses.

Do not assume that an observed outbound address is the same public IP used for inbound SSH or RDP.

Inspect the VM's NIC and public IP association:

```bash
NIC_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "networkProfile.networkInterfaces[0].id" \
  --output tsv)

az network nic show \
  --ids "$NIC_ID" \
  --query "ipConfigurations[].{privateIP:privateIPAddress,privateAllocation:privateIPAllocationMethod,publicIP:publicIPAddress.id}" \
  --output table
```

If a public IP resource is attached, inspect it:

```bash
az network public-ip show \
  --resource-group myResourceGroup \
  --name myPublicIP \
  --query "{address:ipAddress,allocation:publicIPAllocationMethod,sku:sku.name,dns:dnsSettings.fqdn}" \
  --output table
```

## Deallocation is the key transition

A guest reboot or Azure Restart normally keeps the VM allocated and should not by itself release its public IP association. A platform Stop that reaches `Stopped (deallocated)`, a redeploy, or some host-moving maintenance operations can update dynamic addresses.

Microsoft's public IP documentation states that a dynamic public IP can change when a VM starts after being stopped and deallocated. Redeployment guidance also warns that dynamic IP addresses can be updated.

Verify what happened in the Activity log. A user may say the VM was restarted when an automation actually called deallocate, redeploy, resized the VM, or applied maintenance.

## DNS does not make a dynamic address static

An Azure public IP resource can have a DNS label. Azure maintains the mapping from that label to its current address, even if a dynamic address changes. Clients that use the DNS name can therefore follow the new value after DNS caches expire.

Clients that pin the old numeric IP cannot. Common failure points include:

- office firewall allowlists;
- partner API allowlists;
- SSH `known_hosts` entries keyed by address;
- RDP files with a literal IP;
- monitoring targets;
- application configuration and certificates built around an address;
- DNS records in another provider that were not updated.

Use a stable DNS name for service discovery, but remember that partner IP allowlisting still requires a stable egress or ingress address.

## Use a static public IP when the address is a contract

Basic SKU public IPs were retired on September 30, 2025. Existing Basic addresses can remain operational, but Microsoft treats them as unsupported and without SLA coverage, so replace or upgrade one instead of continuing to rely on it.

For current deployments, create a Standard public IP with static allocation in the same region as the NIC and associate it with the NIC or service frontend:

```bash
NIC_LOCATION=$(az network nic show \
  --resource-group myResourceGroup \
  --name myNic \
  --query location \
  --output tsv)

az network public-ip create \
  --resource-group myResourceGroup \
  --name myPublicIP \
  --sku Standard \
  --allocation-method Static \
  --location "$NIC_LOCATION"
```

Association is performed on the NIC IP configuration:

```bash
az network nic ip-config update \
  --resource-group myResourceGroup \
  --nic-name myNic \
  --name ipconfig1 \
  --public-ip-address myPublicIP
```

Plan the change as a connectivity event. Replacing an address can interrupt active sessions, and NSG rules must explicitly allow required inbound traffic. Standard public IPs are secure by default for inbound connections.

Do not hard-code a private IP inside the guest to solve a public IP problem. Azure assigns the NIC's private address through its platform DHCP service. If a stable private IP is required, configure static allocation on the Azure NIC and keep DHCP enabled in the guest unless the documented multiple-IP procedure requires otherwise.

## Prefer a stable frontend over per-VM public IPs

A directly exposed public IP couples clients to one VM. More resilient patterns include:

- Azure Load Balancer with a static frontend public IP;
- Application Gateway or Azure Front Door for supported application traffic;
- NAT Gateway for predictable outbound source addresses;
- Azure Bastion for administrative SSH and RDP without a VM public IP;
- VPN Gateway or ExpressRoute for private administration;
- Private Link for supported Azure services.

Ingress and egress stability are separate designs. A static inbound public IP on the VM does not guarantee the source address used by every outbound connection.

## Recover after an unexpected change

1. Confirm the VM's current power state and recent deallocate or redeploy operations.
2. Inspect the NIC IP configuration and attached public IP resource.
3. Determine whether inbound, outbound, or private addressing changed.
4. Update stale DNS or allowlists only as a temporary recovery step.
5. Create and attach a static Standard public IP, or place the workload behind a stable frontend.
6. Test NSGs, guest firewall, routes, and application listeners.
7. Remove old public IP resources only after confirming they are unused.

An old dynamic IP generally cannot be reclaimed on demand. Treat the current attachment and allocation method as authoritative.

## Prevent address-dependent incidents

Inventory literal IP dependencies before planned deallocation, resize, redeploy, or maintenance. Where an IP is part of an external contract, manage the public IP resource independently in infrastructure as code and protect it from accidental deletion.

For administration, eliminate internet-exposed ports when possible. A changing RDP or SSH endpoint is inconvenient, but a permanent open endpoint also expands the attack surface. Bastion or private connectivity solves both problems.

## Official Documentation

- [Create, change, or delete an Azure public IP address](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address)
- [Upgrade Basic Public IP Address to Standard SKU in Azure](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-basic-upgrade-guidance)
- [Configure IP addresses for an Azure network interface](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses)
- [Redeploy a Windows VM to a new Azure node](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
- [Azure Bastion overview](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview)

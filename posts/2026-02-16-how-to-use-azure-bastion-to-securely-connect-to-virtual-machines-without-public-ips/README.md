# Use Azure Bastion to Securely Connect to Virtual Machines Without Public IPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bastion, Virtual Machine, Security, SSH, RDP, Zero Trust, Networking

Description: Learn how to deploy Azure Bastion to securely connect to Azure VMs over SSH and RDP without exposing public IP addresses.

---

Exposing SSH port 22 or RDP port 3389 to the internet is a security risk, even with strong passwords and NSG rules. Bots constantly scan for open management ports, and one misconfigured rule can expose your entire infrastructure. Azure Bastion eliminates this internet-facing attack surface by providing a managed PaaS service that lets you connect to VMs through the Azure portal - no public IPs on the VMs, no internet-sourced NSG rules for management ports, and no VPN clients required.

In this guide, I will show you how to deploy Azure Bastion, connect to your VMs, and understand the different SKUs and features available.

## How Azure Bastion Works

Azure Bastion usually sits in a dedicated subnet within your virtual network. When you want to connect to a VM, you open the Azure portal (or use the CLI), and Bastion establishes an SSH or RDP session through a TLS-encrypted connection in your browser or through a native client. The traffic between Bastion and the VM uses the VM's private IP address.

```mermaid
flowchart LR
    User[Your Browser] -->|HTTPS/TLS| Bastion[Azure Bastion]
    Bastion -->|Private Network| VM[VM - No Public IP]
    style User fill:#e1f5fe
    style Bastion fill:#fff3e0
    style VM fill:#e8f5e9
```

Key points:
- VMs do not need public IP addresses.
- No SSH or RDP ports are exposed to the internet.
- Browser-based connections do not need a local SSH/RDP client.
- All traffic is encrypted with TLS.
- Azure RBAC controls access to the Bastion resource and target VM metadata. VM sign-in still uses the authentication method configured for the VM, such as local credentials, SSH keys, or Microsoft Entra ID where supported.

## Bastion SKUs

Azure Bastion comes in four SKUs:

**Basic**: Provides a dedicated deployment with two fixed instances. It supports portal-based SSH/RDP and concurrent connections, but not advanced features like native client access, shareable links, custom ports, or file transfer. Good for smaller production environments.

**Standard**: Supports host scaling from 2 to 50 instances. Adds native client support (`az network bastion ssh`, `az network bastion rdp`, and `az network bastion tunnel`), file transfer through native clients, IP-based connections, custom ports, and shareable links.

**Premium**: Includes Standard features plus session recording and private-only deployment.

**Developer**: Free, single-VM-at-a-time option for individual development and test scenarios in supported regions. No dedicated subnet or public IP is required, but it is not suitable for production workloads.

For most teams, the Standard SKU is a good starting point because it supports native CLI access and file transfers. Teams that need session recording or private-only Bastion should use Premium.

## Prerequisites

Azure Bastion dedicated deployments require a subnet named `AzureBastionSubnet` in your virtual network. This is not optional for Basic, Standard, or Premium - the name must be exactly `AzureBastionSubnet`.

The subnet must be at least /26 (64 addresses) for the Basic, Standard, and Premium SKUs. The Developer SKU uses shared infrastructure and does not require this subnet.

## Deploying Azure Bastion

### Step 1: Create the Bastion Subnet

If your virtual network does not already have a `AzureBastionSubnet`:

```bash
# Add the AzureBastionSubnet to your existing virtual network

az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name AzureBastionSubnet \
  --address-prefix 10.0.2.0/26
```

### Step 2: Create a Public IP for Bastion

Bastion itself needs a public IP (this is the entry point for your browser connections):

```bash
# Create a static Standard public IP for Bastion
az network public-ip create \
  --resource-group myResourceGroup \
  --name bastionPublicIP \
  --sku Standard \
  --allocation-method Static \
  --location eastus
```

### Step 3: Create the Bastion Host

```bash
# Create an Azure Bastion host with the Standard SKU
az network bastion create \
  --resource-group myResourceGroup \
  --name myBastion \
  --public-ip-address bastionPublicIP \
  --vnet-name myVNet \
  --sku Standard \
  --enable-tunneling true \
  --file-copy true \
  --shareable-link true \
  --location eastus
```

Bastion deployment takes about 10 minutes. Once deployed, it is ready to use.

## Connecting via the Azure Portal

The simplest way to connect:

1. Navigate to your VM in the Azure portal.
2. Click "Connect" in the top menu.
3. Select "Bastion."
4. Enter your credentials:
   - For Linux: Username and password, or SSH private key (paste it directly into the browser).
   - For Windows: Username and password.
5. Click "Connect."

A new browser tab opens with the SSH or RDP session. The session runs entirely in the browser - no client software needed.

## Connecting via the Azure CLI (Standard SKU)

With the Standard SKU and native client support enabled, you can use the native SSH client through the `az network bastion ssh` command:

```bash
# Connect using the native SSH client through Bastion
VM_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --query id \
  --output tsv)

az network bastion ssh \
  --resource-group myResourceGroup \
  --name myBastion \
  --target-resource-id "$VM_ID" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

Or use a tunnel for tools that need direct SSH access:

```bash
# Create an SSH tunnel through Bastion
az network bastion tunnel \
  --resource-group myResourceGroup \
  --name myBastion \
  --target-resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myLinuxVM" \
  --resource-port 22 \
  --port 2222
```

This creates a tunnel on localhost port 2222. In another terminal:

```bash
# Connect through the tunnel using your regular SSH client
ssh -p 2222 azureuser@localhost
```

This is useful when you need to use SSH tools that cannot run in a browser, like SCP for file transfers or VS Code Remote SSH.

## Connecting to Windows VMs via RDP

For Windows VMs through the portal:

1. Navigate to the Windows VM.
2. Click "Connect" > "Bastion."
3. Enter the Windows username and password.
4. Click "Connect."

A full RDP session opens in your browser. The experience is similar to a native RDP client, with support for clipboard sharing and screen resizing.

For native RDP client access (Standard SKU):

```bash
# Create an RDP tunnel through Bastion
az network bastion tunnel \
  --resource-group myResourceGroup \
  --name myBastion \
  --target-resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myWindowsVM" \
  --resource-port 3389 \
  --port 33389
```

Then connect with your RDP client to `localhost:33389`. On Windows clients, you can also use `az network bastion rdp` to open the native RDP client directly.

## File Transfer (Standard SKU)

The Standard SKU supports file upload and download through native clients. Azure Bastion does not support file upload or download through the Azure portal session.

For SSH file transfers, use the tunnel approach with SCP:

```bash
# Transfer a file through the Bastion tunnel
scp -P 2222 ./myfile.tar.gz azureuser@localhost:/home/azureuser/
```

## Shareable Links (Standard SKU)

Shareable links let you give someone access to a VM through Bastion without them needing Azure portal access:

1. In the Bastion resource, go to "Shareable links."
2. Click "Add."
3. Select the target VM.
4. Generate the link.

The recipient opens the link in their browser, enters the VM credentials, and gets connected. The link does not contain credentials, and it remains usable until it is deleted or the target resource is no longer available.

## Removing Public IPs from VMs

After deploying Bastion, remove public IPs from your VMs to eliminate the attack surface:

```bash
# Disassociate the public IP from a VM's NIC
NIC_NAME=$(az vm show \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --query networkProfile.networkInterfaces[0].id \
  --output tsv | xargs basename)

az network nic ip-config update \
  --resource-group myResourceGroup \
  --nic-name $NIC_NAME \
  --name ipconfig1 \
  --remove publicIpAddress

# Optionally delete the public IP resource
az network public-ip delete \
  --resource-group myResourceGroup \
  --name myLinuxVM-PublicIP
```

Also remove or restrict NSG rules that allowed SSH/RDP from the internet:

```bash
# Delete the NSG rule that allowed SSH from the internet
az network nsg rule delete \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name AllowSSH
```

## Cost Considerations

Azure Bastion pricing has two components:

- **Hourly rate**: Charged per hour while the Bastion host is deployed, based on SKU and instance count.
- **Data transfer**: Outbound data transfer charges apply.

Monthly cost depends on the SKU, number of instances, region, and outbound data transfer. Check the Azure Bastion pricing page for current rates before estimating production costs.

For dev/test environments where cost is a concern, you can deploy Bastion only when needed and delete it afterward. Or use the Developer SKU, which is free for supported development and test scenarios.

## Best Practices

1. **Use Bastion as your only management access path.** Remove all public IPs and close internet-sourced management ports in NSGs.
2. **Use Microsoft Entra ID where supported.** Use Microsoft Entra authentication for SSH or RDP when your VM and client scenario support it to reduce reliance on shared passwords and SSH keys.
3. **Use the Standard SKU for teams.** The native client support and file transfer capabilities are worth the extra cost.
4. **Monitor Bastion access.** Azure Bastion integrates with Azure Monitor. Review connection logs to track who accessed which VM and when.
5. **Pair with Just-In-Time access.** For an additional layer, combine Bastion with JIT VM access in Defender for Cloud.

## Wrapping Up

Azure Bastion is the cleanest way to manage Azure VMs securely. It removes the need for public IPs, eliminates the attack surface of exposed management ports, and provides a smooth connection experience through the browser or native clients. The setup takes about 15 minutes, and the ongoing cost is reasonable for the security improvement. If you have VMs with public IPs today, deploying Bastion and removing those IPs should be at the top of your to-do list.

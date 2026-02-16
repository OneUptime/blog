# How to Build Azure Bastion Host with Subnet Requirements in Bicep Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bastion, Bicep, Security, Virtual Network, Infrastructure as Code, Remote Access

Description: A complete guide to deploying Azure Bastion Host with proper subnet configuration and NSG rules using Bicep templates for secure VM access.

---

Azure Bastion provides secure RDP and SSH access to your virtual machines without exposing them to the public internet. Instead of assigning public IP addresses to each VM or maintaining a jump box, Bastion sits inside your virtual network and brokers connections through the Azure portal or native clients. The catch is that Bastion has very specific subnet requirements that trip up a lot of people during deployment.

This post walks through a complete Bicep template for Azure Bastion, including the exact subnet configuration, NSG rules, and public IP setup that Bastion demands.

## Understanding Bastion's Subnet Requirements

Azure Bastion is picky about its networking. Here are the non-negotiable requirements:

1. The subnet must be named exactly `AzureBastionSubnet`. No other name works.
2. The subnet must be at least a /26 (64 addresses) for the Basic SKU and at least a /26 for Standard as well, though Microsoft recommends /26 or larger.
3. The subnet needs a Network Security Group with specific inbound and outbound rules.
4. Bastion requires a public IP address with the Standard SKU and static allocation.

If any of these are wrong, the deployment will fail with sometimes cryptic error messages. Getting them right in a Bicep template means you never have to debug them again.

## The Complete Bicep Template

Let us build the full template. It creates the VNet, the Bastion subnet, the required NSG, the public IP, and the Bastion host itself.

```bicep
// Parameters for flexible deployment
param location string = resourceGroup().location
param bastionHostName string = 'bastion-host'
param vnetName string = 'vnet-main'
param vnetAddressPrefix string = '10.0.0.0/16'
param bastionSubnetPrefix string = '10.0.255.0/26'   // Using the end of the range for Bastion
param bastionSku string = 'Standard'   // 'Basic' or 'Standard'

// Tags for resource organization
var tags = {
  Environment: 'production'
  ManagedBy: 'bicep'
  Service: 'bastion'
}
```

## Network Security Group for Bastion

The NSG rules for Bastion are well-documented but easy to get wrong. Bastion needs specific inbound rules for HTTPS traffic from the internet and from the GatewayManager service, plus outbound rules for communicating with VMs and Azure services.

```bicep
// NSG for the AzureBastionSubnet - these rules are required by Azure Bastion
resource bastionNsg 'Microsoft.Network/networkSecurityGroups@2023-09-01' = {
  name: 'nsg-bastion'
  location: location
  tags: tags
  properties: {
    securityRules: [
      // ---- INBOUND RULES ----
      {
        // Allow HTTPS from the internet for portal-based connections
        name: 'AllowHttpsInbound'
        properties: {
          priority: 120
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        // Allow GatewayManager for Bastion control plane
        name: 'AllowGatewayManagerInbound'
        properties: {
          priority: 130
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'GatewayManager'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        // Allow Azure Load Balancer health probes
        name: 'AllowAzureLoadBalancerInbound'
        properties: {
          priority: 140
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'AzureLoadBalancer'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        // Allow Bastion data plane communication between hosts
        name: 'AllowBastionHostCommunicationInbound'
        properties: {
          priority: 150
          direction: 'Inbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRanges: [
            '8080'
            '5701'
          ]
        }
      }

      // ---- OUTBOUND RULES ----
      {
        // Allow SSH to target VMs in the virtual network
        name: 'AllowSshRdpOutbound'
        properties: {
          priority: 100
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRanges: [
            '22'     // SSH
            '3389'   // RDP
          ]
        }
      }
      {
        // Allow HTTPS outbound to Azure cloud for diagnostics and metrics
        name: 'AllowAzureCloudOutbound'
        properties: {
          priority: 110
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: 'AzureCloud'
          destinationPortRange: '443'
        }
      }
      {
        // Allow Bastion data plane communication between hosts
        name: 'AllowBastionHostCommunicationOutbound'
        properties: {
          priority: 120
          direction: 'Outbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRanges: [
            '8080'
            '5701'
          ]
        }
      }
      {
        // Allow HTTP outbound for session information
        name: 'AllowHttpOutbound'
        properties: {
          priority: 130
          direction: 'Outbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: 'Internet'
          destinationPortRange: '80'
        }
      }
    ]
  }
}
```

These NSG rules are not optional. Azure validates them during Bastion deployment, and missing any of them will cause the deployment to fail.

## Virtual Network and Bastion Subnet

The VNet and the specially-named subnet come next.

```bicep
// Virtual Network
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        // This name is mandatory - Azure Bastion will not work with any other name
        name: 'AzureBastionSubnet'
        properties: {
          addressPrefix: bastionSubnetPrefix
          networkSecurityGroup: {
            id: bastionNsg.id
          }
        }
      }
      {
        // A workload subnet for VMs that Bastion will connect to
        name: 'WorkloadSubnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
        }
      }
    ]
  }
}

// Reference to the Bastion subnet (for use in the Bastion resource)
resource bastionSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' existing = {
  parent: vnet
  name: 'AzureBastionSubnet'
}
```

## Public IP Address

Bastion requires a Standard SKU static public IP address. The Basic SKU public IP will not work.

```bicep
// Public IP for Azure Bastion - must be Standard SKU and Static
resource bastionPublicIp 'Microsoft.Network/publicIPAddresses@2023-09-01' = {
  name: 'pip-bastion'
  location: location
  tags: tags
  sku: {
    name: 'Standard'   // Basic SKU is not supported for Bastion
  }
  properties: {
    publicIPAllocationMethod: 'Static'   // Must be static, not dynamic
    publicIPAddressVersion: 'IPv4'
    idleTimeoutInMinutes: 4
  }
}
```

## The Bastion Host Resource

With all prerequisites in place, the Bastion host itself is relatively simple.

```bicep
// Azure Bastion Host
resource bastionHost 'Microsoft.Network/bastionHosts@2023-09-01' = {
  name: bastionHostName
  location: location
  tags: tags
  sku: {
    name: bastionSku
  }
  properties: {
    // Standard SKU features
    enableTunneling: bastionSku == 'Standard'     // Native client support
    enableFileCopy: bastionSku == 'Standard'       // File transfer support
    enableIpConnect: bastionSku == 'Standard'      // Connect by IP address
    enableShareableLink: false                      // Shareable links (optional)
    scaleUnits: bastionSku == 'Standard' ? 2 : 2   // 2 is the minimum

    // IP configuration linking to the subnet and public IP
    ipConfigurations: [
      {
        name: 'bastion-ip-config'
        properties: {
          publicIPAddress: {
            id: bastionPublicIp.id
          }
          subnet: {
            id: bastionSubnet.id
          }
        }
      }
    ]
  }
}
```

The Standard SKU unlocks several features that the Basic SKU does not support:

- **Native client support (tunneling)** - Connect using your local SSH or RDP client instead of the browser
- **File copy** - Transfer files to and from the target VM through the Bastion connection
- **IP connect** - Connect to a VM by IP address, even if it is in a peered VNet
- **Scale units** - Control the number of concurrent sessions (each unit supports about 20 concurrent SSH or 40 concurrent RDP sessions)

## Adding a Test VM

To verify the setup works end-to-end, add a test VM in the workload subnet.

```bicep
// Network interface for the test VM (no public IP needed)
resource testVmNic 'Microsoft.Network/networkInterfaces@2023-09-01' = {
  name: 'nic-test-vm'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          subnet: {
            id: vnet.properties.subnets[1].id   // WorkloadSubnet
          }
          privateIPAllocationMethod: 'Dynamic'
          // No public IP - Bastion provides the access
        }
      }
    ]
  }
}

// Test VM accessible only through Bastion
resource testVm 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: 'vm-test-bastion'
  location: location
  tags: tags
  properties: {
    hardwareProfile: {
      vmSize: 'Standard_B2s'
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Standard_LRS'
        }
      }
    }
    osProfile: {
      computerName: 'vm-test'
      adminUsername: 'azureuser'
      adminPassword: 'P@ssw0rd1234!'   // Use Key Vault in production
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: testVmNic.id
        }
      ]
    }
  }
}
```

## Outputs

Export useful values for connecting through Bastion.

```bicep
// Deployment outputs
output bastionHostId string = bastionHost.id
output bastionPublicIp string = bastionPublicIp.properties.ipAddress
output bastionDnsName string = bastionHost.properties.dnsName
output testVmPrivateIp string = testVmNic.properties.ipConfigurations[0].properties.privateIPAddress
```

## Deploying the Template

Deploy everything with a single Azure CLI command.

```bash
# Create the resource group
az group create --name rg-bastion-demo --location eastus2

# Deploy the Bicep template
az deployment group create \
  --resource-group rg-bastion-demo \
  --template-file main.bicep \
  --parameters bastionHostName='bastion-prod' bastionSku='Standard'
```

Bastion deployment takes about 5-10 minutes, which is significantly longer than most Azure resources. This is normal - do not cancel the deployment thinking it is stuck.

## Common Deployment Errors

Here are the most frequent issues people run into:

1. **Subnet name is wrong** - The error will say something about the subnet not being found. Double-check it is exactly `AzureBastionSubnet`.
2. **Subnet is too small** - A /27 or smaller will fail. Use /26 at minimum.
3. **Missing NSG rules** - The deployment might succeed but Bastion will not work. Check all the required rules are present.
4. **Basic SKU public IP** - You will get a clear error about the public IP SKU. Switch to Standard.
5. **Subnet already in use** - If you are adding Bastion to an existing VNet, make sure the `AzureBastionSubnet` address range does not overlap with existing subnets.

## Wrapping Up

Azure Bastion is one of those services that is straightforward once you know the specific requirements but frustrating to debug if you miss something. By encoding all the requirements - the subnet name, size, NSG rules, and public IP configuration - in a Bicep template, you avoid these pitfalls entirely. The template in this post gives you a production-ready Bastion deployment that you can parameterize for different environments and VNet configurations.

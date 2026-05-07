# How to Configure IPv6 with Azure ARM Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, ARM Templates, Infrastructure as Code, Bicep, Dual-Stack

Description: Write Azure Resource Manager (ARM) templates and Bicep code to deploy dual-stack IPv6-enabled Azure infrastructure including VNets, NICs, load balancers, and public IPs.

## Introduction

Azure Resource Manager (ARM) templates and Bicep provide declarative infrastructure deployment for IPv6-enabled Azure resources. ARM templates express IPv6 configuration through address space arrays, IP configuration versions, and public IP address versions. This guide covers common IPv6 ARM template patterns.

## Bicep Template for Dual-Stack VNet

```bicep
// main.bicep - Dual-stack VNet with IPv6

param location string = resourceGroup().location
param vnetName string = 'vnet-dualstack'

resource vnet 'Microsoft.Network/virtualNetworks@2022-07-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'       // IPv4
        'fd00:db8::/48'     // IPv6
      ]
    }
    subnets: [
      {
        name: 'subnet-web'
        properties: {
          addressPrefixes: [
            '10.0.1.0/24'
            'fd00:db8:0:1::/64'
          ]
        }
      }
      {
        name: 'subnet-app'
        properties: {
          addressPrefixes: [
            '10.0.2.0/24'
            'fd00:db8:0:2::/64'
          ]
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetIPv6Prefix string = vnet.properties.addressSpace.addressPrefixes[1]
```

## Bicep Template for Dual-Stack NIC

```bicep
// nic.bicep - NIC with IPv4 and IPv6 configurations

param nicName string = 'nic-web-01'
param subnetId string
param location string = resourceGroup().location

resource pipIPv6 'Microsoft.Network/publicIPAddresses@2022-07-01' = {
  name: 'pip-web-ipv6'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Regional'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv6'
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2022-07-01' = {
  name: nicName
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipv4-config'
        properties: {
          primary: true
          subnet: {
            id: subnetId
          }
          privateIPAddressVersion: 'IPv4'
          privateIPAllocationMethod: 'Dynamic'
        }
      }
      {
        name: 'ipv6-config'
        properties: {
          primary: false
          subnet: {
            id: subnetId
          }
          privateIPAddressVersion: 'IPv6'
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: pipIPv6.id
          }
        }
      }
    ]
  }
}

output nicId string = nic.id
output ipv6Address string = nic.properties.ipConfigurations[1].properties.privateIPAddress
```

## ARM Template JSON for Load Balancer with IPv6

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "resources": [
        {
            "type": "Microsoft.Network/publicIPAddresses",
            "apiVersion": "2022-07-01",
            "name": "pip-lb-ipv4",
            "location": "[resourceGroup().location]",
            "sku": { "name": "Standard" },
            "properties": {
                "publicIPAllocationMethod": "Static",
                "publicIPAddressVersion": "IPv4"
            }
        },
        {
            "type": "Microsoft.Network/publicIPAddresses",
            "apiVersion": "2022-07-01",
            "name": "pip-lb-ipv6",
            "location": "[resourceGroup().location]",
            "sku": { "name": "Standard" },
            "properties": {
                "publicIPAllocationMethod": "Static",
                "publicIPAddressVersion": "IPv6"
            }
        },
        {
            "type": "Microsoft.Network/loadBalancers",
            "apiVersion": "2022-07-01",
            "name": "lb-dualstack",
            "location": "[resourceGroup().location]",
            "sku": { "name": "Standard" },
            "dependsOn": [
                "[resourceId('Microsoft.Network/publicIPAddresses', 'pip-lb-ipv4')]",
                "[resourceId('Microsoft.Network/publicIPAddresses', 'pip-lb-ipv6')]"
            ],
            "properties": {
                "frontendIPConfigurations": [
                    {
                        "name": "frontend-ipv4",
                        "properties": {
                            "publicIPAddress": {
                                "id": "[resourceId('Microsoft.Network/publicIPAddresses', 'pip-lb-ipv4')]"
                            }
                        }
                    },
                    {
                        "name": "frontend-ipv6",
                        "properties": {
                            "publicIPAddress": {
                                "id": "[resourceId('Microsoft.Network/publicIPAddresses', 'pip-lb-ipv6')]"
                            }
                        }
                    }
                ],
                "backendAddressPools": [{ "name": "backend-pool" }],
                "probes": [
                    {
                        "name": "tcp-probe-ipv6",
                        "properties": {
                            "protocol": "Tcp",
                            "port": 80
                        }
                    }
                ],
                "loadBalancingRules": [
                    {
                        "name": "rule-http-ipv6",
                        "properties": {
                            "frontendIPConfiguration": {
                                "id": "[concat(resourceId('Microsoft.Network/loadBalancers', 'lb-dualstack'), '/frontendIPConfigurations/frontend-ipv6')]"
                            },
                            "backendAddressPool": {
                                "id": "[concat(resourceId('Microsoft.Network/loadBalancers', 'lb-dualstack'), '/backendAddressPools/backend-pool')]"
                            },
                            "probe": {
                                "id": "[concat(resourceId('Microsoft.Network/loadBalancers', 'lb-dualstack'), '/probes/tcp-probe-ipv6')]"
                            },
                            "protocol": "Tcp",
                            "frontendPort": 80,
                            "backendPort": 80
                        }
                    }
                ]
            }
        }
    ]
}
```

## Deploy ARM Template

```bash
# Deploy Bicep template

az deployment group create \
    --resource-group "$RG" \
    --template-file main.bicep \
    --parameters vnetName=vnet-production

# What-if preview
az deployment group what-if \
    --resource-group "$RG" \
    --template-file main.bicep

# Validate template
az deployment group validate \
    --resource-group "$RG" \
    --template-file main.bicep
```

## Conclusion

ARM templates and Bicep support Azure IPv6-enabled networking resources through the same property names as the REST API. Key properties: `addressPrefixes` arrays include IPv6 CIDRs alongside IPv4, `publicIPAddressVersion: 'IPv6'` for IPv6 public IPs, and `privateIPAddressVersion: 'IPv6'` for NIC IP configurations. Use Bicep for cleaner syntax compared to raw JSON ARM templates. Templates enable repeatable dual-stack deployments across environments, ensuring consistent IPv6 configuration in development, staging, and production.

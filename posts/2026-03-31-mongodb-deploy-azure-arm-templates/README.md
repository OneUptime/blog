# How to Deploy MongoDB on Azure with ARM Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Azure, ARM, Infrastructure

Description: Learn how to deploy a MongoDB replica set on Azure Virtual Machines using ARM templates with managed disks, VNet, NSG, and availability sets.

---

## Overview

Azure Resource Manager (ARM) templates are JSON files that declare the desired state of Azure infrastructure. This guide shows how to deploy a three-node MongoDB replica set on Azure VMs with managed Premium SSD disks, a virtual network, and network security groups.

## Template Structure

An ARM template has five main sections:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {},
  "variables": {},
  "resources": []
}
```

## Parameters

```json
"parameters": {
  "adminUsername": {
    "type": "string",
    "metadata": { "description": "Admin username for VMs" }
  },
  "adminPassword": {
    "type": "securestring",
    "metadata": { "description": "Admin password for VMs" }
  },
  "mongoReplicaSetName": {
    "type": "string",
    "defaultValue": "rs0"
  },
  "vmSize": {
    "type": "string",
    "defaultValue": "Standard_E4s_v5"
  },
  "diskSizeGB": {
    "type": "int",
    "defaultValue": 128
  }
}
```

## Virtual Network and NSG

```json
{
  "type": "Microsoft.Network/virtualNetworks",
  "apiVersion": "2023-04-01",
  "name": "mongo-vnet",
  "location": "[resourceGroup().location]",
  "dependsOn": ["mongo-nsg"],
  "properties": {
    "addressSpace": { "addressPrefixes": ["10.0.0.0/16"] },
    "subnets": [
      {
        "name": "mongo-subnet",
        "properties": {
          "addressPrefix": "10.0.1.0/24",
          "networkSecurityGroup": {
            "id": "[resourceId('Microsoft.Network/networkSecurityGroups', 'mongo-nsg')]"
          }
        }
      }
    ]
  }
}
```

```json
{
  "type": "Microsoft.Network/networkSecurityGroups",
  "apiVersion": "2023-04-01",
  "name": "mongo-nsg",
  "location": "[resourceGroup().location]",
  "properties": {
    "securityRules": [
      {
        "name": "AllowMongoIntraCluster",
        "properties": {
          "priority": 100,
          "protocol": "Tcp",
          "access": "Allow",
          "direction": "Inbound",
          "sourceAddressPrefix": "10.0.1.0/24",
          "destinationAddressPrefix": "*",
          "sourcePortRange": "*",
          "destinationPortRange": "27017"
        }
      }
    ]
  }
}
```

## Availability Set

```json
{
  "type": "Microsoft.Compute/availabilitySets",
  "apiVersion": "2023-03-01",
  "name": "mongo-avset",
  "location": "[resourceGroup().location]",
  "sku": { "name": "Aligned" },
  "properties": {
    "platformFaultDomainCount": 3,
    "platformUpdateDomainCount": 5
  }
}
```

## Virtual Machine (repeated for each node)

```json
{
  "type": "Microsoft.Compute/virtualMachines",
  "apiVersion": "2023-03-01",
  "name": "mongo-node-0",
  "location": "[resourceGroup().location]",
  "dependsOn": ["mongo-avset", "mongo-nic-0"],
  "properties": {
    "availabilitySet": {
      "id": "[resourceId('Microsoft.Compute/availabilitySets', 'mongo-avset')]"
    },
    "hardwareProfile": { "vmSize": "[parameters('vmSize')]" },
    "osProfile": {
      "computerName": "mongo-node-0",
      "adminUsername": "[parameters('adminUsername')]",
      "adminPassword": "[parameters('adminPassword')]"
    },
    "storageProfile": {
      "osDisk": {
        "createOption": "FromImage",
        "managedDisk": { "storageAccountType": "Premium_LRS" }
      },
      "imageReference": {
        "publisher": "Canonical",
        "offer": "0001-com-ubuntu-server-jammy",
        "sku": "22_04-lts-gen2",
        "version": "latest"
      },
      "dataDisks": [
        {
          "lun": 0,
          "name": "mongo-node-0-data",
          "createOption": "Empty",
          "diskSizeGB": "[parameters('diskSizeGB')]",
          "managedDisk": { "storageAccountType": "Premium_LRS" }
        }
      ]
    },
    "networkProfile": {
      "networkInterfaces": [
        { "id": "[resourceId('Microsoft.Network/networkInterfaces', 'mongo-nic-0')]" }
      ]
    }
  }
}
```

## Custom Script Extension to Install MongoDB

```json
{
  "type": "Microsoft.Compute/virtualMachines/extensions",
  "apiVersion": "2023-03-01",
  "name": "mongo-node-0/installMongo",
  "location": "[resourceGroup().location]",
  "dependsOn": ["mongo-node-0"],
  "properties": {
    "publisher": "Microsoft.Azure.Extensions",
    "type": "CustomScript",
    "typeHandlerVersion": "2.1",
    "protectedSettings": {
      "script": "[base64(concat('#!/bin/bash\ncurl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg\necho \"deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse\" > /etc/apt/sources.list.d/mongodb-org-7.0.list\napt-get update && apt-get install -y mongodb-org\nmkfs.xfs /dev/sdc && mkdir -p /data/mongodb && mount /dev/sdc /data/mongodb\nchown -R mongodb:mongodb /data/mongodb\nsed -i \"s|dbPath: /var/lib/mongodb|dbPath: /data/mongodb|\" /etc/mongod.conf\nsed -i \"s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/\" /etc/mongod.conf\necho -e \"\\nreplication:\\n  replSetName: rs0\" >> /etc/mongod.conf\nsystemctl enable mongod && systemctl start mongod\n'))]"
    }
  }
}
```

## Deploying with Azure CLI

```bash
az group create --name mongo-rg --location eastus

az deployment group create \
  --resource-group mongo-rg \
  --template-file mongo-deploy.json \
  --parameters adminUsername=mongoadmin adminPassword=<secure-password>
```

## Summary

Use ARM templates to declare VNets, NSGs, availability sets, VMs with Premium SSD managed data disks, and custom script extensions in a single idempotent deployment. Restrict port 27017 to the internal subnet CIDR using NSG rules. Use an availability set with three fault domains to distribute replica set nodes across separate physical hardware. Store sensitive parameters like passwords as `securestring` to prevent them from appearing in deployment logs.

# How to Deploy Dapr Applications to Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Deployment, Azure, Cloud

Description: Deploy Dapr-enabled microservices to Azure Container Apps using the Azure CLI and Bicep, with managed Dapr runtime and automatic sidecar injection.

---

## Overview

Azure Container Apps (ACA) provides managed Dapr support, eliminating the need to manage the Dapr runtime yourself. You enable Dapr per container app and Azure handles sidecar injection and configuration.

## Prerequisites

- Azure CLI v2.50+
- Azure subscription
- Container image in Azure Container Registry (ACR)

## Step 1: Create the Environment

```bash
az group create --name rg-dapr-demo --location eastus

az containerapp env create \
  --name aca-dapr-env \
  --resource-group rg-dapr-demo \
  --location eastus
```

## Step 2: Deploy a Dapr-Enabled App

```bash
az containerapp create \
  --name orders-service \
  --resource-group rg-dapr-demo \
  --environment aca-dapr-env \
  --image myacr.azurecr.io/orders:latest \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --enable-dapr \
  --dapr-app-id orders-service \
  --dapr-app-port 8080 \
  --dapr-app-protocol http
```

## Step 3: Define the App with Bicep

```bicep
// containerapp.bicep
resource ordersApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'orders-service'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      dapr: {
        enabled: true
        appId: 'orders-service'
        appPort: 8080
        appProtocol: 'http'
        enableApiLogging: true
        logLevel: 'info'
      }
    }
    template: {
      containers: [
        {
          name: 'orders'
          image: 'myacr.azurecr.io/orders:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}
```

Deploy:

```bash
az deployment group create \
  --resource-group rg-dapr-demo \
  --template-file containerapp.bicep
```

## Step 4: Add a Dapr Component

Create an Azure Service Bus pub/sub component:

```bash
az containerapp env dapr-component set \
  --name aca-dapr-env \
  --resource-group rg-dapr-demo \
  --dapr-component-name pubsub \
  --yaml - <<EOF
componentType: pubsub.azure.servicebus.queues
version: v1
metadata:
  - name: connectionString
    secretRef: sb-connection-string
secrets:
  - name: sb-connection-string
    value: "<your-connection-string>"
EOF
```

## Step 5: Verify Deployment

```bash
az containerapp show \
  --name orders-service \
  --resource-group rg-dapr-demo \
  --query properties.configuration.dapr

# Get the app FQDN and test the endpoint
FQDN=$(az containerapp show \
  --name orders-service \
  --resource-group rg-dapr-demo \
  --query properties.configuration.ingress.fqdn -o tsv)

curl https://$FQDN/
```

## Summary

Azure Container Apps provides first-class Dapr support with managed sidecar injection and built-in component management. Deploying a Dapr app requires only a few flags in the Azure CLI or a Bicep `dapr` configuration block. ACA handles the Dapr control plane entirely, letting you focus on application logic rather than runtime management.

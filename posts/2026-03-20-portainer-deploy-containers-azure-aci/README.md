# How to Deploy Containers to Azure ACI via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Docker, Cloud

Description: Learn how to deploy containers to Azure Container Instances using Portainer Business Edition's ACI environment integration, including configuration and monitoring.

## Introduction

With Azure ACI configured as an environment in Portainer, you can deploy containerized applications to Azure's serverless container platform directly from the Portainer UI. ACI is ideal for stateless workloads, batch jobs, and microservices that don't require persistent infrastructure management.

## Prerequisites

- Portainer BE with Azure ACI environment configured
- Azure ACI environment connected and showing green in Portainer
- Container images accessible from Azure (Docker Hub, ACR, or other registries)

## Step 1: Navigate to the ACI Environment

1. Log into Portainer.
2. From the **Home** dashboard, click on your **Azure ACI** environment.
3. You will see the ACI-specific interface with container groups.

## Step 2: Deploy a New Container

1. Click **Add container** in the ACI environment view.
2. Fill in the container configuration:

### Basic Configuration

- **Container name**: `my-web-app`
- **Image**: `nginx:1.25` (or your container image)
- **OS type**: Linux or Windows

Resource Configuration

```text
CPU:    1.0 vCPU  (minimum container group allocation: 1 vCPU)
Memory: 1.5 GB    (minimum container group allocation: 1 GB)
```

### Port Configuration

- **Port**: `80`
- **Protocol**: `TCP`

For HTTPS:
- Add port `443` with protocol `TCP`

## Step 3: Configure Environment Variables

Add environment variables your container needs:

```text
APP_ENV=production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/mydb
API_KEY=your-api-key-value
LOG_LEVEL=info
```

## Step 4: Configure Networking

ACI containers can have:

- **Public IP**: Expose a public IP address directly
- **Private networking**: Deploy into an Azure Virtual Network

For a public-facing container in Portainer:
1. Leave **Private Network** disabled
2. Map the ports you exposed above

For private networking in Portainer:
1. Enable **Private Network**
2. Select the **Virtual Network** and **Subnet**

## Step 5: Deploy via the Portainer API

For automated deployments to ACI:

```bash
# Authenticate with Portainer

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Get the ACI endpoint ID
ACI_ENDPOINT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints" | \
  jq -r '.[] | select(.Type == 3) | .Id')

echo "ACI Endpoint ID: $ACI_ENDPOINT"

# Get an Azure subscription ID available through this ACI environment
SUBSCRIPTION_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ACI_ENDPOINT}/azure/subscriptions?api-version=2016-06-01" | \
  jq -r '.value[0].subscriptionId')

# Deploy a container group to ACI through Portainer's Azure proxy
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/${ACI_ENDPOINT}/azure/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/portainer-aci-rg/providers/Microsoft.ContainerInstance/containerGroups/my-web-app?api-version=2018-04-01" \
  -d '{
    "location": "eastus",
    "properties": {
      "osType": "Linux",
      "containers": [
        {
          "name": "my-web-app",
          "properties": {
            "image": "nginx:1.25",
            "ports": [
              {
                "port": 80
              }
            ],
            "environmentVariables": [
              {
                "name": "APP_ENV",
                "value": "production"
              }
            ],
            "resources": {
              "requests": {
                "cpu": 1.0,
                "memoryInGB": 1.5
              }
            }
          }
        }
      ],
      "ipAddress": {
        "type": "Public",
        "ports": [
          {
            "port": 80,
            "protocol": "TCP"
          }
        ]
      }
    }
  }'
```

## Step 6: Deploy a Multi-Container Group

ACI supports running multiple Linux containers in the same container group (similar to a Kubernetes pod):

```bash
# Multi-container ACI deployment (app + sidecar)
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/${ACI_ENDPOINT}/azure/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/portainer-aci-rg/providers/Microsoft.ContainerInstance/containerGroups/app-with-sidecar?api-version=2018-04-01" \
  -d '{
    "location": "eastus",
    "properties": {
      "osType": "Linux",
      "containers": [
        {
          "name": "app",
          "properties": {
            "image": "myapp:latest",
            "ports": [
              {
                "port": 8080
              }
            ],
            "resources": {
              "requests": {
                "cpu": 1.0,
                "memoryInGB": 2.0
              }
            }
          }
        },
        {
          "name": "log-collector",
          "properties": {
            "image": "fluent/fluent-bit:latest",
            "resources": {
              "requests": {
                "cpu": 0.1,
                "memoryInGB": 0.2
              }
            }
          }
        }
      ],
      "ipAddress": {
        "type": "Public",
        "ports": [
          {
            "port": 8080,
            "protocol": "TCP"
          }
        ]
      }
    }
  }'
```

## Step 7: Monitor Running Containers

In Portainer's ACI view:

1. Click on a container group name to see details.
2. Review the **Container** tab for image, ports, environment variables, and resource settings.
3. Use the **Events** tab to inspect lifecycle events.
4. Use the **Actions** section to start, stop, restart, or remove the container.

Via Azure CLI:

```bash
# Check container group status
az container show \
  --resource-group portainer-aci-rg \
  --name my-web-app \
  --query '{status: instanceView.state, ip: ipAddress.ip}' \
  -o json

# View container logs
az container logs \
  --resource-group portainer-aci-rg \
  --name my-web-app
```

## Step 8: Stop and Delete Containers

In Portainer, select the container group and click **Stop** or **Remove**.

```bash
# Stop ACI container group
az container stop --resource-group portainer-aci-rg --name my-web-app

# Delete ACI container group
az container delete --resource-group portainer-aci-rg --name my-web-app --yes
```

## Conclusion

Deploying containers to Azure ACI via Portainer combines the simplicity of Azure's serverless container platform with Portainer's familiar management interface. Use ACI for on-demand, stateless, or run-to-completion workloads, and leverage Portainer's API for CI/CD pipeline integration. Monitor resource usage carefully as ACI charges per second of CPU and memory consumption.

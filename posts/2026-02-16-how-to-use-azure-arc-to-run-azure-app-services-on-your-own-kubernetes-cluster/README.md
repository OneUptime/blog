# How to Use Azure Arc to Run Azure App Services on Your Own Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, App Service, Kubernetes, Hybrid Cloud, PaaS, Web Apps

Description: Learn how to deploy Azure App Service on your own Kubernetes cluster using Azure Arc to run web apps and APIs on your infrastructure with Azure PaaS management.

---

Azure App Service is one of the most popular PaaS offerings in Azure. But what if you need the App Service experience on your own infrastructure? Maybe you have data residency requirements, need to run at the edge, or simply want to use hardware you already own. Azure Arc makes this possible by extending App Service to any Kubernetes cluster.

In this guide, I will show you how to set up an App Service environment on an Arc-connected Kubernetes cluster and deploy your first web application to it.

## How App Service on Arc Works

App Service on Arc uses a Kubernetes extension to deploy the App Service infrastructure into your cluster. This includes:

- **App Service controller** - Manages the lifecycle of apps
- **Envoy front-end** - Handles traffic routing and load balancing
- **Build service** - Handles source code deployment and container image builds
- **KEDA** - Provides event-driven autoscaling

Once the extension is installed and an App Service Kubernetes environment is created, you can deploy web apps, API apps, and function apps to it using the same tools and APIs you use with regular Azure App Service.

The experience from the developer's perspective is identical. They deploy using `az webapp up`, GitHub Actions, or any other deployment method they already use. The only difference is that the app runs on your Kubernetes cluster instead of Azure's infrastructure.

## Prerequisites

You need the following before getting started:

1. A Kubernetes cluster connected to Azure Arc
2. The cluster should have at least 4 nodes with 4 CPU and 16 GB RAM each
3. A default StorageClass configured in the cluster
4. A static IP address for the App Service front end (or a load balancer)
5. Azure CLI with the following extensions:

```bash
# Install required CLI extensions
az extension add --name connectedk8s --upgrade
az extension add --name k8s-extension --upgrade
az extension add --name customlocation --upgrade
az extension add --name appservice-kube --upgrade

# Register required providers
az provider register --namespace Microsoft.ExtendedLocation
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.KubernetesConfiguration
```

## Step 1: Install the App Service Extension

The App Service extension deploys all the necessary infrastructure components into your cluster:

```bash
# Create a Log Analytics workspace for App Service logs
az monitor log-analytics workspace create \
    --workspace-name "appservice-logs" \
    --resource-group "arc-appservice-rg" \
    --location "eastus"

# Get the workspace ID and key
LA_WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --workspace-name "appservice-logs" \
    --resource-group "arc-appservice-rg" \
    --query "customerId" --output tsv)

LA_WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
    --workspace-name "appservice-logs" \
    --resource-group "arc-appservice-rg" \
    --query "primarySharedKey" --output tsv)

# Install the App Service extension
az k8s-extension create \
    --resource-group "arc-k8s-rg" \
    --name "appservice-ext" \
    --cluster-type "connectedClusters" \
    --cluster-name "my-arc-cluster" \
    --extension-type "Microsoft.Web.Appservice" \
    --release-train "stable" \
    --auto-upgrade-minor-version true \
    --scope cluster \
    --release-namespace "appservice-ns" \
    --configuration-settings \
        "Microsoft.CustomLocation.ServiceAccount=default" \
        "appsNamespace=appservice-ns" \
        "clusterName=my-arc-cluster" \
        "keda.enabled=true" \
        "buildService.storageClassName=default" \
        "buildService.storageAccessMode=ReadWriteOnce" \
        "customConfigMap=appservice-ns/kube-environment-config" \
        "envoy.annotations.service.beta.kubernetes.io/azure-load-balancer-resource-group=arc-appservice-rg" \
        "logProcessor.appLogs.destination=log-analytics" \
    --configuration-protected-settings \
        "logProcessor.appLogs.logAnalyticsConfig.customerId=${LA_WORKSPACE_ID}" \
        "logProcessor.appLogs.logAnalyticsConfig.sharedKey=${LA_WORKSPACE_KEY}"
```

Wait for the extension to install (this can take 10-15 minutes):

```bash
# Check extension installation status
az k8s-extension show \
    --resource-group "arc-k8s-rg" \
    --name "appservice-ext" \
    --cluster-type "connectedClusters" \
    --cluster-name "my-arc-cluster" \
    --output table

# Watch the pods come up in the cluster
kubectl get pods -n appservice-ns --watch
```

## Step 2: Create a Custom Location

Custom locations are how Azure maps a Kubernetes namespace to an Azure location. This is what allows you to target your cluster when creating App Service resources:

```bash
# Get the extension ID
EXTENSION_ID=$(az k8s-extension show \
    --resource-group "arc-k8s-rg" \
    --name "appservice-ext" \
    --cluster-type "connectedClusters" \
    --cluster-name "my-arc-cluster" \
    --query "id" --output tsv)

# Get the connected cluster ID
CLUSTER_ID=$(az connectedk8s show \
    --resource-group "arc-k8s-rg" \
    --name "my-arc-cluster" \
    --query "id" --output tsv)

# Create the custom location
az customlocation create \
    --resource-group "arc-appservice-rg" \
    --name "my-appservice-location" \
    --host-resource-id "$CLUSTER_ID" \
    --namespace "appservice-ns" \
    --cluster-extension-ids "$EXTENSION_ID"
```

## Step 3: Create the App Service Kubernetes Environment

The Kubernetes environment is analogous to an App Service plan, but it runs on your cluster:

```bash
# Get the custom location ID
CUSTOM_LOCATION_ID=$(az customlocation show \
    --resource-group "arc-appservice-rg" \
    --name "my-appservice-location" \
    --query "id" --output tsv)

# Create the Kubernetes environment
az appservice kube create \
    --resource-group "arc-appservice-rg" \
    --name "my-kube-environment" \
    --custom-location "$CUSTOM_LOCATION_ID" \
    --static-ip "10.0.1.100"
```

The static IP should be an address that your load balancer or Envoy front end will use to receive traffic.

## Step 4: Deploy Your First Web App

Now you can deploy web apps to your cluster using familiar App Service commands:

```bash
# Create a web app on your Kubernetes cluster
az webapp create \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --custom-location "$CUSTOM_LOCATION_ID" \
    --runtime "NODE:18-lts"

# Deploy code from a GitHub repository
az webapp deployment source config \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --repo-url "https://github.com/your-org/your-app" \
    --branch "main" \
    --manual-integration

# Or deploy a container image
az webapp create \
    --resource-group "arc-appservice-rg" \
    --name "my-container-webapp" \
    --custom-location "$CUSTOM_LOCATION_ID" \
    --deployment-container-image-name "your-registry.azurecr.io/myapp:latest"
```

### Using the ZIP Deploy Method

For a quick deployment from your local machine:

```bash
# Create a ZIP of your application
cd /path/to/your/app
zip -r app.zip .

# Deploy using ZIP deploy
az webapp deployment source config-zip \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --src app.zip
```

## Configuring App Settings and Connection Strings

App settings work exactly the same as regular App Service:

```bash
# Set application settings
az webapp config appsettings set \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --settings \
        "DATABASE_HOST=mydb.internal.local" \
        "REDIS_URL=redis://cache.internal.local:6379" \
        "NODE_ENV=production"

# Set connection strings
az webapp config connection-string set \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --connection-string-type "SQLServer" \
    --settings \
        "DefaultConnection=Server=mydb;Database=myapp;User=sa;Password=secret"
```

## Scaling Your Apps

Scaling works through Kubernetes under the hood, but the interface is the same App Service experience:

```bash
# Scale out to multiple instances
az webapp scale \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --instance-count 3
```

For auto-scaling based on metrics, KEDA (which was installed with the extension) provides event-driven scaling. You can configure custom scaling rules:

```bash
# Configure custom auto-scale rules
az webapp update \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp" \
    --set siteConfig.functionAppScaleLimit=10
```

## Deploying Azure Functions on Arc

You can also run Azure Functions on your Arc-connected cluster:

```bash
# Create a function app on your cluster
az functionapp create \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-functions" \
    --custom-location "$CUSTOM_LOCATION_ID" \
    --storage-account "mystorageaccount" \
    --functions-version 4 \
    --runtime "dotnet-isolated"
```

This is useful for event-driven workloads that need to run close to your data or on specific hardware.

## Monitoring and Logs

App Service on Arc integrates with the same monitoring tools:

```bash
# Stream logs from your app
az webapp log tail \
    --resource-group "arc-appservice-rg" \
    --name "my-arc-webapp"

# View logs in Log Analytics
az monitor log-analytics query \
    --workspace "appservice-logs" \
    --analytics-query "AppServiceConsoleLogs | where AppName == 'my-arc-webapp' | top 50 by TimeGenerated" \
    --output table
```

In the Azure Portal, the app's monitoring blade shows the same familiar metrics: HTTP response codes, response times, request counts, and error rates.

## CI/CD Integration

You can set up continuous deployment using GitHub Actions, Azure DevOps, or any CI/CD platform that supports App Service deployment:

```yaml
# GitHub Actions workflow for deploying to App Service on Arc
name: Deploy to Arc App Service
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: my-arc-webapp
          package: .
```

## Limitations to Know About

App Service on Arc has some limitations compared to the full Azure App Service:

- Not all App Service features are supported (check Microsoft docs for the current list)
- Managed certificates are not available; you need to bring your own TLS certificates
- Some deployment methods may not be supported
- Performance depends on your cluster's resources and network

## Summary

Azure App Service on Arc-connected Kubernetes gives you the developer experience of App Service with the infrastructure control of running on your own cluster. The setup involves installing the App Service extension, creating a custom location and Kubernetes environment, and then deploying apps using the same tools you already know. For organizations that need PaaS capabilities on their own infrastructure, this is a compelling solution that avoids the complexity of building a custom platform.

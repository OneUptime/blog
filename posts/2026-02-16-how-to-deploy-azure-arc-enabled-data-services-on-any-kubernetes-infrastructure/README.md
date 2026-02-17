# How to Deploy Azure Arc-Enabled Data Services on Any Kubernetes Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, Data Services, Kubernetes, SQL Managed Instance, PostgreSQL, Hybrid Cloud

Description: Learn how to deploy Azure Arc-enabled data services like SQL Managed Instance and PostgreSQL on any Kubernetes cluster running anywhere.

---

Azure Arc-enabled data services bring Azure's managed database experience to any Kubernetes cluster. Whether your cluster runs on-premises, at the edge, or in another cloud, you can deploy SQL Managed Instance and PostgreSQL with the same Azure management experience you get in the cloud. You get elastic scaling, automated patching, point-in-time restore, and Azure Portal integration, all running on your own infrastructure.

In this post, I will walk through deploying Arc-enabled data services from scratch, starting with the data controller and then deploying a SQL Managed Instance.

## Architecture Overview

Arc-enabled data services consist of several components:

**Data Controller** - The management plane that runs in your Kubernetes cluster. It handles provisioning, scaling, patching, and monitoring of data service instances. Think of it as a local control plane for Azure data services.

**Data Service Instances** - The actual databases (SQL Managed Instance, PostgreSQL). These run as pods in your Kubernetes cluster and are managed by the data controller.

**Monitoring Stack** - Grafana and Kibana dashboards that run locally, plus the ability to export metrics and logs to Azure Monitor.

The data controller communicates with Azure for billing, telemetry, and (optionally) management operations. There are two connectivity modes:

- **Directly connected** - The data controller maintains a constant connection to Azure. Management can be done from the Azure Portal.
- **Indirectly connected** - The data controller operates independently and periodically uploads usage data to Azure. Management is done through local tools.

## Prerequisites

Before deploying, you need:

**Kubernetes cluster requirements:**
- Kubernetes 1.24 or later
- At least 4 nodes with 16 GB RAM and 4 CPU cores each (for a production-like setup)
- A default StorageClass configured
- The cluster must be connected to Azure Arc (see my guide on connecting clusters)
- LoadBalancer or NodePort service type support

**Tools:**
- Azure CLI with the `arcdata` extension
- kubectl configured for your cluster

```bash
# Install the arcdata extension
az extension add --name arcdata --upgrade

# Verify your cluster meets the requirements
kubectl get nodes -o wide
kubectl get storageclass
```

## Step 1: Deploy the Data Controller

The data controller is the first thing you deploy. It sets up the management infrastructure in your cluster.

### Using Azure CLI (Directly Connected Mode)

```bash
# Create a custom location first (required for directly connected mode)
az connectedk8s enable-features \
    --name "my-arc-cluster" \
    --resource-group "arc-k8s-rg" \
    --features custom-locations

# Create the custom location
az customlocation create \
    --name "my-dc-location" \
    --resource-group "arc-data-rg" \
    --namespace "arc-data" \
    --host-resource-id "/subscriptions/sub-id/resourceGroups/arc-k8s-rg/providers/Microsoft.Kubernetes/connectedClusters/my-arc-cluster" \
    --cluster-extension-ids "/subscriptions/sub-id/resourceGroups/arc-k8s-rg/providers/Microsoft.Kubernetes/connectedClusters/my-arc-cluster/providers/Microsoft.KubernetesConfiguration/extensions/arc-data-services"

# Deploy the data controller
az arcdata dc create \
    --name "my-data-controller" \
    --resource-group "arc-data-rg" \
    --connectivity-mode "direct" \
    --location "eastus" \
    --custom-location "my-dc-location" \
    --storage-class "managed-premium" \
    --infrastructure "onpremises" \
    --k8s-namespace "arc-data"
```

### Using a Configuration Profile

For more control over the data controller configuration, use a profile:

```bash
# Create a configuration profile from a template
az arcdata dc config init \
    --source "azure-arc-kubeadm" \
    --path "./dc-config"

# Customize the configuration
# Edit the control.json file to set storage class, service type, etc.
```

The configuration file at `./dc-config/control.json` lets you customize many aspects:

```json
{
  "apiVersion": "arcdata.microsoft.com/v1",
  "kind": "DataController",
  "metadata": {
    "name": "my-data-controller",
    "namespace": "arc-data"
  },
  "spec": {
    "credentials": {
      "controllerAdmin": "controller-admin",
      "serviceAccount": "sa-arc-controller"
    },
    "storage": {
      "data": {
        // Storage class for data files
        "className": "managed-premium",
        "accessMode": "ReadWriteOnce",
        "size": "50Gi"
      },
      "logs": {
        // Storage class for log files
        "className": "managed-premium",
        "accessMode": "ReadWriteOnce",
        "size": "10Gi"
      }
    },
    "services": [
      {
        "name": "controller",
        // Use LoadBalancer for external access, ClusterIP for internal
        "serviceType": "LoadBalancer",
        "port": 30080
      }
    ],
    "settings": {
      "azure": {
        "connectionMode": "direct",
        "location": "eastus",
        "resourceGroup": "arc-data-rg",
        "subscription": "your-subscription-id"
      }
    }
  }
}
```

### Verify the Data Controller Deployment

```bash
# Watch the data controller pods come up
kubectl get pods -n arc-data --watch

# Check data controller status
az arcdata dc status show \
    --name "my-data-controller" \
    --k8s-namespace "arc-data" \
    --use-k8s
```

You should see several pods running, including the controller, the monitoring components (Grafana, Elasticsearch), and the control database.

## Step 2: Deploy SQL Managed Instance

With the data controller running, you can now deploy database instances.

```bash
# Create a SQL Managed Instance
az sql mi-arc create \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --custom-location "my-dc-location" \
    --storage-class-data "managed-premium" \
    --storage-class-logs "managed-premium" \
    --storage-class-backups "managed-premium" \
    --volume-size-data 100Gi \
    --volume-size-logs 20Gi \
    --volume-size-backups 50Gi \
    --cores-limit 8 \
    --cores-request 4 \
    --memory-limit 32Gi \
    --memory-request 16Gi \
    --tier "GeneralPurpose"
```

The SQL Managed Instance deployment creates pods in the `arc-data` namespace. It takes a few minutes to initialize.

```bash
# Check the SQL MI status
az sql mi-arc show \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg"

# Get the connection endpoint
az sql mi-arc list \
    --resource-group "arc-data-rg" \
    --output table
```

### Connecting to the SQL Managed Instance

Once the instance is running, you can connect to it using any SQL client:

```bash
# Get the external endpoint
ENDPOINT=$(az sql mi-arc show \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --query "properties.k8sRaw.status.endpoints.primary" \
    --output tsv)

echo "Connection string: $ENDPOINT"

# Connect using sqlcmd
sqlcmd -S "$ENDPOINT" -U sa -P 'YourStrongPassword'
```

## Step 3: Configure Backups and High Availability

Arc SQL Managed Instance supports automated backups and point-in-time restore:

```bash
# Configure backup retention
az sql mi-arc update \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --retention-days 14

# Perform a point-in-time restore
az sql mi-arc restore \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --dest-name "my-sql-restored" \
    --time "2026-02-15T10:00:00Z"
```

For high availability, deploy the Business Critical tier which uses Always On availability groups:

```bash
# Create a Business Critical instance with 3 replicas
az sql mi-arc create \
    --name "my-sql-ha" \
    --resource-group "arc-data-rg" \
    --custom-location "my-dc-location" \
    --tier "BusinessCritical" \
    --replicas 3 \
    --cores-limit 8 \
    --memory-limit 32Gi \
    --storage-class-data "managed-premium" \
    --volume-size-data 200Gi
```

## Monitoring Data Services

The data controller deploys Grafana and Kibana dashboards for local monitoring:

```bash
# Get the monitoring dashboard URLs
kubectl get svc -n arc-data | grep -E "grafana|kibana"

# Port forward to access Grafana locally
kubectl port-forward svc/metricsui-external-svc -n arc-data 3000:3000
```

For Azure-integrated monitoring, the data controller can export metrics and logs to Azure Monitor:

```bash
# Configure log and metric upload to Azure
az arcdata dc update \
    --name "my-data-controller" \
    --resource-group "arc-data-rg" \
    --auto-upload-metrics true \
    --auto-upload-logs true
```

## Scaling Data Service Instances

One of the benefits of running on Kubernetes is the ability to scale:

```bash
# Scale up CPU and memory for a SQL MI
az sql mi-arc update \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --cores-limit 16 \
    --cores-request 8 \
    --memory-limit 64Gi \
    --memory-request 32Gi

# Scale storage (only expansion is supported)
az sql mi-arc update \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --volume-size-data 200Gi
```

## Upgrading Data Services

Arc data services support rolling upgrades:

```bash
# Check available upgrade versions
az arcdata dc list-upgrades \
    --k8s-namespace "arc-data" \
    --use-k8s

# Upgrade the data controller first
az arcdata dc upgrade \
    --resource-group "arc-data-rg" \
    --name "my-data-controller" \
    --desired-version "v1.25.0"

# Then upgrade SQL MI instances
az sql mi-arc upgrade \
    --name "my-sql-instance" \
    --resource-group "arc-data-rg" \
    --desired-version "v1.25.0"
```

Always upgrade the data controller before upgrading individual data service instances.

## Storage Considerations

Storage is the most critical infrastructure decision for Arc data services. Here are the key considerations:

- Use SSD-backed storage classes for data and log volumes
- Separate storage classes for data, logs, and backups if possible
- Ensure your storage supports dynamic provisioning
- Test IOPS and throughput before deploying production workloads
- Consider using local storage (like OpenEBS LocalPV) for best performance

## Summary

Azure Arc-enabled data services bring the Azure managed database experience to your own infrastructure. The data controller provides the management plane, while SQL Managed Instance and PostgreSQL run as first-class Kubernetes workloads. With support for automated backups, point-in-time restore, high availability, elastic scaling, and Azure Portal integration, you get the best of both worlds - the control of running on your own infrastructure with the management experience of Azure PaaS services. Start with a development deployment to get familiar with the components, then plan your production deployment around your storage, networking, and availability requirements.

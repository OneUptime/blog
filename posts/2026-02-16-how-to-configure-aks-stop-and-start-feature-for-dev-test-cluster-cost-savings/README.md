# How to Configure AKS Stop and Start Feature for Dev/Test Cluster Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Cost Savings, Stop Start, DevTest, Kubernetes, Azure, FinOps

Description: Learn how to use the AKS stop and start feature to shut down development and test clusters during off-hours and save significant compute costs.

---

Development and test AKS clusters are some of the biggest sources of wasted Azure spend. Teams spin up clusters for testing, demonstrations, or development, and those clusters run 24/7 even though nobody uses them outside of business hours. A three-node AKS cluster with D4s_v5 VMs costs around $400/month in compute alone. If the team only uses it 8 hours a day on weekdays, that is roughly $280/month wasted on idle compute.

The AKS stop and start feature lets you completely stop a cluster, which deallocates all node VMs and pauses the control plane. When you start it back up, everything comes back - your deployments, services, ConfigMaps, and persistent volumes are all preserved. This guide covers how to use the feature, automate it for scheduled stop/start, and handle the gotchas.

## What Happens When You Stop a Cluster

When you stop an AKS cluster:

- All node pool VMs are deallocated (you stop paying for compute)
- The Kubernetes API server is stopped (kubectl will not work)
- Persistent volumes remain attached but the VMs backing them are stopped
- All Kubernetes objects (Deployments, Services, ConfigMaps, Secrets) are preserved in etcd
- Load balancer public IPs may change when the cluster restarts (unless you use static IPs)
- The cluster still incurs a small management fee but no VM compute costs

When you start the cluster back up:

- Node VMs are re-provisioned and rejoin the cluster
- Pods are rescheduled according to their deployment specs
- Services get new NodePorts (and potentially new LoadBalancer IPs)
- The API server becomes available again

## Prerequisites

- Azure CLI 2.50 or later
- An AKS cluster designated for dev/test workloads
- Understanding that this feature stops ALL compute - it is not suitable for production

## Step 1: Stop an AKS Cluster

Stopping a cluster is a single command.

```bash
# Stop the AKS cluster
az aks stop \
  --resource-group myDevResourceGroup \
  --name myDevCluster

# Check the power state
az aks show \
  --resource-group myDevResourceGroup \
  --name myDevCluster \
  --query "powerState.code" -o tsv
# Expected: Stopped
```

The stop operation takes 2-5 minutes. During this time, the cluster transitions through "Stopping" to "Stopped".

After stopping, verify that VMs are deallocated:

```bash
# Check that no VMs are running for this cluster
az vmss list \
  --resource-group MC_myDevResourceGroup_myDevCluster_eastus \
  --query "[].{name:name, capacity:sku.capacity}" -o table
```

## Step 2: Start the Cluster

When you need the cluster again, start it:

```bash
# Start the AKS cluster
az aks start \
  --resource-group myDevResourceGroup \
  --name myDevCluster

# Wait for the start to complete, then check status
az aks show \
  --resource-group myDevResourceGroup \
  --name myDevCluster \
  --query "{ \
    powerState: powerState.code, \
    provisioningState: provisioningState \
  }" -o table
```

Starting takes 5-10 minutes because Azure needs to provision VMs, start the control plane, and wait for nodes to join the cluster and become Ready.

After starting, verify everything is healthy:

```bash
# Get cluster credentials (may need to refresh after start)
az aks get-credentials \
  --resource-group myDevResourceGroup \
  --name myDevCluster \
  --overwrite-existing

# Check node status
kubectl get nodes

# Check that pods are running
kubectl get pods --all-namespaces
```

## Step 3: Automate Stop/Start on a Schedule

The real savings come from automating the stop/start cycle. Here are several approaches.

### Using Azure Automation

Create a runbook that stops and starts your cluster on a schedule.

```bash
# Create an Azure Automation account
az automation account create \
  --resource-group myDevResourceGroup \
  --name aks-scheduler \
  --location eastus

# Create a system-assigned managed identity for the automation account
# Grant it Contributor access to the AKS cluster
AKS_ID=$(az aks show -g myDevResourceGroup -n myDevCluster --query id -o tsv)
AUTOMATION_PRINCIPAL=$(az automation account show \
  -g myDevResourceGroup \
  -n aks-scheduler \
  --query identity.principalId -o tsv)

az role assignment create \
  --assignee $AUTOMATION_PRINCIPAL \
  --role "Contributor" \
  --scope $AKS_ID
```

Create runbook scripts. The stop runbook:

```python
# stop-aks.py
# Azure Automation runbook to stop AKS cluster at end of business day
import automationassets
from azure.identity import ManagedIdentityCredential
from azure.mgmt.containerservice import ContainerServiceClient

SUBSCRIPTION_ID = automationassets.get_automation_variable("SubscriptionId")
RESOURCE_GROUP = "myDevResourceGroup"
CLUSTER_NAME = "myDevCluster"

# Authenticate using managed identity
credential = ManagedIdentityCredential()
client = ContainerServiceClient(credential, SUBSCRIPTION_ID)

# Stop the cluster
print(f"Stopping cluster {CLUSTER_NAME}")
client.managed_clusters.begin_stop(RESOURCE_GROUP, CLUSTER_NAME).wait()
print(f"Cluster {CLUSTER_NAME} stopped successfully")
```

The start runbook:

```python
# start-aks.py
# Azure Automation runbook to start AKS cluster at beginning of business day
import automationassets
from azure.identity import ManagedIdentityCredential
from azure.mgmt.containerservice import ContainerServiceClient

SUBSCRIPTION_ID = automationassets.get_automation_variable("SubscriptionId")
RESOURCE_GROUP = "myDevResourceGroup"
CLUSTER_NAME = "myDevCluster"

# Authenticate using managed identity
credential = ManagedIdentityCredential()
client = ContainerServiceClient(credential, SUBSCRIPTION_ID)

# Start the cluster
print(f"Starting cluster {CLUSTER_NAME}")
client.managed_clusters.begin_start(RESOURCE_GROUP, CLUSTER_NAME).wait()
print(f"Cluster {CLUSTER_NAME} started successfully")
```

Schedule the runbooks:

```bash
# Schedule: Stop at 7 PM weekdays
az automation schedule create \
  --resource-group myDevResourceGroup \
  --automation-account-name aks-scheduler \
  --name "Stop-AKS-Evening" \
  --frequency Week \
  --interval 1 \
  --start-time "2026-02-17T19:00:00-05:00" \
  --time-zone "Eastern Standard Time"

# Schedule: Start at 7 AM weekdays
az automation schedule create \
  --resource-group myDevResourceGroup \
  --automation-account-name aks-scheduler \
  --name "Start-AKS-Morning" \
  --frequency Week \
  --interval 1 \
  --start-time "2026-02-17T07:00:00-05:00" \
  --time-zone "Eastern Standard Time"
```

### Using GitHub Actions

If you prefer CI/CD-based automation:

```yaml
# .github/workflows/aks-stop.yaml
# Stop AKS dev cluster at end of business day
name: Stop Dev AKS Cluster

on:
  schedule:
    # Run at 7 PM EST (midnight UTC) on weekdays
    - cron: '0 0 * * 2-6'
  workflow_dispatch:

jobs:
  stop-cluster:
    runs-on: ubuntu-latest
    steps:
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Stop AKS Cluster
      run: |
        az aks stop \
          --resource-group myDevResourceGroup \
          --name myDevCluster
        echo "Cluster stopped at $(date)"
```

```yaml
# .github/workflows/aks-start.yaml
# Start AKS dev cluster at beginning of business day
name: Start Dev AKS Cluster

on:
  schedule:
    # Run at 7 AM EST (noon UTC) on weekdays
    - cron: '0 12 * * 1-5'
  workflow_dispatch:

jobs:
  start-cluster:
    runs-on: ubuntu-latest
    steps:
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Start AKS Cluster
      run: |
        az aks start \
          --resource-group myDevResourceGroup \
          --name myDevCluster
        echo "Cluster started at $(date)"
```

## Step 4: Calculate Your Savings

Here is a simple formula:

```
Monthly savings = (hourly VM cost) x (number of nodes) x (hours stopped per month)
```

For a typical dev cluster:
- 3 nodes of Standard_D4s_v5 at roughly $0.192/hour each
- Stopped from 7 PM to 7 AM weekdays (12 hours) and all weekend (48 hours)
- Monthly stopped hours: (12 * 22 weekdays) + (48 * 4 weekends) = 264 + 192 = 456 hours
- Monthly savings: $0.192 * 3 * 456 = roughly $262/month per cluster

If you have 10 dev/test clusters, that is $2,620/month or over $31,000/year.

## Step 5: Handle Common Issues

### Load Balancer IP Changes

When you stop and restart a cluster, the LoadBalancer service IPs may change unless you use static IPs.

```bash
# Before stopping, note your current LoadBalancer IPs
kubectl get svc --all-namespaces -o wide | grep LoadBalancer

# To preserve IPs, use static public IP addresses in your service annotations
```

```yaml
# service-static-ip.yaml
# Service with a static IP that survives cluster stop/start
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-resource-group: myDevResourceGroup
spec:
  type: LoadBalancer
  # Use a pre-created static IP
  loadBalancerIP: 20.1.2.3
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: my-app
```

### Pods Taking Long to Start

After starting a cluster, pods need to pull images and initialize. If your images are large, this can take several minutes. Consider using image pre-pulling or smaller images.

### Persistent Volume Reconnection

PVs backed by Azure Disks should reconnect automatically when the cluster starts. However, if you see pods stuck in ContainerCreating with volume attachment errors:

```bash
# Check for volume attachment issues
kubectl describe pod <pod-name> | grep -A5 "Events"

# If volumes are stuck, delete and recreate the PVC (data is preserved on the disk)
kubectl delete pvc <pvc-name>
kubectl apply -f <pvc-manifest>
```

## Manual On-Demand Start for Urgent Needs

Give developers a way to start the cluster outside the schedule for urgent needs. A simple Slack bot or Teams webhook that triggers the start workflow works well.

```bash
# Quick start command for developers
# Can be wrapped in a Slack slash command or Teams bot
az aks start \
  --resource-group myDevResourceGroup \
  --name myDevCluster \
  --no-wait

echo "Cluster is starting. It will be ready in 5-10 minutes."
```

The `--no-wait` flag returns immediately without waiting for the operation to complete, which is useful for interactive commands.

## When Not to Use Stop/Start

Do not use this for production clusters. The downtime during stop/start is significant (5-10 minutes), and all workloads are disrupted. For production cost optimization, use the cluster autoscaler to scale down during low-traffic periods instead.

Do not rely on it for clusters that need to respond to events outside business hours (webhook receivers, scheduled jobs). If a CronJob needs to run at 2 AM, the cluster needs to be running at 2 AM.

The AKS stop/start feature is one of the easiest and most impactful cost optimization steps you can take. Most organizations have multiple dev/test clusters that sit idle for 60-70% of the time. Automating their lifecycle is free money.

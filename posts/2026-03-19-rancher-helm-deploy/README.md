# How to Deploy Applications Using Helm Charts in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, App Catalog

Description: Learn how to deploy applications using Helm charts in Rancher, from browsing the chart catalog to configuring values and managing releases.

Helm is the package manager for Kubernetes, and Rancher provides a built-in interface for browsing, configuring, and deploying Helm charts. Whether you are deploying a database, monitoring stack, or custom application, Helm charts simplify the process by packaging all the required Kubernetes resources into a single, versioned unit. This guide walks you through deploying applications using Helm charts in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Access to a project and namespace
- Basic familiarity with Helm concepts (charts, releases, values)

## Step 1: Browse Available Charts

In the Rancher dashboard, select your cluster and navigate to **Apps > Charts** from the left sidebar. This page shows all available Helm charts from configured repositories.

You can:

- **Search** for a specific chart by name
- **Filter** by repository or category
- **Sort** by name, repository, or date

Rancher comes with several default chart repositories pre-configured, including the official Rancher charts and partner charts.

## Step 2: Select a Chart

Click on the chart you want to deploy. For this example, we will deploy **Redis**.

The chart detail page shows:

- **Chart description** and README
- **Available versions** in a dropdown
- **Repository** source information

Select the version you want to install from the version dropdown.

## Step 3: Configure the Installation

Click the **Install** button to open the installation form.

### Basic Configuration

- **Name**: Enter a release name (e.g., `my-redis`). This identifies the Helm release.
- **Namespace**: Select the namespace where the application will be deployed, or create a new one.

### Chart Values

Rancher provides two ways to configure chart values:

**Form View**: For Rancher and Partner charts that include a `questions.yaml` file, Rancher can render a user-friendly form. If the chart exposes form fields, fill them in as needed:

- **Architecture**: Select `standalone` or `replication`
- **Password**: Set the Redis password
- **Persistence**: Enable or disable persistent storage
- **Storage Size**: Set the PVC size (e.g., `8Gi`)

**YAML View**: Click the **Edit YAML** tab to directly edit the chart values:

```yaml
architecture: replication
auth:
  enabled: true
  password: "myredispassword"
replica:
  replicaCount: 3
master:
  persistence:
    enabled: true
    size: 8Gi
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
```

## Step 4: Deploy the Chart

Click the **Install** button at the bottom of the form. Rancher will use Helm to deploy the chart into your cluster.

You will see the deployment progress with:

- Helm operation status
- Resources being created
- Any errors or warnings

## Step 5: Verify the Deployment

After installation, navigate to **Apps > Installed Apps** to see your deployed release. Click on the release name to see:

- **Release status** (deployed, failed, pending)
- **Resources** created by the chart (Deployments, Services, ConfigMaps, etc.)
- **Release notes** from the chart
- **Values** used for the installation

Verify the pods are running:

```bash
kubectl get pods -l app.kubernetes.io/instance=my-redis -n default
```

Check the services:

```bash
kubectl get svc -l app.kubernetes.io/instance=my-redis -n default
```

## Alternative: Deploy via Helm CLI

You can also use the Helm CLI through Rancher's kubectl shell:

```bash
# Add the repository

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for charts
helm search repo bitnami/redis

# Install a chart
helm install my-redis bitnami/redis \
  --namespace default \
  --set auth.password=myredispassword \
  --set architecture=replication \
  --set replica.replicaCount=3 \
  --set master.persistence.size=8Gi

# Check the release
helm list -n default
helm status my-redis -n default
```

## Step 6: Access the Application

Depending on the chart, you may need to:

1. **Create a port-forward** for local access:

```bash
kubectl port-forward svc/my-redis-master 6379:6379 -n default
```

2. **Expose via Ingress**: Configure an Ingress resource if the chart supports it

3. **Use a LoadBalancer**: Set the service type to LoadBalancer in the chart values

## Managing Installed Charts

### View Release Information

Go to **Apps > Installed Apps** and click on the release name to see all deployed resources and their status.

### Update Values

To change the configuration of a deployed chart:

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu next to the release
3. Select **Edit/Upgrade**
4. Modify the values
5. Click **Upgrade**

### Uninstall a Release

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu next to the release
3. Select **Delete**
4. Confirm the deletion

Or via CLI:

```bash
helm uninstall my-redis -n default
```

## Summary

Rancher simplifies Helm chart deployment with a visual interface for browsing charts, configuring values, and managing releases. Whether you prefer the form-based UI or direct YAML editing, Rancher provides the tools to deploy and manage Helm-based applications across your clusters. Start with the built-in chart repositories, and add custom repositories for your organization's charts.

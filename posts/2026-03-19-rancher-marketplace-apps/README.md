# How to Deploy Apps from the Rancher Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, Marketplace, App Catalog

Description: Learn how to browse, configure, and deploy applications from the Rancher Marketplace, including monitoring, logging, and infrastructure tools.

The Rancher Marketplace provides a curated collection of Helm charts for deploying popular applications, infrastructure tools, and Rancher extensions directly from the Rancher UI. It includes official Rancher charts, partner integrations, and any custom charts from repositories you add. This guide walks you through finding and deploying apps from the marketplace.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Cluster admin access for installing cluster-level applications
- Sufficient cluster resources for the applications you plan to deploy

## Step 1: Access the Rancher Marketplace

1. Log in to the Rancher dashboard
2. Select the cluster where you want to deploy applications
3. Navigate to **Apps > Charts** from the left sidebar

This page displays all available charts from Rancher, Partners, and any custom repositories configured for the cluster. The left-most filter includes:

- **Rancher**: Official Rancher charts (Monitoring, Logging, Istio, etc.)
- **Partners**: Charts from Rancher partners
- **Custom repositories**: Charts listed under the name of each repository you add

## Step 2: Browse and Search for Apps

### Search

Use the search bar at the top to find specific applications by name. For example, search for "monitoring", "postgres", or "nginx".

### Filter by Repository

Use the left-most filter to show charts from a specific source. This is useful when you have multiple repositories configured and want to find charts from a particular vendor.

### Filter by Category

Some charts may be tagged with categories. If category filters are available in your Rancher version, use them to browse charts by type, such as:

- Monitoring and Alerting
- Logging
- Storage
- Networking
- Security

## Step 3: Deploy Rancher Monitoring

One of the most popular marketplace apps is the Rancher Monitoring chart, which deploys Prometheus and Grafana.

### Find the Chart

1. Search for "Monitoring" in **Apps > Charts**
2. Click on **Monitoring** (the official Rancher chart)

### Review the Chart Details

The chart detail page shows:

- Description and features
- Chart version and app version
- Resource requirements
- Configuration options

### Install the Chart

1. Click **Install**
2. Configure the installation:
   - **Name**: `rancher-monitoring` (usually pre-filled)
   - **Namespace**: `cattle-monitoring-system` (recommended)

3. Configure values:

**Prometheus settings:**
- **Retention**: How long to keep metrics (default: 10d)
- **Storage**: Enable persistent storage for Prometheus data
- **Storage Size**: Set the PVC size (e.g., 50Gi)
- **Resource Requests**: CPU and memory for Prometheus pods

**Grafana settings:**
- **Persistence**: Enable persistent storage for dashboards
- **Admin Password**: Set the Grafana admin password

**Alertmanager settings:**
- **Enable**: Toggle Alertmanager on/off
- **Configuration**: Set up notification channels

4. Click **Install**

### Access Grafana

After installation, access Grafana:

1. Navigate to **Monitoring > Grafana** in the Rancher sidebar
2. Or port-forward the Grafana service:

```bash
kubectl port-forward svc/rancher-monitoring-grafana 3000:80 -n cattle-monitoring-system
```

## Step 4: Deploy Rancher Logging

### Install the Logging Chart

1. Search for "Logging" in **Apps > Charts**
2. Click on **Logging** (Rancher Logging)
3. Click **Install** to open the chart configuration
4. Complete any chart-specific settings you need, then click **Install**
5. After the chart is installed, configure log routing by creating a `ClusterOutput` and `ClusterFlow`, for example:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: elasticsearch
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: http
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  globalOutputRefs:
    - elasticsearch
```

## Step 5: Deploy Rancher Istio (Service Mesh)

If your Rancher version still includes the Rancher Istio chart, you can install it from **Apps > Charts**. Rancher-Istio is deprecated in Rancher v2.12.0 and later.

1. Search for "Istio" in **Apps > Charts**
2. Click on **Istio**
3. Click **Install**
4. Configure:
   - **Pilot Resources**: CPU and memory for the Istio control plane
   - **Ingress Gateway**: Enable and configure the ingress gateway
   - **Egress Gateway**: Enable for controlling outbound traffic
   - **Kiali**: Enable the service mesh dashboard
   - **Jaeger**: Enable distributed tracing
5. Click **Install**

On RKE2 or K3s clusters, also enable CNI and provide the overlay file that sets `cniBinDir` and `cniConfDir` during installation.

## Step 6: Deploy a Database from the Marketplace

### Deploy PostgreSQL

1. Search for "PostgreSQL" in the charts
2. Select the Bitnami PostgreSQL chart (if the Bitnami repository is added)
3. Click **Install**
4. Configure:

```yaml
architecture: replication

auth:
  postgresPassword: "admin-password"
  username: "myapp"
  password: "app-password"
  database: "myappdb"
  replicationPassword: "replication-password"

primary:
  persistence:
    enabled: true
    size: 20Gi
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

readReplicas:
  replicaCount: 2
  persistence:
    enabled: true
    size: 20Gi

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

5. Click **Install**

## Step 7: Deploy Cert-Manager

Cert-Manager automates TLS certificate management.

1. First, add the Jetstack repository if not already added:
   - Go to **Apps > Repositories**
   - Click **Create**
   - Name: `jetstack`
   - URL: `https://charts.jetstack.io`
   - Click **Create**

2. Search for "cert-manager" in **Apps > Charts**
3. Click **Install**
4. Configure:

```yaml
crds:
  enabled: true
replicaCount: 1
resources:
  requests:
    cpu: 10m
    memory: 32Mi
  limits:
    cpu: 100m
    memory: 64Mi
```

5. Click **Install**

After installation, create a ClusterIssuer for Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

## Managing Installed Marketplace Apps

### View Installed Apps

Navigate to **Apps > Installed Apps** to see all deployed applications with their status, version, and namespace.

### Upgrade an App

1. Go to **Apps > Installed Apps**
2. If an upgrade is available, you will see an indicator
3. Click the three-dot menu and select **Edit/Upgrade**
4. Select the new version and update values if needed
5. Click **Upgrade**

### Uninstall an App

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu and select **Delete**
3. Confirm the deletion

Some applications leave behind CRDs and PVCs after uninstallation. Clean these up manually if needed:

```bash
kubectl get crd | grep monitoring
kubectl get pvc -n cattle-monitoring-system
```

## Summary

The Rancher Marketplace provides a convenient way to deploy monitoring, logging, service mesh, databases, and other infrastructure tools into your Kubernetes clusters. Each application can be configured through the Rancher form UI or YAML editor before deployment. Start with essential infrastructure like monitoring and logging, then expand to application-level tools as your needs grow. The marketplace surfaces chart updates from configured repositories, making it easier to apply security patches and new features.

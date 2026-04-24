# How to Deploy Applications from Helm Repositories in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Deployment, DevOps

Description: Learn how to browse Helm chart repositories in Portainer and deploy applications to Kubernetes clusters with customized values using the built-in Helm integration.

## Introduction

Portainer's Helm integration lets you deploy applications from public and private Helm repositories directly through the UI. This eliminates the need for local Helm CLI installations while providing a visual form to customize chart values before deploying. This guide covers the full deployment workflow from browsing to running applications.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment
- At least one Helm repository configured (see the custom repo guide)
- A target namespace created in your cluster
- Admin or operator access to the namespace

## Step 1: Access the Helm Charts Catalog

1. Log into Portainer.
2. Select your **Kubernetes** environment.
3. Click **Applications** in the left sidebar, then click **Create from code**.
4. Choose **Helm chart** as the deployment method.

You can then select a Helm chart source and browse the available charts from that repository.

## Step 2: Browse and Search Charts

- Select a **Helm chart source** using the dropdown
- Use the **Search** bar to find a specific chart (e.g., `nginx`, `postgresql`, `grafana`)
- Filter the chart list by **Category**
- Select a chart to view its available versions and default values

## Step 3: Install a Helm Chart

1. From **Applications** → **Create from code**, choose **Helm chart** if you are not already on that page.
2. Fill in the deployment form:

   - **Release name**: A unique name for this deployment (e.g., `my-nginx`)
   - **Namespace**: Target namespace (e.g., `production`)
   - **Helm chart source**: Select the repository or registry to browse
   - **Chart version**: Select the chart version to deploy

3. Select the chart you want to install (e.g., `nginx` from the Bitnami repo).
4. In the **Chart values** section, you can customize the deployment:
   - Edit directly in the YAML editor
   - Override specific values

```yaml
# Example: Customized NGINX values

replicaCount: 3

service:
  type: LoadBalancer
  ports:
    http: 80

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

ingress:
  enabled: true
  hostname: nginx.example.com
  ingressClassName: nginx
```

5. Click **Install**.

## Step 4: Deploy Common Charts with Example Values

### PostgreSQL

```yaml
# postgresql-values.yaml - Production-ready PostgreSQL
auth:
  postgresPassword: "changeme-secure-password"
  database: "myapp_db"
  username: "myapp_user"
  password: "changeme-app-password"

primary:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "local-path"

  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 256Mi
```

### Grafana

```yaml
# grafana-values.yaml
adminPassword: "changeme-grafana-password"

persistence:
  enabled: true
  size: 5Gi

ingress:
  enabled: true
  hosts:
    - grafana.example.com

service:
  type: ClusterIP
```

### cert-manager

```yaml
# cert-manager-values.yaml
crds:
  enabled: true  # Install Custom Resource Definitions automatically

replicaCount: 2

resources:
  limits:
    cpu: 200m
    memory: 256Mi
```

## Step 5: Monitor the Installation

After clicking **Install**, Portainer returns you to the application's details page. You can:

1. Check the **Resources** tab to see the deployed workloads and their status.
2. Check the **Events** tab for installation progress and errors.

```bash
# Check via kubectl shell
kubectl get pods -n production
kubectl get svc -n production

# Check Helm release status
helm list -n production
```

## Step 6: Deploy via the Portainer API

For programmatic deployments:

```bash
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Deploy nginx chart from Bitnami
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/helm" \
  -d '{
    "name": "my-nginx",
    "namespace": "production",
    "chart": "nginx",
    "version": "15.0.0",
    "repo": "https://charts.bitnami.com/bitnami",
    "values": "replicaCount: 2\nservice:\n  type: ClusterIP"
  }'
```

## Step 7: Upgrade a Helm Release

To update chart values or upgrade to a new version:

1. Go to **Applications** and select the Helm application.
2. Click **Edit/Upgrade**.
3. Modify the values or select a new chart version.
4. Click **Edit/Upgrade** to apply.

```bash
# Via CLI in kubectl shell
helm upgrade my-nginx nginx \
  --repo https://charts.bitnami.com/bitnami \
  --namespace production \
  --set replicaCount=5 \
  --reuse-values
```

## Conclusion

Deploying applications from Helm repositories in Portainer provides a visual, form-driven alternative to the Helm CLI while preserving full customization through YAML values editing. Start with sensible defaults, customize for your environment, and use the API for automated multi-environment deployments. Always pin chart versions in production to ensure reproducible deployments.

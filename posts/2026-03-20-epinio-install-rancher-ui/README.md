# How to Install Epinio from Rancher UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Rancher, Kubernetes, PaaS, Apps

Description: Install and configure Epinio directly from the Rancher UI using the Apps & Marketplace for a seamless developer platform setup.

## Introduction

Rancher's Apps UI makes installing Epinio as simple as clicking through a wizard. This approach is ideal for platform teams that manage Kubernetes through Rancher and want to offer a PaaS experience to their development teams without command-line tools.

## Prerequisites

- Rancher v2.7+
- A downstream Kubernetes cluster managed by Rancher
- A default IngressClass on the target cluster
- A default StorageClass with dynamic provisioning and ReadWriteMany (RWX) support
- A wildcard DNS domain pointed to your cluster's ingress IP
- cert-manager installed on the target cluster

## Step 1: Access Apps

1. Log into Rancher
2. Select the target cluster from the cluster selector
3. Navigate to **Apps** > **Repositories**
4. Click **Create** and add the Epinio Helm repository: `https://epinio.github.io/helm-charts`
5. Navigate to **Apps** > **Charts** in the left sidebar
6. Search for **Epinio** in the chart listing

## Step 2: Configure Epinio Installation

In the Epinio chart configuration screen:

### Basic Settings

```yaml
# These are configured through the Rancher UI form:

global:
  domain: "example.com"                 # Wildcard-enabled base domain
  tlsIssuer: "letsencrypt-production"   # Or selfsigned-issuer
  tlsIssuerEmail: "platform@example.com"

# Storage backend (SeaweedFS is included by default)
seaweedfs:
  enabled: true
```

### Advanced Settings

```yaml
# Persist the built-in container registry
containerregistry:
  enabled: true
  storage:
    emptyDir: false
    size: 20Gi
    storageClassName: "longhorn"

# Use a non-default ingress class
ingress:
  ingressClassName: "nginx"

server:
  ingressClassName: "nginx"
```

## Step 3: Install via Rancher UI

1. Click **Install** on the Epinio chart page
2. Select the **epinio** namespace (or create it) and set the app name to **epinio**
3. Fill in the configuration form:
   - **Domain**: `example.com`
   - **TLS Issuer**: `letsencrypt-production`
   - **TLS Issuer Email**: `platform@example.com`
4. Click **Next** to review the YAML
5. Click **Install** to begin installation

## Step 4: Monitor Installation

In the Rancher UI:

1. Navigate to **Apps** > **Installed Apps**
2. Find the **epinio** app
3. Watch the installation progress
4. Wait for all pods to show **Running** status

```bash
# Also monitor from CLI
kubectl get pods -n epinio --watch
```

## Step 5: Configure DNS

After installation, get the ingress IP:

```bash
# Find the external IP of your ingress controller service
kubectl get svc -A
```

Note the `EXTERNAL-IP` of the service that backs your default IngressClass, such as Traefik or `ingress-nginx`.

Configure DNS:
- `example.com` → ingress IP
- `*.example.com` → ingress IP

## Step 6: Access Epinio UI

1. Navigate to `https://epinio.example.com` in your browser
2. By default, log in with `admin@epinio.io` and the password `password`, or use the identity provider you configured for Dex
3. The Epinio dashboard shows namespaces, applications, and services

## Step 7: Install Epinio CLI for Developers

```bash
# Give developers the CLI for push workflows
curl -fsSL \
  https://github.com/epinio/epinio/releases/latest/download/epinio-linux-x86_64 \
  -o /usr/local/bin/epinio
chmod +x /usr/local/bin/epinio

# Login with the Epinio API credentials
# By default, the admin password is `password` unless you changed `api.adminPassword` or `api.users`.
epinio login https://epinio.example.com \
  --user admin \
  --password "your-api-password"
```

## Upgrading Epinio via Rancher UI

1. Navigate to **Apps** > **Installed Apps**
2. Click on the **epinio** app
3. Click **Upgrade**
4. Review and update any changed values
5. Click **Upgrade** to apply

## Conclusion

Installing Epinio from Rancher UI provides an integrated experience for platform teams already using Rancher for cluster management. The visual configuration form makes it easy to get started, while the advanced YAML editor gives you full control over the deployment. Once installed, Epinio appears as a managed application in Rancher, making upgrades and configuration changes straightforward.

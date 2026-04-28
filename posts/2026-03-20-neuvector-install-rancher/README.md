# How to Install NeuVector from Rancher UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Rancher, Kubernetes, Container Security, Installation

Description: A complete guide to installing and configuring NeuVector directly from the Rancher UI using the built-in Apps & Marketplace feature.

## Introduction

Rancher provides a streamlined experience for deploying NeuVector through its built-in Apps & Marketplace. Since Rancher 2.6.5, NeuVector is tightly integrated as a first-class citizen, making it easy to deploy container security without leaving the Rancher dashboard. This guide walks you through the complete installation process.

## Prerequisites

- Rancher v2.6.5 or later
- A managed Kubernetes cluster in Rancher
- Cluster Owner or higher permissions
- At least 4 GB of available RAM across cluster nodes

## Step 1: Navigate to the Apps & Marketplace

1. Log in to the Rancher UI
2. Select the target cluster from the cluster explorer
3. In the left navigation menu, click **Apps** > **Charts**
4. In the search bar, type **NeuVector**

## Step 2: Select the NeuVector Chart

1. Click on the **NeuVector** chart card
2. Review the chart description and version information
3. Click **Install** to proceed

## Step 3: Configure the Installation

Rancher presents a form-based configuration interface. Configure the following sections:

### Namespace Configuration

```text
Namespace: neuvector (create new)
```

### Container Runtime

Select your cluster's container runtime:
- **Docker** - for Docker-based clusters
- **containerd** - most common for modern clusters
- **CRI-O** - for OpenShift-compatible clusters

### Manager Settings

```text
Service Type: NodePort or LoadBalancer
Port: 8443
```

### Controller Settings

```text
Replicas: 3 (recommended for production)
```

### Scanner Settings

```text
Enable Scanner: Yes
Scanner Replicas: 2
Auto-scan: Enabled
```

## Step 4: Configure Storage (Optional but Recommended)

For production deployments, enable persistent storage to retain NeuVector's configuration across restarts:

1. Scroll to the **Persistence** section
2. Toggle **Enable Persistence** to **On**
3. Select a **Storage Class** available in your cluster
4. Set the **Size** to at least **1Gi**

## Step 5: Set the Admin Password

In the **Admin** section:

1. Enter a strong admin password
2. Confirm the password

> **Security Warning**: The default password `admin` must be changed. Configure a strong password before proceeding.

## Step 6: Review the YAML Values

Rancher allows you to review and edit the underlying Helm values in YAML format before installing:

```yaml
# Review these values in the Rancher YAML editor

controller:
  replicas: 3
  pvc:
    enabled: true
    storageClass: longhorn
    capacity: 1Gi

enforcer:
  tolerations:
    - effect: NoSchedule
      key: node-role.kubernetes.io/control-plane
      operator: Exists
    - effect: NoSchedule
      key: node-role.kubernetes.io/master
      operator: Exists

manager:
  svc:
    type: LoadBalancer

# Container runtime is auto-detected in NeuVector 5.3+.
# Override the runtime socket path only if needed:
# runtimePath: /run/containerd/containerd.sock

cve:
  updater:
    enabled: true
    schedule: "0 0 * * *"
  scanner:
    replicas: 2
```

## Step 7: Complete the Installation

1. Click **Install** at the bottom of the configuration page
2. Rancher deploys NeuVector and shows a progress log
3. Wait for all components to reach **Running** status (typically 2-5 minutes)

## Step 8: Verify the Installation

In the Rancher UI:

1. Navigate to **Workloads** > **Pods** in the `neuvector` namespace
2. Confirm the following pods are running:
   - `neuvector-controller-pod-*` (3 replicas)
   - `neuvector-enforcer-pod-*` (one per node)
   - `neuvector-manager-pod-*` (1 replica)
   - `neuvector-scanner-pod-*` (2 replicas)

Via kubectl:

```bash
# Verify from command line
kubectl get pods -n neuvector

# Check services
kubectl get svc -n neuvector
```

## Step 9: Access the NeuVector Dashboard

1. In Rancher, go to **Service Discovery** > **Services**
2. Click the external link icon next to `neuvector-service-webui`
3. Or, in Rancher 2.7+, click the **NeuVector** link in the cluster's navigation menu

You can also access NeuVector directly through the Rancher SSO integration, which bypasses the need for separate credentials.

## Step 10: Configure the Rancher SSO Integration

NeuVector supports Rancher SSO, allowing users to log in with their Rancher credentials:

1. In NeuVector, go to **Settings** > **Users & Roles**
2. Click **SSO** configuration
3. Select **Rancher** as the identity provider
4. Map Rancher roles to NeuVector roles:
   - Rancher Cluster Owner → NeuVector Admin
   - Rancher Cluster Member → NeuVector Reader

## Upgrading NeuVector in Rancher

To upgrade NeuVector to a newer version:

1. Go to **Apps** > **Installed Apps**
2. Find NeuVector and click **Upgrade**
3. Select the new chart version
4. Review and adjust values if needed
5. Click **Upgrade**

## Conclusion

Installing NeuVector from the Rancher UI offers the most straightforward path for Rancher users, with built-in SSO integration, a guided configuration wizard, and seamless upgrade management. This integration makes NeuVector the natural security choice for Rancher-managed Kubernetes clusters.

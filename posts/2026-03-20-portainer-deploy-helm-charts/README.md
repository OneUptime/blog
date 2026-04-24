# How to Deploy Helm Charts in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Deployment, DevOps

Description: Learn how to browse, configure, and deploy Helm charts to Kubernetes clusters using Portainer's built-in Helm support.

## Introduction

Portainer integrates with Helm to provide a graphical interface for deploying Helm charts to Kubernetes clusters. Instead of running `helm install` commands with complex value flags, you can browse chart repositories, edit Helm values in Portainer, and deploy with a click. This guide covers the complete Helm deployment workflow in Portainer.

## Prerequisites

- Portainer CE or BE with Kubernetes environment connected
- Cluster accessible from Portainer
- Helm chart sources configured in Portainer (Bitnami is available by default; add others as needed)

## Step 1: Navigate to Helm in Portainer

1. Select your Kubernetes environment
2. Click **Applications → Create from code**
3. Choose **Helm chart**

## Step 2: Add Helm Repositories

Portainer ships with the Bitnami Helm chart repository already configured. To add another repository for your user:

1. Click your username and open **My account**
2. Scroll to **Helm repositories**
3. Click **Add Helm repository**
4. Enter the repository URL and save it:

```text
Repository URL: https://kubernetes.github.io/ingress-nginx
```

Administrators can also configure a shared Helm repository in **Settings**.

Popular repositories to add:

```bash
# Add common Helm repositories

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
```

## Step 3: Search for a Chart

In the Portainer Helm view:

1. Select a chart source from the dropdown
2. Use the search bar to find charts
3. Click on a chart to see its description and available versions

Example: Search for "nginx-ingress":

```text
nginx-ingress-controller    bitnami         NGINX Ingress Controller
ingress-nginx               ingress-nginx   Ingress controller for Kubernetes
```

## Step 4: Deploy a Helm Chart

Click on a chart, then click **Install**:

```text
Chart:        nginx-ingress-controller
Chart source: bitnami
Version:      <selected version>
Namespace:    ingress-nginx
Release name: nginx-ingress
```

## Step 5: Configure Chart Values

The **Values** section shows customizable options:

### Method A: Reference Values

Portainer loads the chart's default `values.yaml` in a read-only reference pane.

```text
Reference values:   right pane (read-only)
Custom values:      left pane (editable)
```

### Method B: YAML Values Editor

For full control, edit the values in the left-hand pane:

```yaml
# Custom values.yaml
replicaCount: 2

service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb

config:
  proxy-body-size: "50m"
  proxy-read-timeout: "3600"
  proxy-send-timeout: "3600"

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 1000m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPU: 80
```

## Step 6: Preview the Manifest (Optional)

Before deploying, click **Manifest preview** in Portainer to inspect what Helm will create, or use the CLI equivalents:

```bash
# CLI equivalent: dry run
helm install nginx-ingress bitnami/nginx-ingress-controller \
  --namespace ingress-nginx \
  --create-namespace \
  --values custom-values.yaml \
  --dry-run

# Template rendering
helm template nginx-ingress bitnami/nginx-ingress-controller \
  --namespace ingress-nginx \
  --values custom-values.yaml
```

## Step 7: Install the Chart

1. Review settings
2. Click **Install**
3. Portainer opens the application details page

Portainer then shows the Helm application details and related resources:

```text
Name:          nginx-ingress
Namespace:     ingress-nginx
Chart:         nginx-ingress-controller
Chart source:  bitnami
Chart version: <selected version>
Revision:      1
Status:        deployed
```

## Step 8: View Deployed Helm Applications

Helm deployments appear in the main **Applications** list. Select the Helm application to inspect its resources, values, manifest, revisions, and events:

```text
Applications:
  nginx-ingress   ingress-nginx
  cert-manager    cert-manager
  prometheus      monitoring
```

## Step 9: Upgrade a Helm Release

1. Open the Helm application
2. Click **Edit/Upgrade**
3. Change the chart version and/or values
4. Click **Edit/Upgrade**

```bash
# CLI equivalent
helm upgrade nginx-ingress bitnami/nginx-ingress-controller \
  --namespace ingress-nginx \
  --version <chart-version> \
  --values custom-values.yaml
```

## Step 10: Rollback a Helm Release

If an upgrade fails:

```bash
# Rollback to previous version
helm rollback nginx-ingress --namespace ingress-nginx

# Rollback to specific revision
helm rollback nginx-ingress 1 --namespace ingress-nginx
```

In Portainer: open the Helm application, select a revision if needed, and click **Rollback**.

## Step 11: Uninstall a Helm Release

1. Open the Helm application in Portainer
2. Click **Uninstall**
3. Confirm

```bash
# CLI equivalent
helm uninstall nginx-ingress --namespace ingress-nginx
```

## Conclusion

Portainer's Helm integration brings the power of the Kubernetes package ecosystem to a graphical interface. Browse repositories, review and edit chart values, and deploy charts without remembering complex CLI syntax. For teams adopting Kubernetes, Helm through Portainer provides an excellent on-ramp that removes the command-line barrier while delivering all the benefits of the Helm ecosystem.

# How to Inspect Helm Chart Details in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, DevOps

Description: Learn how to inspect Helm chart details, view release history, and examine deployed resources using Portainer's Helm interface.

## Introduction

After deploying Helm charts in Portainer, you need visibility into what was deployed, what values were used, and the history of changes. Portainer provides views for inspecting Helm releases and their associated Kubernetes resources. This guide covers navigating chart details in Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- At least one Helm chart deployed

## Step 1: View Helm Release List

1. Select your Kubernetes environment in Portainer
2. Navigate to **Applications** and select the Helm application you want to inspect

The release list shows:

```text
RELEASE         NAMESPACE     CHART                    VERSION   STATUS     AGE
nginx-ingress   ingress-nginx ingress-nginx            4.8.0    deployed   3d
prometheus      monitoring    kube-prometheus-stack     54.0.0   deployed   7d
cert-manager    cert-manager  cert-manager              v1.13.2  deployed   30d
my-app          production    my-app-chart              1.2.0    deployed   1d
```

## Step 2: Inspect a Helm Release

Click on a release name to see detailed information:

```text
Release: nginx-ingress
──────────────────────────────────────────────────
Chart:          ingress-nginx-4.8.0
Status:         deployed
Revision:       3
Last deployed:  2024-01-15 10:00:00
Namespace:      ingress-nginx
App version:    1.9.4
```

## Step 3: View Release Notes

Helm chart notes appear after deployment and provide important post-install instructions.

In Portainer, open the **Notes** tab for the release:

```bash
# CLI equivalent
helm get notes nginx-ingress --namespace ingress-nginx
```

## Step 4: View Current Values

See the values used to deploy the chart:

In Portainer, open the **Values** tab. Use **User defined only** if you want to limit the view to explicitly supplied values:

```yaml
replicaCount: 2
service:
  type: LoadBalancer
controller:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
```

```bash
# CLI equivalent

helm get values nginx-ingress --namespace ingress-nginx

# Show ALL values (user + defaults)
helm get values nginx-ingress --namespace ingress-nginx --all
```

## Step 5: View Chart Default Values

Portainer's inspect view focuses on deployed values. To inspect the chart's default values, use the Helm CLI:

```bash
# Add the chart repository locally if you have not already
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Show all chart values (not release-specific)
helm show values ingress-nginx/ingress-nginx
```

## Step 6: View Generated Manifests

See the Kubernetes manifests Helm generated for this release:

```bash
# View all manifests in the release
helm get manifest nginx-ingress --namespace ingress-nginx

# Output: all the YAML that was applied to the cluster
```

In Portainer, open the **Manifest** tab to see the rendered manifest for the release. The **Resources** tab lets you drill into supported resource types.

## Step 7: View Release History

See all revisions of the release:

```bash
helm history nginx-ingress --namespace ingress-nginx

# Output:
# REVISION  UPDATED                  STATUS       CHART               DESCRIPTION
# 1         2024-01-10 09:00:00      superseded   ingress-nginx-4.7.0 Install complete
# 2         2024-01-12 14:00:00      superseded   ingress-nginx-4.7.0 Upgrade complete
# 3         2024-01-15 10:00:00      deployed     ingress-nginx-4.8.0 Upgrade complete
```

## Step 8: Compare Values Between Revisions

```bash
# Get values from a specific revision
helm get values nginx-ingress --revision 2 --namespace ingress-nginx

# Diff between revisions (requires the separately installed helm-diff plugin)
helm diff revision nginx-ingress 2 3 --namespace ingress-nginx
```

## Step 9: View Kubernetes Resources Created by the Chart

In Portainer, open the **Resources** tab to see the resources that currently make up the Helm deployment:

```bash
# CLI: Inspect the rendered resources in the release manifest
helm get manifest nginx-ingress -n ingress-nginx

# Many charts also apply recommended Kubernetes app labels, which can help
# you query live namespaced objects for a release
kubectl get deploy,svc,pod,cm,secret,ingress -n ingress-nginx \
  -l "app.kubernetes.io/instance=nginx-ingress"
```

## Step 10: Inspect Chart README and Metadata

```bash
# View chart README
helm show readme ingress-nginx/ingress-nginx

# View chart metadata from Chart.yaml
helm show chart ingress-nginx/ingress-nginx

# If the chart ships a values.schema.json file, pull the chart and inspect it directly
helm pull ingress-nginx/ingress-nginx --untar
if [ -f ingress-nginx/values.schema.json ]; then cat ingress-nginx/values.schema.json; fi
```

## Step 11: Check for Chart Updates

```bash
# Update repository index
helm repo update

# Search for newer versions
helm search repo ingress-nginx/ingress-nginx --versions | head -5

# Check if installed chart has updates available
helm list --namespace ingress-nginx | grep nginx-ingress
# Compare CHART column with latest from search
```

In Portainer, the release details show the current chart version, and the **Edit/Upgrade** screen can refresh the list of available versions from the chart source.

## Conclusion

Portainer provides accessible views of Helm release details that would otherwise require multiple kubectl and helm commands. Use the release detail view to understand what's deployed, check values to understand configuration, and monitor release history for audit purposes. For complex chart inspection needs such as chart metadata, README content, or raw chart files like `values.schema.json`, the Helm CLI remains the most comprehensive tool.

# How to View and Filter ConfigMaps in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Management, DevOps

Description: Learn how to view, search, and filter ConfigMaps in Portainer to efficiently manage application configuration across your Kubernetes cluster.

## Introduction

As Kubernetes clusters grow, the number of ConfigMaps can become large and unwieldy. A single namespace may have dozens of ConfigMaps for different applications, middleware components, and feature configurations. Portainer provides a centralized view for browsing and filtering ConfigMaps, while kubectl offers powerful filtering options for automation and scripting. This guide covers efficiently finding and managing ConfigMaps in Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- ConfigMaps deployed in one or more namespaces

## Step 1: Navigate to ConfigMaps in Portainer

1. Select your Kubernetes environment in Portainer
2. Click **Filter** and select one or more namespaces (or leave all namespaces selected)
3. In the sidebar, click **ConfigMaps & Secrets**
4. Select the **ConfigMaps** tab

The list displays:
```text
Name                 Namespace      Created
app-config           production     2026-03-18 09:14:22
db-config            production     2026-03-18 09:15:03
nginx-config         production     2026-03-19 16:40:03
feature-flags        production     2026-03-20 08:11:27
monitoring-config    monitoring     2026-03-15 07:32:10
```

## Step 2: Search and Filter ConfigMaps

In the Portainer ConfigMaps list:

1. Use the **search box** at the top of the list to filter by name
   - Type `nginx` to show only ConfigMaps with "nginx" in their name
   - Type `config` to show all ConfigMaps containing "config"

2. Use the **namespace filter** to narrow to a specific namespace

3. Sort by clicking column headers:
   - Sort by **Name** for alphabetical browsing
   - Sort by **Created** to find recently created configs

## Step 3: View ConfigMap Details in Portainer

Click on a ConfigMap name to open it:

1. Review metadata such as name, namespace, labels, annotations, and creation time
2. Review the **Data** section for the key-value pairs stored in the ConfigMap

ConfigMaps marked as **external** were created outside Portainer, so Portainer may show limited information for them.

## Step 4: Filter ConfigMaps via kubectl

Command-line filtering provides more powerful options:

```bash
# List all ConfigMaps in a namespace

kubectl get configmaps -n production

# List with label selector
kubectl get configmaps -n production -l app=my-app

# List across all namespaces
kubectl get configmaps --all-namespaces

# Filter by name pattern (using grep)
kubectl get configmaps -n production | grep nginx

# Show ConfigMaps with specific annotation
kubectl get configmaps -n production \
  -o json | jq -r '.items[] |
  select(.metadata.annotations["managed-by"] == "helm") |
  .metadata.name'

# List ConfigMaps sorted by creation time
kubectl get configmaps -n production \
  --sort-by='.metadata.creationTimestamp'

# Show only names
kubectl get configmaps -n production -o name
```

## Step 5: View ConfigMap Contents

```bash
# View a specific ConfigMap
kubectl describe configmap app-config -n production

# Get all data as JSON
kubectl get configmap app-config -n production -o json | jq '.data'

# Get a specific key value
kubectl get configmap app-config -n production \
  -o jsonpath='{.data.DATABASE_HOST}'

# Get all keys (not values)
kubectl get configmap app-config -n production \
  -o json | jq -r '(.data // {}) | keys[]'

# View large config file values
kubectl get configmap nginx-config -n production \
  -o jsonpath='{.data.nginx\.conf}'
```

## Step 6: Find ConfigMaps Referenced by Pods

Identify which pods use a specific ConfigMap:

```bash
# Find pods that mount a ConfigMap as a volume
kubectl get pods -n production -o json | \
  jq -r '.items[] | select(
    .spec.volumes[]?.configMap.name == "app-config"
  ) | .metadata.name'

# Find pods that reference a ConfigMap via envFrom or env.valueFrom
kubectl get pods -n production -o json | \
  jq -r '.items[] | select(
    [(.spec.containers[]?.envFrom[]?.configMapRef.name),
     (.spec.containers[]?.env[]?.valueFrom.configMapKeyRef.name),
     (.spec.initContainers[]?.envFrom[]?.configMapRef.name),
     (.spec.initContainers[]?.env[]?.valueFrom.configMapKeyRef.name)] |
    any(. == "app-config")
  ) | .metadata.name'

# Find deployments using a ConfigMap
kubectl get deployments -n production -o json | \
  jq -r '.items[] | select(
    [(.spec.template.spec.volumes[]?.configMap.name),
     (.spec.template.spec.containers[]?.envFrom[]?.configMapRef.name),
     (.spec.template.spec.containers[]?.env[]?.valueFrom.configMapKeyRef.name),
     (.spec.template.spec.initContainers[]?.envFrom[]?.configMapRef.name),
     (.spec.template.spec.initContainers[]?.env[]?.valueFrom.configMapKeyRef.name)] |
    any(. == "app-config")
  ) | .metadata.name'
```

## Step 7: Identify Unused ConfigMaps

Find ConfigMaps that no pods reference (candidates for cleanup):

```bash
#!/bin/bash
# Find potentially unused ConfigMaps
NAMESPACE=production

echo "ConfigMaps in namespace $NAMESPACE:"
kubectl get configmap -n $NAMESPACE -o name | sed 's/configmap\///'

echo ""
echo "ConfigMaps referenced by pods:"
kubectl get pods -n $NAMESPACE -o json | \
  jq -r '[.items[].spec |
    (.volumes[]?.configMap.name // empty),
    (.containers[]?.envFrom[]?.configMapRef.name // empty),
    (.containers[]?.env[]?.valueFrom.configMapKeyRef.name // empty),
    (.initContainers[]?.envFrom[]?.configMapRef.name // empty),
    (.initContainers[]?.env[]?.valueFrom.configMapKeyRef.name // empty)
  ] | unique | .[]' | sort -u

# Manually compare the two lists to find unreferenced ConfigMaps
```

## Step 8: Export ConfigMaps for Backup or Migration

```bash
# Export all ConfigMaps from a namespace
kubectl get configmaps -n production \
  -o yaml > production-configmaps-backup.yaml

# Export specific ConfigMap
kubectl get configmap app-config -n production \
  -o yaml > app-config-backup.yaml

# Export without common cluster-specific metadata (JSON example)
kubectl get configmap app-config -n production \
  -o json | \
  jq 'del(
    .metadata.resourceVersion,
    .metadata.uid,
    .metadata.creationTimestamp,
    .metadata.managedFields,
    .metadata.selfLink
  )' > app-config-clean.json

# Export all ConfigMaps to individual files
for cm in $(kubectl get configmaps -n production -o name); do
  name=$(echo $cm | sed 's/configmap\///')
  kubectl get configmap $name -n production -o yaml > "${name}.yaml"
done
```

## Step 9: Compare ConfigMaps Across Namespaces

Verify staging and production configs match (except environment-specific values):

```bash
# Get ConfigMap keys from production
kubectl get configmap app-config -n production \
  -o json | jq -r '(.data // {}) | keys[]'

# Get ConfigMap keys from staging
kubectl get configmap app-config -n staging \
  -o json | jq -r '(.data // {}) | keys[]'

# Compare key sets (should be identical, values will differ)
```

## Conclusion

Portainer's ConfigMap list view provides a clean interface for browsing and searching configurations across namespaces. Use the search bar for quick filtering by name, and kubectl for advanced filtering by labels, annotations, and content. Regularly audit ConfigMaps to identify unused ones for cleanup, export them for backup before major changes, and compare configurations across namespaces to ensure consistency in your deployment pipeline.

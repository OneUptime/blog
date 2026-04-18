# How to View and Filter ConfigMaps in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Management, DevOps

Description: Learn how to browse, search, and filter Kubernetes ConfigMaps in Portainer to manage application configurations.

## Viewing ConfigMaps in Portainer

1. Select your Kubernetes environment.
2. Go to **ConfigMaps & Secrets** or **Configurations** in the sidebar.
3. Click the **ConfigMaps** tab.

You'll see all ConfigMaps in the selected namespace with their name, namespace, and creation time.

## Filtering by Namespace

Use the namespace dropdown at the top of the list to filter ConfigMaps to a specific namespace:

```bash
# Equivalent CLI command to list ConfigMaps in a namespace

kubectl get configmaps --namespace=production

# List across all namespaces
kubectl get configmaps --all-namespaces

# Sort by creation time
kubectl get configmaps --all-namespaces \
  --sort-by='.metadata.creationTimestamp'
```

## Searching ConfigMaps

Portainer's search bar filters ConfigMaps by name as you type. This is useful in clusters with dozens of ConfigMaps.

```bash
# Filter ConfigMaps by name pattern via CLI
kubectl get configmaps --all-namespaces | grep "app-"

# Filter with label selectors
kubectl get configmaps --all-namespaces \
  --selector=app=my-app
```

## Viewing ConfigMap Details

Click on a ConfigMap name to see:
- All key-value pairs
- Key names and their values
- Creation timestamp and labels

```bash
# View ConfigMap details in CLI
kubectl describe configmap app-config --namespace=production

# Get raw YAML
kubectl get configmap app-config --namespace=production -o yaml

# Extract a specific key's value
kubectl get configmap app-config --namespace=production \
  -o jsonpath='{.data.LOG_LEVEL}'
```

## Identifying System ConfigMaps

To avoid cluttering the view, enable **Show system resources** to see (or hide) system ConfigMaps in `kube-system`:

```bash
# System ConfigMaps you typically don't need to touch
kubectl get configmaps --namespace=kube-system

# Filter to only user-created ConfigMaps
kubectl get configmaps --all-namespaces \
  --field-selector=metadata.namespace!=kube-system
```

## Finding ConfigMaps Referenced by Deployments

```bash
# Find which ConfigMaps are used by a specific deployment
kubectl get deployment my-app --namespace=production \
  -o jsonpath='{.spec.template.spec.containers[*].envFrom}' | jq

# Find all pods referencing a specific ConfigMap via envFrom
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | select(.spec.containers[].envFrom[]?.configMapRef.name=="app-config") | .metadata.name'
```

## Bulk Operations

```bash
# Delete unused ConfigMaps (be careful!)
# First, list all ConfigMaps
kubectl get configmaps --namespace=staging -o name

# Delete multiple at once
kubectl delete configmap config1 config2 config3 --namespace=staging
```

## Conclusion

Portainer's ConfigMap browser with namespace filtering and search makes it easy to manage configurations across a complex cluster. Use it alongside `kubectl` commands for deeper inspection and bulk operations.

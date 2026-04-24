# How to Remove Namespaces in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, DevOps

Description: Learn how to safely remove Kubernetes namespaces in Portainer, including handling stuck deletions and backing up important resources.

## Introduction

Removing a Kubernetes namespace in Portainer deletes ALL resources contained within it - pods, services, deployments, PVCs, secrets, and more. This is a destructive operation that requires careful planning. This guide covers the safe namespace removal process.

## Prerequisites

- Portainer with Kubernetes environment
- Admin access
- A namespace to remove (not a system namespace)

## Step 1: Inventory Namespace Resources

Before deleting, list all resources to understand what will be lost:

```bash
# Common workload resources

kubectl get all -n old-namespace

# Storage (PVCs contain data!)
kubectl get pvc -n old-namespace

# ConfigMaps and Secrets
kubectl get configmap,secret -n old-namespace

# Ingresses
kubectl get ingress -n old-namespace

# Custom resources
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -I{} kubectl get {} -n old-namespace 2>/dev/null
```

## Step 2: Back Up Important Data

```bash
# Export common resources as YAML backup
kubectl get all,configmap,ingress,pvc -n old-namespace -o yaml > old-namespace-backup.yaml

# Backup secrets (sensitive data)
kubectl get secrets -n old-namespace -o yaml > old-namespace-secrets.yaml

# Backup PVC data using a temporary pod
kubectl run backup \
  --image=alpine \
  --namespace=old-namespace \
  --overrides='{"spec":{"restartPolicy":"Never","volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"my-data-pvc"}}],"containers":[{"name":"backup","image":"alpine","command":["sleep","3600"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}]}}' \
  --restart=Never
kubectl wait --for=condition=Ready pod/backup -n old-namespace --timeout=120s
kubectl exec -n old-namespace backup -- tar czf - -C /data . > my-data-pvc-backup.tar.gz
kubectl delete pod backup -n old-namespace
```

## Step 3: Remove the Namespace via Portainer

1. Select your Kubernetes environment
2. Click **Namespaces** in the sidebar
3. Tick the checkbox next to the namespace you want to remove
4. Click the **Remove** button
5. Confirm in the dialog

**Warning:** This deletes ALL resources including PersistentVolumeClaims (and potentially the underlying data, depending on the reclaim policy).

## Step 4: Remove via kubectl

```bash
# Delete the namespace
kubectl delete namespace old-namespace

# Watch deletion progress
kubectl get namespace old-namespace -w

# Status progression:
# Active → Terminating → (removed)
```

## Step 5: Handle Stuck Terminating Namespace

Sometimes namespaces get stuck in `Terminating` state due to resources with finalizers:

```bash
# Check what's preventing deletion
kubectl get namespace old-namespace -o json | jq '.spec.finalizers'
kubectl get namespace old-namespace -o json | jq '.status'

# List remaining resources in the namespace
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -n 1 kubectl get --ignore-not-found -n old-namespace 2>/dev/null
```

### Fix Stuck Namespace

```bash
# Method 1: Remove finalizers via kubectl proxy
kubectl proxy &
PROXY_PID=$!

# Get the namespace JSON
kubectl get namespace old-namespace -o json > /tmp/ns.json

# Remove finalizers
jq '.spec.finalizers = null' /tmp/ns.json > /tmp/ns-clean.json

# Apply via the proxy
curl -X PUT http://localhost:8001/api/v1/namespaces/old-namespace/finalize \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/ns-clean.json

kill $PROXY_PID
```

```bash
# Method 2: Update the finalize endpoint directly with kubectl
kubectl get namespace old-namespace -o json > /tmp/ns.json
jq '.spec.finalizers = null' /tmp/ns.json > /tmp/ns-clean.json
kubectl replace --raw "/api/v1/namespaces/old-namespace/finalize" -f /tmp/ns-clean.json
```

### Find Resources with Finalizers

```bash
# Find all resources with finalizers in the namespace
kubectl api-resources --verbs=list --namespaced -o name | \
  while read -r resource; do
    kubectl get "$resource" -n old-namespace --ignore-not-found -o json 2>/dev/null | \
      jq -r '.items[]? | select(.metadata.finalizers != null) |
      "\(.apiVersion) \(.kind)/\(.metadata.name): \(.metadata.finalizers)"'
  done

# Remove finalizer from a specific resource
kubectl patch <resource-type> <resource-name> -n old-namespace \
  --type=json \
  -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Step 6: Clean Up Cluster-Scoped Resources

Some resources associated with the namespace are cluster-scoped and persist:

```bash
# PersistentVolumes (if reclaim policy is Retain)
kubectl get pv | grep old-namespace

# ClusterRoleBindings that reference service accounts from the namespace
kubectl get clusterrolebinding -o json | \
  jq -r '.items[] |
  select([.subjects[]? | select(.namespace == "old-namespace")] | length > 0) |
  .metadata.name'
kubectl delete clusterrolebinding <binding-name>

# External DNS entries (if using external-dns)
# Verify your DNS automation removed any records for the namespace
```

## Step 7: Verify Complete Deletion

```bash
# Confirm namespace is gone
kubectl get namespace old-namespace
# Error from server (NotFound): namespaces "old-namespace" not found

# Verify no PVs remain that were bound to the namespace
kubectl get pv | grep old-namespace

# Check for remaining RBAC references to the namespace
kubectl get clusterrolebinding -o json | \
  jq -r '.items[] |
  select([.subjects[]? | select(.namespace == "old-namespace")] | length > 0) |
  .metadata.name'
kubectl get rolebinding -A -o json | \
  jq -r '.items[] |
  select([.subjects[]? | select(.namespace == "old-namespace")] | length > 0) |
  "\(.metadata.namespace)/\(.metadata.name)"'
```

## Safely Removing Shared Namespaces (Production)

For production namespaces, follow this process:

```bash
# 1. Announce planned removal with advance notice
# 2. Put a temporary change freeze or admission policy in place for the namespace

# 3. Scale down all deployments gradually
kubectl get deployments -n production -o name | \
  xargs kubectl scale --replicas=0 -n production

# 4. Migrate data from PVCs
# 5. Update DNS and remove external dependencies
# 6. After final verification, delete the namespace
kubectl delete namespace production
```

## Conclusion

Namespace deletion is straightforward but irreversible. Always inventory resources, back up important data (especially PVC contents), and handle any stuck finalizers before assuming the deletion failed. For production namespace decommissioning, follow a structured process with advance notice and data migration to ensure nothing important is lost.

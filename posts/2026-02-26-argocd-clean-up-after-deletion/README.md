# How to Clean Up After ArgoCD Application Deletion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Cleanup, Cluster Management

Description: Learn how to thoroughly clean up orphaned resources, leftover configurations, persistent volumes, and cluster artifacts after deleting an ArgoCD application.

---

Deleting an ArgoCD application does not always mean everything is gone. Depending on how you deleted the application and what resources it managed, you might have orphaned Kubernetes resources, leftover PersistentVolumeClaims, stale ConfigMaps, dangling Services, and ArgoCD tracking metadata scattered across your cluster.

This guide covers a systematic approach to cleaning up everything that gets left behind after an ArgoCD application deletion.

## What can be left behind after deletion

Even after a successful cascade delete, some resources might survive:

1. **Resources excluded from pruning** - Resources with `argocd.argoproj.io/sync-options: Prune=false`
2. **PersistentVolumeClaims** - If managed by StatefulSets (PVCs from StatefulSets are not automatically deleted)
3. **PersistentVolumes** - With `Retain` reclaim policy
4. **Namespace** - ArgoCD does not delete namespaces by default
5. **Cluster-scoped resources** - ClusterRoles, ClusterRoleBindings that were not tracked
6. **Resources in other namespaces** - If the application deployed cross-namespace resources
7. **External resources** - Cloud load balancers, DNS entries created by controllers
8. **ArgoCD metadata** - Tracking labels and annotations on surviving resources

After a non-cascade delete, everything is left behind - the full set of managed resources continues running.

## Step 1: Inventory leftover resources

Start by understanding what is still in the cluster:

```bash
# Define the namespace your application used
NAMESPACE="my-app"
APP_NAME="my-app"

# Check all resources in the namespace
kubectl get all -n $NAMESPACE

# Check for PVCs
kubectl get pvc -n $NAMESPACE

# Check for ConfigMaps and Secrets (excluding defaults)
kubectl get configmap -n $NAMESPACE | grep -v kube-root-ca
kubectl get secret -n $NAMESPACE | grep -v default-token

# Check for Ingresses
kubectl get ingress -n $NAMESPACE

# Check for ServiceAccounts
kubectl get serviceaccount -n $NAMESPACE | grep -v default

# Check for NetworkPolicies
kubectl get networkpolicy -n $NAMESPACE

# Check for cluster-scoped resources with app labels
kubectl get clusterrole -l app.kubernetes.io/instance=$APP_NAME
kubectl get clusterrolebinding -l app.kubernetes.io/instance=$APP_NAME
```

## Step 2: Clean up namespace-scoped resources

If you performed a non-cascade delete and want to remove everything:

```bash
NAMESPACE="my-app"

# Delete all standard workload resources
kubectl delete deployments,statefulsets,daemonsets,replicasets,jobs,cronjobs \
  --all -n $NAMESPACE

# Delete all services
kubectl delete services --all -n $NAMESPACE

# Delete ConfigMaps (except system ones)
kubectl get configmap -n $NAMESPACE -o name | \
  grep -v kube-root-ca | \
  xargs kubectl delete -n $NAMESPACE

# Delete Secrets (except service account tokens)
kubectl get secret -n $NAMESPACE -o json | \
  jq -r '.items[] | select(.type != "kubernetes.io/service-account-token") | .metadata.name' | \
  xargs -I {} kubectl delete secret {} -n $NAMESPACE

# Delete Ingresses
kubectl delete ingress --all -n $NAMESPACE

# Delete NetworkPolicies
kubectl delete networkpolicy --all -n $NAMESPACE

# Delete PodDisruptionBudgets
kubectl delete pdb --all -n $NAMESPACE

# Delete HorizontalPodAutoscalers
kubectl delete hpa --all -n $NAMESPACE

# Delete ServiceAccounts (except default)
kubectl get sa -n $NAMESPACE -o name | \
  grep -v default | \
  xargs kubectl delete -n $NAMESPACE
```

## Step 3: Handle PersistentVolumeClaims

PVCs require special care because they hold data:

```bash
NAMESPACE="my-app"

# List all PVCs
kubectl get pvc -n $NAMESPACE

# Check which PVCs are still bound to volumes
kubectl get pvc -n $NAMESPACE -o custom-columns=\
NAME:.metadata.name,STATUS:.status.phase,VOLUME:.spec.volumeName,SIZE:.spec.resources.requests.storage

# Before deleting, check the PV reclaim policy
kubectl get pv -o custom-columns=\
NAME:.metadata.name,RECLAIM:.spec.persistentVolumeReclaimPolicy,CLAIM:.spec.claimRef.name | \
  grep $NAMESPACE
```

If you need to preserve data before deleting PVCs:

```bash
# Create a backup pod to copy data
kubectl run data-backup --image=busybox -n $NAMESPACE \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "backup",
        "image": "busybox",
        "command": ["sleep", "3600"],
        "volumeMounts": [{
          "mountPath": "/data",
          "name": "data-vol"
        }]
      }],
      "volumes": [{
        "name": "data-vol",
        "persistentVolumeClaim": {
          "claimName": "my-data-pvc"
        }
      }]
    }
  }'

# Copy data out
kubectl cp $NAMESPACE/data-backup:/data ./backup-data/

# Clean up backup pod
kubectl delete pod data-backup -n $NAMESPACE

# Now safe to delete PVCs
kubectl delete pvc --all -n $NAMESPACE
```

## Step 4: Clean up cluster-scoped resources

Cluster-scoped resources are not tied to a namespace and can be easy to miss:

```bash
APP_NAME="my-app"

# Find and delete ClusterRoles
kubectl get clusterrole -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs kubectl delete

# Find and delete ClusterRoleBindings
kubectl get clusterrolebinding -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs kubectl delete

# Check for custom resource definitions if the app installed CRDs
kubectl get crd -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs kubectl delete

# Check for MutatingWebhookConfigurations
kubectl get mutatingwebhookconfiguration -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs kubectl delete

# Check for ValidatingWebhookConfigurations
kubectl get validatingwebhookconfiguration -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs kubectl delete
```

## Step 5: Remove ArgoCD tracking metadata

If resources remain in the cluster (intentionally or after non-cascade delete), clean up ArgoCD-specific metadata:

```bash
NAMESPACE="my-app"

# Remove ArgoCD tracking annotations
kubectl get all -n $NAMESPACE -o name | xargs -I {} kubectl annotate {} -n $NAMESPACE \
  argocd.argoproj.io/tracking-id- \
  argocd.argoproj.io/managed-by- \
  kubectl.kubernetes.io/last-applied-configuration-

# Remove ArgoCD instance labels
kubectl get all -n $NAMESPACE -o name | xargs -I {} kubectl label {} -n $NAMESPACE \
  app.kubernetes.io/instance- \
  app.kubernetes.io/managed-by- \
  app.kubernetes.io/part-of- \
  argocd.argoproj.io/instance-
```

## Step 6: Delete the namespace (if no longer needed)

If the entire namespace is no longer needed:

```bash
NAMESPACE="my-app"

# Verify the namespace is empty or only has resources you are okay losing
kubectl get all -n $NAMESPACE

# Delete the namespace (this deletes everything inside it)
kubectl delete namespace $NAMESPACE
```

If the namespace gets stuck in Terminating:

```bash
# Check what is blocking
kubectl get namespace $NAMESPACE -o json | jq '.status'

# Force finalize if needed
kubectl get namespace $NAMESPACE -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/$NAMESPACE/finalize" -f -
```

## Step 7: Clean up external resources

Some resources created by in-cluster controllers persist outside Kubernetes:

```bash
# Check for LoadBalancer services that created cloud LBs
kubectl get svc -n $NAMESPACE -o json | \
  jq '.items[] | select(.spec.type == "LoadBalancer") | {name: .metadata.name, lb: .status.loadBalancer}'

# Check for ExternalDNS records (if using external-dns)
# These are usually cleaned up automatically when the Ingress/Service is deleted

# Check for cert-manager certificates and their associated secrets
kubectl get certificate -n $NAMESPACE
kubectl get certificaterequest -n $NAMESPACE
```

## Complete cleanup script

Here is a comprehensive cleanup script you can customize for your environment:

```bash
#!/bin/bash
set -e

APP_NAME=${1:?"Usage: $0 <app-name> [namespace]"}
NAMESPACE=${2:-$APP_NAME}

echo "=== ArgoCD Application Cleanup ==="
echo "App: $APP_NAME"
echo "Namespace: $NAMESPACE"
echo ""

# Check if ArgoCD application still exists
if kubectl get application $APP_NAME -n argocd 2>/dev/null; then
  echo "WARNING: ArgoCD application still exists. Delete it first."
  exit 1
fi

# Namespace-scoped cleanup
echo "--- Cleaning namespace-scoped resources ---"
if kubectl get namespace $NAMESPACE 2>/dev/null; then
  # Show what will be deleted
  echo "Resources in namespace $NAMESPACE:"
  kubectl get all,pvc,configmap,secret,ingress -n $NAMESPACE 2>/dev/null

  echo ""
  read -p "Delete all resources in namespace $NAMESPACE? (y/N): " confirm
  if [ "$confirm" = "y" ]; then
    kubectl delete all --all -n $NAMESPACE --timeout=60s
    kubectl delete pvc --all -n $NAMESPACE --timeout=60s
    kubectl delete configmap --all -n $NAMESPACE --timeout=60s
    kubectl delete ingress --all -n $NAMESPACE --timeout=60s

    read -p "Delete namespace $NAMESPACE? (y/N): " confirm_ns
    if [ "$confirm_ns" = "y" ]; then
      kubectl delete namespace $NAMESPACE --timeout=120s
    fi
  fi
fi

# Cluster-scoped cleanup
echo ""
echo "--- Cleaning cluster-scoped resources ---"
CLUSTER_RESOURCES=$(kubectl get clusterrole,clusterrolebinding \
  -l app.kubernetes.io/instance=$APP_NAME -o name 2>/dev/null)

if [ -n "$CLUSTER_RESOURCES" ]; then
  echo "Found cluster resources:"
  echo "$CLUSTER_RESOURCES"
  read -p "Delete these cluster resources? (y/N): " confirm_cluster
  if [ "$confirm_cluster" = "y" ]; then
    echo "$CLUSTER_RESOURCES" | xargs kubectl delete
  fi
else
  echo "No cluster-scoped resources found"
fi

echo ""
echo "=== Cleanup complete ==="
```

## Setting up orphaned resource monitoring

To catch leftover resources proactively, enable ArgoCD's orphaned resource monitoring:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  orphanedResources:
    warn: true
    ignore:
      - group: ""
        kind: ConfigMap
        name: kube-root-ca.crt
      - group: ""
        kind: ServiceAccount
        name: default
```

This will show warnings in the ArgoCD UI for any resources in project-managed namespaces that are not tracked by any application.

## Summary

Thorough cleanup after ArgoCD application deletion involves checking for orphaned resources at every level: namespace-scoped workloads, PersistentVolumeClaims (with data backup if needed), cluster-scoped resources like ClusterRoles, ArgoCD tracking metadata on surviving resources, and external cloud resources. Build a cleanup checklist or script tailored to your environment, and use ArgoCD's orphaned resource monitoring to catch leftover resources before they accumulate.

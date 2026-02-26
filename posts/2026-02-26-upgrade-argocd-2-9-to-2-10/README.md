# How to Upgrade ArgoCD from 2.9 to 2.10

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrades, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.9 to 2.10 with details on new features, breaking changes, and migration steps.

---

ArgoCD 2.10 brought important improvements to multi-source applications, enhanced RBAC, and changes to how resource tracking works. This guide walks you through every step of the upgrade from 2.9 to 2.10, including the specific changes that might affect your existing setup.

## What Changed in ArgoCD 2.10

### Key New Features

- **Multi-source applications GA**: Multi-source applications moved from beta to generally available
- **Dynamic cluster distribution**: Better distribution of application reconciliation across multiple application controller shards
- **Improved ApplicationSet templating**: Enhanced Go template support in ApplicationSets
- **Server-side diff improvements**: More reliable diff calculation
- **Improved project scoped repositories**: Better support for project-level repository access

### Breaking Changes

- **Resource tracking changes**: The default resource tracking method changed behavior. Applications using annotation-based tracking may see sync differences.
- **RBAC policy changes**: Some default RBAC policies were tightened. Users with custom RBAC may need adjustments.
- **Helm value file handling**: Changes to how multiple value files are merged in multi-source applications.
- **Deprecated CLI flags removed**: Several CLI flags deprecated in 2.8 were removed.

## Pre-Upgrade Checklist

### 1. Verify Current Version

```bash
argocd version --client
argocd version --server
```

### 2. Check Kubernetes Compatibility

ArgoCD 2.10 supports Kubernetes 1.26 through 1.30. If your cluster is on 1.25, you need to upgrade Kubernetes first.

```bash
kubectl version --short
```

### 3. Backup Current Configuration

```bash
mkdir -p argocd-backup-2.9

# Applications
kubectl get applications -n argocd -o yaml > argocd-backup-2.9/applications.yaml

# AppProjects
kubectl get appprojects -n argocd -o yaml > argocd-backup-2.9/appprojects.yaml

# ApplicationSets
kubectl get applicationsets -n argocd -o yaml > argocd-backup-2.9/applicationsets.yaml

# ConfigMaps
for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm argocd-notifications-cm argocd-ssh-known-hosts-cm argocd-tls-certs-cm; do
  kubectl get cm -n argocd $cm -o yaml > argocd-backup-2.9/${cm}.yaml 2>/dev/null
done

# Secrets
kubectl get secret -n argocd argocd-secret -o yaml > argocd-backup-2.9/argocd-secret.yaml

# Repository credentials
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository -o yaml > argocd-backup-2.9/repo-secrets.yaml

# Cluster credentials
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=cluster -o yaml > argocd-backup-2.9/cluster-secrets.yaml
```

### 4. Audit Resource Tracking Method

Check your current resource tracking method. This is important because 2.10 changed defaults.

```bash
# Check current tracking method
kubectl get cm -n argocd argocd-cm -o jsonpath='{.data.application\.resourceTrackingMethod}'
```

If this returns empty, you are using the default (label-based in 2.9). In 2.10, the recommended method is `annotation+label`. If you have not explicitly set this, be aware that behavior may change.

### 5. Check RBAC Configuration

Review your current RBAC configuration for policies that might be affected.

```bash
kubectl get cm -n argocd argocd-rbac-cm -o yaml
```

Pay attention to policies using `applications` resource - some default permissions were refined in 2.10.

## Upgrade Steps

### Step 1: Update CRDs

```bash
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/applicationset-crd.yaml

# Verify CRDs are updated
kubectl get crd applications.argoproj.io -o jsonpath='{.metadata.annotations.kubectl\.kubernetes\.io/last-applied-configuration}' | jq -r '.metadata.labels'
```

### Step 2: Set Resource Tracking Explicitly

To avoid unexpected behavior changes, explicitly set your resource tracking method before upgrading.

```yaml
# In argocd-cm ConfigMap - keep the same method you were using
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Set explicitly to maintain current behavior
  application.resourceTrackingMethod: label
```

Apply this before upgrading.

```bash
kubectl apply -f argocd-cm-tracking.yaml
```

### Step 3: Review and Update RBAC

If you use custom RBAC policies, check if they need updates.

```yaml
# Example: Updated RBAC for 2.10
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # 2.10 adds more granular application permissions
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, action/*, */*, allow
    p, role:developer, logs, get, */*, allow

    # New in 2.10 - explicit exec permission
    p, role:sre, exec, create, */*, allow

    g, developers, role:developer
    g, sre-team, role:sre
  policy.default: role:readonly
```

### Step 4: Update the Helm Chart

Update your ArgoCD Helm chart dependency.

```yaml
# In Chart.yaml
dependencies:
  - name: argo-cd
    version: "6.7.0"  # Helm chart version for ArgoCD 2.10
    repository: "https://argoproj.github.io/argo-helm"
```

Key values changes for 2.10:

```yaml
# values.yaml updates for 2.10
argo-cd:
  # Server-side diff is now recommended as default
  configs:
    params:
      controller.diff.server.side: "true"

  # Application controller sharding improvements
  controller:
    replicas: 2  # For HA
    env:
      - name: ARGOCD_CONTROLLER_REPLICAS
        value: "2"

  # Redis HA (recommended for 2.10+)
  redis-ha:
    enabled: true
```

### Step 5: Apply the Upgrade

For GitOps-managed ArgoCD:

```bash
# Update versions in Git
git add .
git commit -m "Upgrade ArgoCD from 2.9 to 2.10"
git push

# Monitor the rollout
kubectl rollout status deploy/argocd-server -n argocd --timeout=300s
kubectl rollout status deploy/argocd-application-controller -n argocd --timeout=300s
kubectl rollout status deploy/argocd-repo-server -n argocd --timeout=300s
```

For Helm-managed ArgoCD:

```bash
helm dependency update
helm upgrade argocd . -n argocd -f values.yaml

# Or with external chart
helm upgrade argocd argo/argo-cd -n argocd -f values.yaml --version 6.7.0
```

### Step 6: Post-Upgrade Verification

```bash
# Check all pods are running
kubectl get pods -n argocd

# Verify version
argocd version

# Check for any applications that became out of sync
argocd app list --output json | jq -r '.[] | select(.status.sync.status != "Synced") | "\(.metadata.name): \(.status.sync.status)"'

# Check controller logs for errors
kubectl logs -n argocd deploy/argocd-application-controller --tail=100 | grep -E "error|ERROR|panic"

# Check repo server
kubectl logs -n argocd deploy/argocd-repo-server --tail=50 | grep -E "error|ERROR"

# Verify ApplicationSets are functioning
kubectl get applicationsets -n argocd
```

## Handling Multi-Source Applications

If you are migrating from single-source to multi-source applications:

```yaml
# Before (2.9 style with spec.source)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/your-org/repo.git
    path: manifests
    targetRevision: main

# After (2.10 multi-source - GA)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  sources:
    - repoURL: https://github.com/your-org/repo.git
      path: manifests
      targetRevision: main
    - repoURL: https://github.com/your-org/config.git
      ref: values
      targetRevision: main
```

Note that you can migrate gradually. Single-source (`spec.source`) applications continue to work in 2.10.

## Migrating Resource Tracking

If you decide to migrate to the newer annotation-based tracking:

```yaml
# In argocd-cm
data:
  application.resourceTrackingMethod: annotation
```

After changing the tracking method, all applications will need to be synced to update their tracking labels or annotations. You can do this gradually.

```bash
# Sync a specific application to update tracking
argocd app sync my-app --force

# Or sync all applications (use with caution)
argocd app list -o name | xargs -I {} argocd app sync {}
```

## Rollback Procedure

```bash
# Helm rollback
helm rollback argocd -n argocd

# Git rollback
git revert HEAD
git push

# Verify rollback
argocd version
kubectl get pods -n argocd

# If CRDs need rollback
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/applicationset-crd.yaml
```

## Common Issues

### Applications Show as OutOfSync After Upgrade

This is usually caused by the resource tracking or server-side diff changes. Check the diff in the ArgoCD UI and add `ignoreDifferences` if appropriate.

### ApplicationSet Template Errors

Go template syntax was improved in 2.10. If you use Go templates in ApplicationSets, test them after the upgrade.

### Redis Connection Issues

If Redis was upgraded as part of the ArgoCD update, existing connections may fail. Restart the application controller.

```bash
kubectl rollout restart deploy/argocd-application-controller -n argocd
```

## Summary

Upgrading ArgoCD from 2.9 to 2.10 is primarily about handling resource tracking method changes, RBAC refinements, and the multi-source application GA release. The key is to explicitly set your resource tracking method before upgrading to avoid unexpected sync status changes. Back up everything, test in staging first, and have your rollback procedure ready. The upgrade itself is straightforward, and the new features - especially multi-source GA and improved sharding - make it worthwhile.

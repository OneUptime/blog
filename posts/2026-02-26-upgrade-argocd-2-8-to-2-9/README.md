# How to Upgrade ArgoCD from 2.8 to 2.9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrade, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.8 to 2.9 covering breaking changes, CRD updates, new features, and rollback procedures.

---

ArgoCD 2.9 introduced several changes including an upgraded bundled Kustomize version and ongoing improvements across the Argo CD controllers. Upgrading from 2.8 to 2.9 is generally straightforward, but there are specific version and configuration updates you need to be aware of. This guide walks you through every step of the upgrade process.

## What Changed in ArgoCD 2.9

### Key New Features

- **Bundled Kustomize upgrade**: The bundled Kustomize version changed from 5.1.0 to 5.2.1
- **ApplicationSet Progressive Syncs**: Roll out changes to applications progressively using ApplicationSet strategies when the feature is enabled
- **Bundled notifications controller**: Notifications remain part of the standard ArgoCD installation
- **Bundled ApplicationSet controller**: ApplicationSet remains part of the standard ArgoCD installation
- **Updated Helm chart support**: The argo-cd Helm chart 5.51.0 maps to Argo CD 2.9.0

### Breaking Changes

- The bundled Kustomize upgrade from 5.1.0 to 5.2.1 can affect applications that depend on Kustomize rendering behavior.
- Notifications and ApplicationSet were already bundled in Argo CD before 2.9. If you still carry old standalone installations from earlier versions, remove duplicate controllers before relying on the bundled controllers.
- `spec.sources` (plural) is available for multi-source applications. `spec.source` remains valid for single-source applications.
- Starting with Argo CD 2.9.16, the NetworkPolicy for `argocd-redis` and `argocd-redis-ha-haproxy` dropped Egress restrictions. Review this if you upgrade directly to 2.9.16 or later.

## Pre-Upgrade Steps

### 1. Check Your Current Version

```bash
# Verify you are on 2.8.x

argocd version
kubectl get deploy -n argocd -o jsonpath='{.items[*].spec.template.spec.containers[*].image}' | tr ' ' '\n' | sort -u
```

### 2. Check Kubernetes Version Compatibility

ArgoCD 2.9 was tested with Kubernetes 1.25 through 1.28. The argo-cd Helm chart 5.51.0 declares `kubeVersion: ">=1.23.0-0"`. Verify your cluster version and your own support requirements.

```bash
kubectl version
```

### 3. Backup Everything

```bash
# Create a backup directory
mkdir -p argocd-backup-2.8

# Export all applications
kubectl get applications -n argocd -o yaml > argocd-backup-2.8/applications.yaml

# Export AppProjects
kubectl get appprojects -n argocd -o yaml > argocd-backup-2.8/appprojects.yaml

# Export ApplicationSets
kubectl get applicationsets -n argocd -o yaml > argocd-backup-2.8/applicationsets.yaml

# Export ConfigMaps
kubectl get cm -n argocd argocd-cm -o yaml > argocd-backup-2.8/argocd-cm.yaml
kubectl get cm -n argocd argocd-rbac-cm -o yaml > argocd-backup-2.8/argocd-rbac-cm.yaml
kubectl get cm -n argocd argocd-cmd-params-cm -o yaml > argocd-backup-2.8/argocd-cmd-params-cm.yaml
kubectl get cm -n argocd argocd-notifications-cm -o yaml > argocd-backup-2.8/argocd-notifications-cm.yaml

# Export secrets
kubectl get secret -n argocd argocd-secret -o yaml > argocd-backup-2.8/argocd-secret.yaml
kubectl get secret -n argocd argocd-notifications-secret -o yaml > argocd-backup-2.8/argocd-notifications-secret.yaml
```

### 4. Check Application Health

Ensure all applications are healthy before upgrading.

```bash
# List any unhealthy or out-of-sync applications
argocd app list --output json | jq -r '.[] | select(.status.health.status != "Healthy") | "\(.metadata.name): \(.status.health.status)"'

# Count total applications
argocd app list --output json | jq length
```

### 5. Handle Standalone Notifications Controller

If you deployed argocd-notifications separately, you need to remove it since the standard ArgoCD installation includes it natively.

```bash
# Check if standalone notifications controller exists
kubectl get deploy -n argocd argocd-notifications-controller 2>/dev/null

# If it exists, note your current notification configuration
kubectl get cm -n argocd argocd-notifications-cm -o yaml > notifications-config-backup.yaml
```

## Upgrade Steps

### Step 1: Update CRDs

CRDs need to be updated first because the new controller expects new fields.

```bash
# Apply the updated CRDs from 2.9
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/crds/applicationset-crd.yaml
```

Verify the CRDs are updated.

```bash
kubectl get crd applications.argoproj.io -o jsonpath='{.metadata.resourceVersion}'
```

### Step 2: Remove Standalone Controllers (If Applicable)

If you had standalone notifications or ApplicationSet controllers, remove them.

```bash
# Remove standalone notifications controller
kubectl delete deploy -n argocd argocd-notifications-controller --ignore-not-found

# Remove standalone ApplicationSet controller (if deployed separately)
kubectl delete deploy -n argocd argocd-applicationset-controller --ignore-not-found
```

Keep the ConfigMaps and Secrets - the bundled controllers will use them.

### Step 3: Update the Helm Chart Version

If you manage ArgoCD with Helm, update the chart version.

```yaml
# In your Chart.yaml
dependencies:
  - name: argo-cd
    version: "5.51.0"  # Helm chart version for ArgoCD 2.9
    repository: "https://argoproj.github.io/argo-helm"
```

Run the dependency update.

```bash
cd argocd-chart-directory
helm dependency update
```

### Step 4: Review Values Changes

Several Helm values changed between chart versions. Key changes include:

```yaml
# Notifications are included in the argo-cd chart
notifications:
  enabled: true

# ApplicationSet is included by default
applicationSet:
  enabled: true

# Progressive Syncs are controlled through argocd-cmd-params-cm
configs:
  params:
    applicationsetcontroller.enable.progressive.syncs: "true"
```

### Step 5: Apply the Upgrade

If ArgoCD manages itself through GitOps:

```bash
# Push the version change to Git
git add .
git commit -m "Upgrade ArgoCD from 2.8 to 2.9"
git push

# ArgoCD will detect the change and upgrade itself
# Monitor the rollout
kubectl rollout status deploy/argocd-server -n argocd
kubectl rollout status statefulset/argocd-application-controller -n argocd
kubectl rollout status deploy/argocd-repo-server -n argocd
```

If using Helm directly:

```bash
helm upgrade argocd argo/argo-cd -n argocd -f values.yaml --version 5.51.0
```

### Step 6: Verify the Upgrade

```bash
# Check all pods are running the new version
kubectl get pods -n argocd -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# Verify ArgoCD version
argocd version

# Check application sync status
argocd app list --output wide

# Check for errors in logs
kubectl logs -n argocd statefulset/argocd-application-controller --tail=100 | grep -i error
kubectl logs -n argocd deploy/argocd-server --tail=100 | grep -i error
kubectl logs -n argocd deploy/argocd-repo-server --tail=100 | grep -i error

# Verify notifications are working (if configured)
kubectl logs -n argocd deploy/argocd-notifications-controller --tail=50
```

## Post-Upgrade Configuration

### Review Kustomize Rendering

ArgoCD 2.9 upgrades bundled Kustomize from 5.1.0 to 5.2.1. If your applications rely on Kustomize-specific behavior, render and compare those applications before and after the upgrade.

```bash
argocd app diff my-app
```

### Migrate to Multi-Source Applications

Use `spec.sources` for applications that need multiple sources. Keep `spec.source` for single-source applications.

```yaml
# Old (still works)
spec:
  source:
    repoURL: https://github.com/your-org/repo.git
    path: manifests

# New multi-source support
spec:
  sources:
    - repoURL: https://github.com/your-org/repo.git
      path: manifests
    - repoURL: https://github.com/your-org/config.git
      path: values
      ref: values
```

## Rollback Procedure

If issues arise after upgrading:

```bash
# If using Helm
helm rollback argocd -n argocd

# If using GitOps, revert the Git commit
git revert HEAD
git push

# If CRDs cause issues, downgrade them
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.8.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.8.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.8.0/manifests/crds/applicationset-crd.yaml

# Verify rollback
argocd version
argocd app list
```

## Common Issues After Upgrade

### ApplicationSet Controller Conflict

If you see errors about the ApplicationSet controller, ensure the standalone installation was removed.

```bash
kubectl get deploy -n argocd | grep applicationset
# Should show only one controller
```

### Notification Template Errors

If notification templates break after removing an old standalone installation, compare your `argocd-notifications-cm` and `argocd-notifications-secret` with the notification configuration expected by the bundled controller.

### Kustomize Rendering Changes

The bundled Kustomize upgrade may render some applications differently. Some applications may appear out of sync after the upgrade even though your manifests did not change. Review these carefully and adjust manifests or `ignoreDifferences` if needed.

## Summary

Upgrading ArgoCD from 2.8 to 2.9 is primarily about applying the new manifests or Helm chart, updating CRDs, and reviewing the bundled Kustomize version change. Back up everything before starting, remove any leftover standalone controllers from older installations, and verify thoroughly after the upgrade. The rollback procedure is straightforward with Helm or Git revert if needed. Plan for about 30 minutes of maintenance window for the upgrade, though the actual downtime should be minimal since ArgoCD handles rolling updates.

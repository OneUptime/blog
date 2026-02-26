# How to Upgrade ArgoCD from 2.11 to 2.12

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrades, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.11 to 2.12 covering breaking changes, new features, performance improvements, and migration procedures.

---

ArgoCD 2.12 is a significant release that brings performance improvements, enhanced security features, and important changes to how applications are managed. This guide walks you through upgrading from 2.11 to 2.12 with detailed instructions for every step, including handling breaking changes and verifying the upgrade.

## What Changed in ArgoCD 2.12

### Key New Features

- **Improved application controller performance**: Significant reductions in memory usage and reconciliation time
- **Enhanced ApplicationSet features**: New generators and improved template merge strategies
- **Improved SSO support**: Better OIDC handling and token management
- **Resource tracking improvements**: More reliable tracking with reduced false sync diffs
- **Improved Helm OCI support**: Better handling of OCI-based Helm charts
- **Native retry for sync operations**: Built-in retry logic for transient sync failures
- **Improved UI**: Faster rendering, better search, and new visualization features

### Breaking Changes

- **Minimum Kubernetes version**: 2.12 requires Kubernetes 1.27 or later. Kubernetes 1.26 and earlier are no longer supported.
- **Redis version**: ArgoCD 2.12 requires Redis 7.0+. If you are running an older Redis, upgrade it first.
- **Deprecated API fields removed**: Some API fields deprecated since 2.9 were removed.
- **ConfigMap consolidation**: Some configuration moved from `argocd-cm` to `argocd-cmd-params-cm`.
- **Notification controller changes**: The notification controller configuration was further refined.

## Pre-Upgrade Requirements

### 1. Verify Kubernetes Version

This is critical - ArgoCD 2.12 drops support for Kubernetes 1.26.

```bash
# Check Kubernetes version
kubectl version

# If you are on 1.26 or earlier, upgrade Kubernetes first!
```

### 2. Verify Redis Version

```bash
# Check current Redis version
kubectl exec -n argocd deploy/argocd-redis -- redis-server --version

# If using Redis HA
kubectl exec -n argocd argocd-redis-ha-server-0 -- redis-server --version

# Must be 7.0+
```

If Redis is too old, upgrade it before upgrading ArgoCD.

```yaml
# Update Redis in your ArgoCD values
redis:
  image:
    tag: 7.2.4-alpine
```

### 3. Full Configuration Backup

```bash
mkdir -p argocd-backup-2.11

# Comprehensive backup script
for type in applications appprojects applicationsets; do
  kubectl get $type -n argocd -o yaml > argocd-backup-2.11/${type}.yaml
done

for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm argocd-notifications-cm argocd-ssh-known-hosts-cm argocd-tls-certs-cm; do
  kubectl get cm -n argocd $cm -o yaml > argocd-backup-2.11/${cm}.yaml 2>/dev/null
done

for secret in argocd-secret argocd-notifications-secret; do
  kubectl get secret -n argocd $secret -o yaml > argocd-backup-2.11/${secret}.yaml 2>/dev/null
done

# Backup repo and cluster credentials
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository -o yaml > argocd-backup-2.11/repo-credentials.yaml
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=cluster -o yaml > argocd-backup-2.11/cluster-credentials.yaml

# Backup CRDs
for crd in applications.argoproj.io appprojects.argoproj.io applicationsets.argoproj.io; do
  kubectl get crd $crd -o yaml > argocd-backup-2.11/${crd}.yaml
done
```

### 4. Audit Deprecated Features

Check for any deprecated features that were removed in 2.12.

```bash
# Check for deprecated annotations on applications
kubectl get applications -n argocd -o json | jq '.items[] | select(.metadata.annotations["argocd.argoproj.io/manifest-generate-paths"] != null) | .metadata.name'

# Check for deprecated sync options
kubectl get applications -n argocd -o json | jq '.items[] | select(.spec.syncPolicy.syncOptions[]? | test("Validate=")) | .metadata.name'
```

### 5. Check ConfigMap Settings That Moved

Some settings moved from `argocd-cm` to `argocd-cmd-params-cm` in 2.12.

```bash
# List all current argocd-cm settings
kubectl get cm -n argocd argocd-cm -o json | jq '.data | keys[]'

# List all current argocd-cmd-params-cm settings
kubectl get cm -n argocd argocd-cmd-params-cm -o json | jq '.data | keys[]'
```

Review the 2.12 release notes for the specific settings that moved and update your configuration accordingly.

## Upgrade Steps

### Step 1: Upgrade Redis (If Needed)

If your Redis version is below 7.0, upgrade it first.

```yaml
# In your ArgoCD values
redis:
  image:
    repository: redis
    tag: 7.2.4-alpine

# Or for Redis HA
redis-ha:
  image:
    repository: redis
    tag: 7.2.4-alpine
```

Apply the Redis upgrade and verify it before proceeding.

```bash
# Verify Redis is running the new version
kubectl exec -n argocd deploy/argocd-redis -- redis-server --version
```

### Step 2: Update CRDs

```bash
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/crds/applicationset-crd.yaml

# Verify
for crd in applications.argoproj.io appprojects.argoproj.io applicationsets.argoproj.io; do
  echo "$crd updated: $(kubectl get crd $crd -o jsonpath='{.metadata.resourceVersion}')"
done
```

### Step 3: Migrate ConfigMap Settings

Move any settings that changed location.

```yaml
# argocd-cmd-params-cm - ensure settings are in the right place
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server-side diff (should already be here from 2.10+)
  controller.diff.server.side: "true"

  # Resource tracking method
  application.resourceTrackingMethod: "annotation"

  # Application controller settings
  controller.operation.processors: "25"
  controller.status.processors: "50"
  controller.repo.server.timeout.seconds: "300"

  # Repo server settings
  reposerver.parallelism.limit: "0"

  # Server settings
  server.enable.proxy.extension: "false"
```

### Step 4: Update Helm Chart Version

```yaml
# In Chart.yaml
dependencies:
  - name: argo-cd
    version: "7.3.0"  # Helm chart version for ArgoCD 2.12
    repository: "https://argoproj.github.io/argo-helm"
```

Key values for 2.12:

```yaml
argo-cd:
  global:
    image:
      tag: v2.12.0

  controller:
    replicas: 2
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        memory: 1Gi  # 2.12 is more memory-efficient

  repoServer:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        memory: 512Mi

  server:
    replicas: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

  redis:
    image:
      tag: 7.2.4-alpine

  configs:
    params:
      controller.diff.server.side: "true"
      application.resourceTrackingMethod: "annotation"
```

### Step 5: Apply the Upgrade

For GitOps-managed ArgoCD:

```bash
# Commit and push
git add .
git commit -m "Upgrade ArgoCD from 2.11 to 2.12"
git push

# Monitor the rollout - this may take a few minutes
kubectl rollout status deploy/argocd-server -n argocd --timeout=600s
kubectl rollout status deploy/argocd-application-controller -n argocd --timeout=600s
kubectl rollout status deploy/argocd-repo-server -n argocd --timeout=600s
kubectl rollout status deploy/argocd-applicationset-controller -n argocd --timeout=300s
kubectl rollout status deploy/argocd-notifications-controller -n argocd --timeout=300s
```

For Helm-managed ArgoCD:

```bash
helm dependency update
helm upgrade argocd . -n argocd -f values.yaml --timeout 600s
```

### Step 6: Comprehensive Verification

```bash
# 1. Check all ArgoCD pods
kubectl get pods -n argocd

# 2. Verify version
argocd version

# 3. Check application health
argocd app list --output json | jq '[.[] | .status.health.status] | group_by(.) | map({status: .[0], count: length})'

# 4. Check sync status
argocd app list --output json | jq '[.[] | .status.sync.status] | group_by(.) | map({status: .[0], count: length})'

# 5. Verify Redis connection
kubectl exec -n argocd deploy/argocd-server -- argocd-server --redis-server argocd-redis.argocd.svc.cluster.local:6379 version 2>/dev/null

# 6. Check controller reconciliation
kubectl logs -n argocd deploy/argocd-application-controller --tail=50 | grep "Reconciliation completed"

# 7. Check for any errors
for deploy in argocd-server argocd-application-controller argocd-repo-server argocd-applicationset-controller argocd-notifications-controller; do
  errors=$(kubectl logs -n argocd deploy/$deploy --tail=200 2>/dev/null | grep -c -i "error")
  echo "$deploy: $errors errors in last 200 log lines"
done

# 8. Test a sync operation
argocd app sync test-app --dry-run

# 9. Verify ApplicationSets
kubectl get applicationsets -n argocd -o json | jq '.items[] | {name: .metadata.name, conditions: .status.conditions}'
```

## Performance Tuning for 2.12

ArgoCD 2.12 includes performance improvements. Take advantage of them.

```yaml
# Optimized settings for 2.12
configs:
  params:
    # Increase operation processors for faster syncs
    controller.operation.processors: "25"
    controller.status.processors: "50"

    # Repo server caching
    reposerver.enable.git.submodule: "false"  # If you don't use submodules

    # Controller sharding for large deployments
    controller.sharding.algorithm: "round-robin"
```

## Monitoring After Upgrade

Set up alerts to watch for issues in the first 48 hours after the upgrade.

```yaml
# Prometheus alerting rule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-upgrade-monitor
  namespace: monitoring
spec:
  groups:
    - name: argocd-upgrade
      rules:
        - alert: ArgocdApplicationSyncFailing
          expr: |
            sum(argocd_app_sync_total{phase="Error"}) by (name) > 3
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD application {{ $labels.name }} has sync failures after upgrade"

        - alert: ArgocdControllerHighMemory
          expr: |
            container_memory_working_set_bytes{container="argocd-application-controller"} > 1.5e9
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD controller memory usage is high after upgrade"

        - alert: ArgocdReconciliationSlow
          expr: |
            histogram_quantile(0.99, sum(rate(argocd_app_reconcile_bucket[5m])) by (le)) > 30
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD reconciliation is slower than expected after upgrade"
```

## Rollback Procedure

```bash
# 1. Helm rollback
helm rollback argocd -n argocd

# 2. Downgrade CRDs if needed
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/applicationset-crd.yaml

# 3. Restore ConfigMaps if changed
kubectl apply -f argocd-backup-2.11/argocd-cm.yaml
kubectl apply -f argocd-backup-2.11/argocd-cmd-params-cm.yaml

# 4. Verify rollback
argocd version
kubectl get pods -n argocd
argocd app list
```

## Common Issues

### OOM Kills During Initial Reconciliation

After upgrading, the controller may reconcile all applications, causing temporary memory spikes. If you see OOM kills, temporarily increase memory limits.

```bash
kubectl set resources deploy/argocd-application-controller -n argocd --limits=memory=2Gi
```

### Redis Protocol Errors

If Redis was upgraded alongside ArgoCD, existing connections may fail. Restart the application controller and API server.

```bash
kubectl rollout restart deploy/argocd-application-controller -n argocd
kubectl rollout restart deploy/argocd-server -n argocd
```

### SSO Login Failures

If OIDC or SSO breaks after the upgrade, check the Dex configuration and verify the OIDC token settings in `argocd-cm`.

```bash
kubectl logs -n argocd deploy/argocd-dex-server --tail=50
```

## Summary

Upgrading ArgoCD from 2.11 to 2.12 requires verifying Kubernetes version compatibility (1.27+), ensuring Redis is at version 7.0+, and migrating any ConfigMap settings that changed location. The performance improvements in 2.12 are significant - expect lower memory usage and faster reconciliation times. Follow the upgrade procedure step by step, verify thoroughly at each stage, and keep your rollback plan ready. For production environments, always test the upgrade in staging first and allow 48 hours of monitoring before considering the upgrade complete.

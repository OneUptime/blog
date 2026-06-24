# How to Upgrade ArgoCD from 2.11 to 2.12

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrade, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.11 to 2.12 covering breaking changes, new features, performance improvements, and migration procedures.

---

ArgoCD 2.12 is a significant release that brings important changes to how applications, ApplicationSets, and cluster secrets are managed. This guide walks you through upgrading from 2.11 to 2.12 with detailed instructions for every step, including handling breaking changes and verifying the upgrade.

## What Changed in ArgoCD 2.12

### Key Changes

- **Cluster secret scoping changes**: Applications and ApplicationSets now require project-scoped cluster secrets to match the application's project.
- **Bundled Helm upgrade**: The bundled Helm version changed from 3.14.4 to 3.15.2.
- **Redis HA chart update**: The upstream `redis-ha` Helm chart used by the community Helm chart was upgraded, and the default `redis` and `haproxy` image registries changed from Docker Hub to AWS ECR.
- **ApplicationSet CRD field management changes**: Several ApplicationSet selector fields now use atomic server-side apply map semantics.
- **Additional health checks**: ArgoCD 2.12 added health checks for several third-party CRDs.

### Breaking Changes

- **Cluster secret project matching**: Cluster secrets with a non-empty `project` field are only used by applications in the same project. Unset the `project` field on any cluster secret that must be shared across projects.
- **ApplicationSet Git generator and cluster secrets**: ApplicationSets are not scoped to a project, so cluster secrets used by the Git generator must be globally scoped.
- **ApplicationSet server-side apply ownership**: If multiple field managers manage the same `selector` or `labelSelector` field in an ApplicationSet, update them so one field manager owns the whole selector.
- **Redis and HAProxy image registry**: If you use the community Helm chart with Redis HA enabled, verify that your admission, signing, and image allow-list policies permit the new AWS ECR image registry.

## Pre-Upgrade Requirements

### 1. Verify Kubernetes Version

ArgoCD 2.12 was tested with Kubernetes 1.26 through 1.29. If your control plane is outside that range, validate compatibility before upgrading.

```bash
# Check Kubernetes version

kubectl version

# If you are outside the tested range, validate or upgrade Kubernetes first.
```

### 2. Verify Redis Version and Registry

```bash
# Check current Redis version
kubectl exec -n argocd deploy/argocd-redis -- redis-server --version

# If using Redis HA
kubectl exec -n argocd argocd-redis-ha-server-0 -- redis-server --version

```

The upstream v2.12 manifests use Redis 7.0.15, and the community Helm chart defaults to Redis 7.2.4 from AWS ECR. If your installation pins an older Redis image or blocks ECR images, update that before upgrading ArgoCD.

```yaml
# Update Redis in your ArgoCD values
redis:
  image:
    repository: public.ecr.aws/docker/library/redis
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

### 4. Audit Cluster Secret Project Scoping

Check for cluster secrets with a non-empty `project` field. After the upgrade, they can only be used by applications in the same project.

```bash
# List project-scoped cluster secrets
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=cluster -o json \
  | jq -r '.items[] | select(.data.project != null) | "\(.metadata.name)\tproject=\(.data.project | @base64d)"'
```

If a cluster secret should be shared by applications in multiple projects, remove its `project` field before upgrading.

### 5. Check Runtime Settings

```bash
# List all current argocd-cm settings
kubectl get cm -n argocd argocd-cm -o json | jq '.data | keys[]'

# List all current argocd-cmd-params-cm settings
kubectl get cm -n argocd argocd-cmd-params-cm -o json | jq '.data | keys[]'
```

Review your settings against the 2.12 `argocd-cm` and `argocd-cmd-params-cm` examples and keep settings in the ConfigMap where ArgoCD expects them.

## Upgrade Steps

### Step 1: Upgrade Redis (If Needed)

If your Redis image is pinned to an older version or registry, upgrade it first.

```yaml
# In your ArgoCD values
redis:
  image:
    repository: public.ecr.aws/docker/library/redis
    tag: 7.2.4-alpine

# Or for Redis HA
redis-ha:
  image:
    repository: public.ecr.aws/docker/library/redis
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

### Step 3: Review ConfigMap Settings

Keep command-line parameters in `argocd-cmd-params-cm`.

```yaml
# argocd-cmd-params-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server-side diff (should already be here from 2.10+)
  controller.diff.server.side: "true"

  # Application controller settings
  controller.operation.processors: "25"
  controller.status.processors: "50"
  controller.repo.server.timeout.seconds: "300"

  # Repo server settings
  reposerver.parallelism.limit: "0"

  # Server settings
  server.enable.proxy.extension: "false"
```

Keep general ArgoCD settings such as the resource tracking method in `argocd-cm`.

```yaml
# argocd-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: "annotation"
```

### Step 4: Update Helm Chart Version

```yaml
# In Chart.yaml
dependencies:
  - name: argo-cd
    version: "7.4.0"  # Helm chart version for ArgoCD 2.12.0
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
      repository: public.ecr.aws/docker/library/redis
      tag: 7.2.4-alpine

  configs:
    cm:
      application.resourceTrackingMethod: "annotation"
    params:
      controller.diff.server.side: "true"
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
kubectl rollout status statefulset/argocd-application-controller -n argocd --timeout=600s
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

# 5. Verify Redis responds
REDIS_PASSWORD=$(kubectl get secret argocd-redis -n argocd -o jsonpath='{.data.auth}' | base64 -d)
kubectl exec -n argocd deploy/argocd-redis -- redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping

# 6. Check controller reconciliation
kubectl logs -n argocd statefulset/argocd-application-controller --tail=50 | grep "Reconciliation completed"

# 7. Check for any errors
for deploy in argocd-server argocd-repo-server argocd-applicationset-controller argocd-notifications-controller; do
  errors=$(kubectl logs -n argocd deploy/$deploy --tail=200 2>/dev/null | grep -c -i "error")
  echo "$deploy: $errors errors in last 200 log lines"
done
errors=$(kubectl logs -n argocd statefulset/argocd-application-controller --tail=200 2>/dev/null | grep -c -i "error")
echo "argocd-application-controller: $errors errors in last 200 log lines"

# 8. Test a sync operation
argocd app sync test-app --dry-run

# 9. Verify ApplicationSets
kubectl get applicationsets -n argocd -o json | jq '.items[] | {name: .metadata.name, conditions: .status.conditions}'
```

## Performance Tuning

Review these tuning settings after the upgrade and adjust them for your installation size.

```yaml
# Example tuning settings
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
            sum(increase(argocd_app_sync_total{phase=~"Error|Failed"}[10m])) by (name) > 3
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
kubectl set resources statefulset/argocd-application-controller -n argocd --limits=memory=2Gi
```

### Redis Protocol Errors

If Redis was upgraded alongside ArgoCD, existing connections may fail. Restart the application controller and API server.

```bash
kubectl rollout restart statefulset/argocd-application-controller -n argocd
kubectl rollout restart deploy/argocd-server -n argocd
```

### SSO Login Failures

If OIDC or SSO breaks after the upgrade, check the Dex configuration and verify the OIDC token settings in `argocd-cm`.

```bash
kubectl logs -n argocd deploy/argocd-dex-server --tail=50
```

## Summary

Upgrading ArgoCD from 2.11 to 2.12 requires verifying Kubernetes version compatibility, checking the cluster secret project-scoping change, and ensuring Redis image registry changes are acceptable in your environment. Follow the upgrade procedure step by step, verify thoroughly at each stage, and keep your rollback plan ready. For production environments, always test the upgrade in staging first and allow 48 hours of monitoring before considering the upgrade complete.

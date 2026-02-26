# How to Upgrade ArgoCD from 2.10 to 2.11

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrades, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.10 to 2.11 covering breaking changes, new features, ApplicationSet improvements, and migration steps.

---

ArgoCD 2.11 continued the evolution of the platform with improvements to ApplicationSet progressive syncs, enhanced security features, and important changes to how applications are reconciled. This guide provides a detailed walkthrough of the upgrade process from 2.10 to 2.11, covering every change that might affect your production setup.

## What Changed in ArgoCD 2.11

### Key New Features

- **ApplicationSet progressive syncs improvements**: More control over how ApplicationSet-generated applications are synced
- **Improved server-side diff**: Enhanced accuracy and performance of server-side diff calculations
- **Enhanced webhook support**: Better GitHub, GitLab, and Bitbucket webhook handling
- **Improved resource health checks**: New built-in health checks for additional Kubernetes resource types
- **Application controller sharding V2**: Improved algorithm for distributing applications across controller shards
- **Proxy extensions**: Support for extending the ArgoCD UI with custom proxy endpoints

### Breaking Changes

- **Notification template changes**: Some notification template variables were renamed for consistency
- **ApplicationSet merge generator behavior**: The merge generator's conflict resolution was changed
- **Health check changes**: Some resources may report different health states after the upgrade
- **CLI output format changes**: Some CLI commands changed their JSON output structure

## Pre-Upgrade Checklist

### 1. Verify Current Version and Cluster State

```bash
# Verify current ArgoCD version
argocd version

# Check Kubernetes version - 2.11 supports 1.27 through 1.31
kubectl version --short

# Verify cluster health
kubectl get nodes
kubectl get pods -n argocd
```

### 2. Full Configuration Backup

```bash
mkdir -p argocd-backup-2.10

# Export all ArgoCD resources
for resource in applications appprojects applicationsets; do
  kubectl get $resource -n argocd -o yaml > argocd-backup-2.10/${resource}.yaml
done

# Export all ConfigMaps
kubectl get cm -n argocd -o yaml > argocd-backup-2.10/configmaps.yaml

# Export all Secrets (careful with these)
kubectl get secrets -n argocd -l app.kubernetes.io/part-of=argocd -o yaml > argocd-backup-2.10/secrets.yaml

# Export RBAC
kubectl get cm -n argocd argocd-rbac-cm -o yaml > argocd-backup-2.10/rbac.yaml
```

### 3. Check Notification Templates

If you use ArgoCD notifications, review your templates. Some variables changed in 2.11.

```bash
kubectl get cm -n argocd argocd-notifications-cm -o yaml > argocd-backup-2.10/notifications.yaml
```

Common template variable changes:

```yaml
# Old variable names (2.10)
# {{ .app.status.operationState.syncResult.revision }}

# New variable names (2.11 - check release notes for specifics)
# {{ .app.status.operationState.syncResult.revisions }}
```

### 4. Review ApplicationSet Merge Generators

If you use merge generators in ApplicationSets, test them after upgrading because conflict resolution behavior changed.

```bash
# List ApplicationSets using merge generators
kubectl get applicationsets -n argocd -o json | jq '.items[] | select(.spec.generators[].merge != null) | .metadata.name'
```

### 5. Check for Custom Health Checks

Custom health checks defined in `argocd-cm` may need updates if they conflict with new built-in health checks.

```bash
# List custom health checks
kubectl get cm -n argocd argocd-cm -o json | jq '.data | keys[] | select(startswith("resource.customizations.health"))'
```

## Upgrade Steps

### Step 1: Update CRDs

Apply the new CRDs before upgrading the ArgoCD components.

```bash
# Download and apply updated CRDs
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.11.0/manifests/crds/applicationset-crd.yaml

# Verify CRDs were updated
for crd in applications.argoproj.io appprojects.argoproj.io applicationsets.argoproj.io; do
  echo "$crd: $(kubectl get crd $crd -o jsonpath='{.metadata.resourceVersion}')"
done
```

### Step 2: Update Notification Templates

If you use notifications, update any affected templates before the upgrade.

```yaml
# argocd-notifications-cm updates
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Verify your templates work with 2.11
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} is now running new version.
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "color": "#18be52",
          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Repository",
              "value": "{{.app.spec.source.repoURL}}",
              "short": true
            }
          ]
        }]
```

### Step 3: Update the Helm Chart

```yaml
# In Chart.yaml
dependencies:
  - name: argo-cd
    version: "6.11.0"  # Helm chart for ArgoCD 2.11
    repository: "https://argoproj.github.io/argo-helm"
```

Key values updates for 2.11:

```yaml
argo-cd:
  # Controller sharding V2 (recommended)
  controller:
    replicas: 2
    env:
      - name: ARGOCD_CONTROLLER_REPLICAS
        value: "2"

  configs:
    params:
      # Server-side diff (recommended as stable in 2.11)
      controller.diff.server.side: "true"

      # New in 2.11 - progressive sync support for ApplicationSets
      applicationsetcontroller.enable.progressive.syncs: "true"

  # Proxy extensions (new in 2.11)
  server:
    extensions:
      enabled: false  # Enable if you use proxy extensions
```

### Step 4: Apply the Upgrade

For GitOps self-managed ArgoCD:

```bash
git add .
git commit -m "Upgrade ArgoCD from 2.10 to 2.11"
git push

# Monitor the rollout
watch kubectl get pods -n argocd
```

For Helm-managed ArgoCD:

```bash
helm dependency update
helm upgrade argocd . -n argocd -f values.yaml
```

### Step 5: Post-Upgrade Verification

Run a thorough verification after the upgrade.

```bash
# Verify all pods are running
kubectl get pods -n argocd

# Check version
argocd version

# Check for any sync issues
argocd app list --output json | jq -r '.[] | select(.status.sync.status != "Synced") | "\(.metadata.name): sync=\(.status.sync.status) health=\(.status.health.status)"'

# Check controller logs for errors
kubectl logs -n argocd deploy/argocd-application-controller --tail=200 | grep -c ERROR

# Check repo server
kubectl logs -n argocd deploy/argocd-repo-server --tail=100 | grep -c ERROR

# Check API server
kubectl logs -n argocd deploy/argocd-server --tail=100 | grep -c ERROR

# Verify ApplicationSets are working
kubectl get applicationsets -n argocd -o json | jq '.items[] | {name: .metadata.name, status: .status}'

# Test a sync operation on a non-critical application
argocd app sync test-app --dry-run
```

## Handling Health Check Changes

After the upgrade, some resources may show different health status. This is expected when new health checks are added for resource types that previously showed as "Healthy" by default.

If a resource shows as "Degraded" that was previously "Healthy":

```bash
# Check the health message
argocd app get my-app --output json | jq '.status.resources[] | select(.health.status != "Healthy") | {kind: .kind, name: .name, health: .health}'
```

If the new health check is too aggressive for your use case, override it.

```yaml
# In argocd-cm
data:
  resource.customizations.health.apps_Deployment: |
    hs = {}
    hs.status = "Healthy"
    return hs
```

Only do this as a temporary workaround. The correct fix is to resolve the actual health issue.

## ApplicationSet Progressive Syncs

2.11 improves progressive syncs. If you want to use this feature:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-set
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: region
              operator: In
              values:
                - us-east-1
          maxUpdate: 1
        - matchExpressions:
            - key: region
              operator: In
              values:
                - us-west-2
                - eu-west-1
          maxUpdate: 2
  template:
    metadata:
      name: "{{name}}-my-app"
    spec:
      source:
        repoURL: https://github.com/your-org/repo.git
        path: manifests
        targetRevision: main
      destination:
        server: "{{server}}"
        namespace: my-app
```

## Rollback Procedure

```bash
# Helm rollback
helm rollback argocd -n argocd

# Verify rollback
argocd version
kubectl get pods -n argocd

# If needed, restore CRDs
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/application-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/appproject-crd.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/crds/applicationset-crd.yaml

# Restore notification templates if changed
kubectl apply -f argocd-backup-2.10/notifications.yaml
```

## Common Issues

### Applications Flapping Between Synced and OutOfSync

This can happen due to health check changes. Check which resources are causing the issue and add `ignoreDifferences` if the changes are expected.

### Webhook Delivery Failures

If GitHub or GitLab webhooks stop working, check the webhook configuration. The webhook path may have changed.

```bash
# Check webhook logs
kubectl logs -n argocd deploy/argocd-server --tail=100 | grep webhook
```

### Increased Memory Usage

The improved server-side diff may use more memory. Monitor the repo server and increase limits if needed.

```yaml
repoServer:
  resources:
    limits:
      memory: 2Gi  # Increase from default if needed
```

## Summary

Upgrading ArgoCD from 2.10 to 2.11 focuses on ApplicationSet progressive sync improvements, enhanced health checks, and server-side diff maturation. The main areas to watch are notification template variables, merge generator behavior, and new health check states that may affect your applications. Back up your configuration, test in staging, and verify thoroughly after the upgrade. The progressive sync feature alone makes this upgrade worthwhile for teams managing applications across multiple clusters.

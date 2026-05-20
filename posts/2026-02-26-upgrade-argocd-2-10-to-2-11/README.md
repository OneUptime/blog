# How to Upgrade ArgoCD from 2.10 to 2.11

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Upgrade, Migration

Description: Step-by-step guide to upgrading ArgoCD from version 2.10 to 2.11 covering breaking changes, new features, ApplicationSet improvements, and migration steps.

---

ArgoCD 2.11 continued the evolution of the platform with Application CRD schema updates, Helm chart changes, and optional features that are useful to review before upgrading. This guide provides a detailed walkthrough of the upgrade process from 2.10 to 2.11, covering the changes that might affect your production setup.

## What Changed in ArgoCD 2.11

### Key New Features

- **Application CRD schema update**: `initiatedBy` was added to the Application CRD
- **Server-side diff available as opt-in beta**: Server-side diff can be enabled globally or per application
- **ApplicationSet progressive syncs remain opt-in alpha**: RollingSync can control updates to ApplicationSet-generated applications
- **Application controller sharding options**: Controller sharding can use the default `legacy` algorithm or the opt-in `round-robin` algorithm
- **Helm chart controller option**: The argo-cd chart can run the application controller as a StatefulSet when `controller.enableStatefulSet` is enabled

### Breaking Changes

- **Application CRD update**: Apply the 2.11 CRDs so the API server knows about the new Application schema
- **Redis NetworkPolicy change in 2.11.2 and later**: The `argocd-redis` and `argocd-redis-ha-haproxy` NetworkPolicies dropped egress restrictions, so review custom network policies if you depend on strict Redis egress rules
- **Helm chart StatefulSet option**: Enabling `controller.enableStatefulSet` for the application controller can be a downtime or breaking change in HA deployments

## Pre-Upgrade Checklist

### 1. Verify Current Version and Cluster State

```bash
# Verify current ArgoCD version

argocd version

# Check Kubernetes version - Argo CD 2.11 was tested with Kubernetes 1.25 through 1.29
kubectl version

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

If you use ArgoCD notifications, back up your templates before the upgrade. The 2.10 to 2.11 upgrade notes do not require a notification template migration, but templates are a common customization to verify in staging.

```bash
kubectl get cm -n argocd argocd-notifications-cm -o yaml > argocd-backup-2.10/notifications.yaml
```

Example field to verify if your templates report the synced revision:

```yaml
# {{ .app.status.operationState.syncResult.revision }}
# For multi-source applications, verify whether your template should use:
# {{ .app.status.operationState.syncResult.revisions }}
```

### 4. Review ApplicationSet Merge Generators

If you use merge generators in ApplicationSets, test them after upgrading. The 2.10 to 2.11 upgrade notes do not document a merge generator behavior change, but generated Application output should still be verified in staging.

```bash
# List ApplicationSets using merge generators
kubectl get applicationsets -n argocd -o json | jq '.items[] | select(.spec.generators[].merge != null) | .metadata.name'
```

### 5. Check for Custom Health Checks

Custom health checks defined in `argocd-cm` should be reviewed during staging tests.

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
  # Controller sharding with two controller replicas
  controller:
    replicas: 2
    env:
      - name: ARGOCD_CONTROLLER_REPLICAS
        value: "2"

  configs:
    params:
      # Server-side diff (opt-in beta in 2.11)
      controller.diff.server.side: "true"

      # Progressive sync support for ApplicationSets (opt-in alpha)
      applicationsetcontroller.enable.progressive.syncs: "true"

  # UI extensions
  server:
    extensions:
      enabled: false  # Enable if you use Argo CD UI extensions
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

After the upgrade, verify resource health status for your applications. If a resource shows as "Degraded" that was previously "Healthy", inspect the resource before overriding health behavior.

If a resource shows as "Degraded":

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

Progressive syncs are an opt-in alpha feature in 2.11. If you want to use this feature:

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
      labels:
        region: "{{metadata.labels.region}}"
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

Check which resources are causing the issue and add `ignoreDifferences` only if the live changes are expected and should be ignored by Argo CD.

### Webhook Delivery Failures

If GitHub or GitLab webhooks stop working, check the webhook configuration and Argo CD server logs.

```bash
# Check webhook logs
kubectl logs -n argocd deploy/argocd-server --tail=100 | grep webhook
```

### Increased Memory Usage

Server-side diff sends dry-run server-side apply requests to the Kubernetes API server. Monitor the application controller and Kubernetes API server after enabling it, and increase limits if needed.

```yaml
controller:
  resources:
    limits:
      memory: 2Gi  # Increase from default if needed
```

## Summary

Upgrading ArgoCD from 2.10 to 2.11 focuses on applying the updated Application CRD, reviewing Helm chart behavior, and deciding whether to enable optional features such as server-side diff or ApplicationSet progressive syncs. Back up your configuration, test in staging, and verify thoroughly after the upgrade. Progressive syncs can be useful for teams managing applications across multiple clusters, but treat them as an alpha feature in 2.11.

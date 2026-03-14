# How to Handle Manual ConfigMap Changes with Flux Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, ConfigMap, Configuration Management

Description: Manage manual ConfigMap updates alongside Flux reconciliation using the correct patterns to avoid Flux reverting emergency configuration changes.

---

## Introduction

ConfigMaps hold application configuration that sometimes needs emergency updates outside the normal Git PR workflow. A database connection string changed, a feature flag needs to be flipped immediately, or a third-party API endpoint moved - waiting for a PR review cycle is not always feasible. But in a Flux-managed cluster, manual ConfigMap changes are reverted on the next reconciliation cycle, making emergency configuration updates frustrating and unreliable.

The right approach depends on the type of configuration change: some configuration is stable and belongs in Git, some is dynamic and should be managed by a secrets manager or external system, and some is genuinely operational and needs a structured way to bypass GitOps temporarily. This guide covers all three patterns and gives you the tools to make the right choice for each situation.

## Prerequisites

- Flux CD v2 managing ConfigMaps in your cluster
- kubectl and Flux CLI installed
- Familiarity with Kustomize and ConfigMap generation

## Step 1: Understand When the Problem Occurs

Flux reverts ConfigMap changes because it owns the fields it declared in Git.

```bash
# Manual change to a ConfigMap managed by Flux
kubectl patch configmap my-service-config -n team-alpha \
  --type=merge \
  -p '{"data": {"FEATURE_FLAG_NEW_UI": "true"}}'

# Flux reconciles on its next interval and reverts it
flux reconcile kustomization my-service -n team-alpha

# The flag is back to "false" - the Git-declared value
kubectl get configmap my-service-config -n team-alpha \
  -o jsonpath='{.data.FEATURE_FLAG_NEW_UI}'
# false
```

## Step 2: Use Flux Suspension for Emergency ConfigMap Changes

For immediate emergency changes:

```bash
# Suspend Flux management of this service
flux suspend kustomization my-service -n team-alpha

# Make the ConfigMap change
kubectl patch configmap my-service-config -n team-alpha \
  --type=merge \
  -p '{"data": {"DATABASE_HOST": "new-db.example.com"}}'

# Restart the deployment to pick up the new config
kubectl rollout restart deployment/my-service -n team-alpha
kubectl rollout status deployment/my-service -n team-alpha

# Open a PR to update the Git source with the same change
# ... PR review and merge ...

# Resume Flux AFTER the PR is merged so it reconciles the correct state
flux resume kustomization my-service -n team-alpha
flux reconcile kustomization my-service -n team-alpha --with-source
```

## Step 3: Separate Static and Dynamic Configuration

The architectural fix is to separate configuration by mutability.

```yaml
# Static config: managed by Flux, declared in Git
# configmaps/static-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-service-static
  namespace: team-alpha
data:
  # Values that rarely change and go through PR review
  LOG_FORMAT: json
  METRICS_PORT: "9090"
  MAX_CONNECTIONS: "100"
```

```yaml
# Dynamic config: managed by External Secrets Operator or another system
# configmaps/dynamic-config.yaml - NOT in Flux-managed manifests
# This ConfigMap is created and updated by an operator, not by Flux
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-service-dynamic
  namespace: team-alpha
  annotations:
    # Tell Flux to ignore this ConfigMap if it appears
    kustomize.toolkit.fluxcd.io/reconcile: disabled
data:
  # Values that change frequently, managed outside GitOps
  FEATURE_FLAGS: '{"new_ui": false, "beta_api": false}'
  RATE_LIMIT_RPS: "1000"
```

## Step 4: Use Kustomize ConfigMap Generator for Hash-Based Updates

The Kustomize ConfigMap generator creates a new ConfigMap with a hash suffix every time the content changes, triggering automatic pod restarts.

```yaml
# deploy/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
configMapGenerator:
  - name: my-service-config
    # Kustomize reads this file and creates a ConfigMap
    # Any change to the file creates a new ConfigMap hash
    files:
      - config/app.properties
    options:
      disableNameSuffixHash: false   # Keep hash suffix for auto-restart
```

```properties
# deploy/config/app.properties
DATABASE_HOST=postgresql.team-alpha.svc.cluster.local
DATABASE_PORT=5432
LOG_LEVEL=info
FEATURE_FLAG_NEW_UI=false
```

When you change `app.properties` and commit, Kustomize generates a new ConfigMap name, the Deployment reference updates, and pods restart automatically.

## Step 5: Implement Dynamic Feature Flags with a Dedicated System

For feature flags and other high-frequency configuration changes, use a dedicated feature flag system that operates independently of GitOps.

```yaml
# infrastructure/feature-flags/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flagd
  namespace: feature-flags
spec:
  interval: 10m
  chart:
    spec:
      chart: open-feature-operator
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: open-feature
        namespace: flux-system
```

Configure the Deployment to use the feature flag sidecar instead of ConfigMap-based flags:

```yaml
# deploy/deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: my-service
          env:
            # Read feature flags from flagd sidecar, not ConfigMap
            - name: FLAGD_HOST
              value: "localhost"
            - name: FLAGD_PORT
              value: "8013"
        # Feature flag sidecar
        - name: flagd
          image: ghcr.io/open-feature/flagd:latest
          args:
            - start
            - --uri
            - file:/etc/flagd/flags.json
```

## Step 6: Annotate ConfigMaps to Preserve Manual Changes

For ConfigMaps where you genuinely need to preserve manual changes across Flux reconciliations:

```yaml
# deploy/my-service-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-service-config
  namespace: team-alpha
  annotations:
    # Use Flux's IfNotPresent strategy - only creates, never overwrites
    kustomize.toolkit.fluxcd.io/ssa: IfNotPresent
data:
  DATABASE_HOST: postgresql.team-alpha.svc.cluster.local
  LOG_LEVEL: info
```

The `IfNotPresent` annotation tells Flux to create the ConfigMap if it doesn't exist but never overwrite it if it does. This allows manual updates to persist across reconciliations but means Git changes to the ConfigMap are also never applied - use this carefully.

## Best Practices

- Always prefer making ConfigMap changes through Git - it is slower but provides an audit trail and review process
- For emergency changes: suspend, change, open PR immediately, merge, then resume Flux
- Use Kustomize ConfigMap generators for configs that should trigger pod restarts when changed in Git
- Move feature flags to a dedicated feature flag system (OpenFeature, LaunchDarkly) to keep them out of GitOps entirely
- Use External Secrets Operator for sensitive configuration (passwords, API keys) that must change without Git commits
- Never leave Flux suspended after an emergency ConfigMap change - always follow up with a Git PR within the same working day

## Conclusion

Manual ConfigMap changes in Flux-managed clusters require a deliberate strategy based on the type of configuration. Static, rarely-changing configuration belongs in Git. Dynamic configuration that needs frequent, immediate updates belongs in a dedicated system like a feature flag service or a secrets manager. Emergency changes should use the structured suspension workflow with an immediate PR to bring Git back in sync. The discipline of always following emergency changes with a Git PR is what keeps your GitOps model meaningful.

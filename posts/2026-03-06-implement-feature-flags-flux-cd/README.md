# How to Implement Feature Flags with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Feature Flags, GitOps, ConfigMap, Progressive Delivery

Description: A practical guide to implementing feature flags in Kubernetes applications using Flux CD, ConfigMaps, and GitOps workflows.

---

## Introduction

Feature flags allow you to enable or disable functionality without deploying new code. Combined with Flux CD and GitOps, feature flags become auditable, version-controlled, and consistently applied across environments. A simple Git commit can toggle features across your entire fleet.

This guide covers multiple approaches to implementing feature flags with Flux CD, from simple ConfigMap-based flags to more sophisticated solutions.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  production/
    feature-flags.yaml
  staging/
    feature-flags.yaml
apps/
  feature-flags/
    base/
      kustomization.yaml
      configmap.yaml
    overlays/
      production/
        kustomization.yaml
      staging/
        kustomization.yaml
  myapp/
    deployment.yaml
```

## Approach 1: ConfigMap-Based Feature Flags

The simplest approach uses ConfigMaps to store feature flag values:

```yaml
# apps/feature-flags/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: myapp
  labels:
    app.kubernetes.io/managed-by: flux
    app.kubernetes.io/component: feature-flags
data:
  # Feature flags as JSON for easy parsing
  flags.json: |
    {
      "new_dashboard": {
        "enabled": false,
        "description": "New dashboard UI redesign",
        "rollout_percentage": 0
      },
      "dark_mode": {
        "enabled": true,
        "description": "Dark mode theme support",
        "rollout_percentage": 100
      },
      "advanced_search": {
        "enabled": false,
        "description": "AI-powered search functionality",
        "rollout_percentage": 0,
        "allowed_users": ["admin", "beta-tester"]
      },
      "new_payment_flow": {
        "enabled": false,
        "description": "Redesigned checkout experience",
        "rollout_percentage": 0
      },
      "api_v2": {
        "enabled": true,
        "description": "Version 2 of the public API",
        "rollout_percentage": 100
      },
      "rate_limiting": {
        "enabled": true,
        "description": "API rate limiting",
        "config": {
          "requests_per_minute": 60,
          "burst": 10
        }
      }
    }
```

## Using Kustomize configMapGenerator

Generate ConfigMaps with hash suffixes so flag changes trigger pod restarts:

```yaml
# apps/feature-flags/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
  - name: feature-flags
    namespace: myapp
    files:
      - flags.json=flags/flags.json
    # Individual flags as simple key-value pairs
    literals:
      - FEATURE_NEW_DASHBOARD=false
      - FEATURE_DARK_MODE=true
      - FEATURE_ADVANCED_SEARCH=false
      - FEATURE_NEW_PAYMENT_FLOW=false
      - FEATURE_API_V2=true
      - FEATURE_RATE_LIMITING=true
```

## Environment-Specific Feature Flags

### Production Flags

```yaml
# apps/feature-flags/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

configMapGenerator:
  - name: feature-flags
    namespace: myapp
    behavior: merge
    files:
      - flags.json=flags/flags-production.json
    literals:
      # Production: only fully tested features enabled
      - FEATURE_NEW_DASHBOARD=false
      - FEATURE_DARK_MODE=true
      - FEATURE_ADVANCED_SEARCH=false
      - FEATURE_NEW_PAYMENT_FLOW=false
      - FEATURE_API_V2=true
      - FEATURE_RATE_LIMITING=true
```

```json
// apps/feature-flags/overlays/production/flags/flags-production.json
{
  "new_dashboard": {
    "enabled": false,
    "description": "New dashboard UI redesign",
    "rollout_percentage": 0
  },
  "dark_mode": {
    "enabled": true,
    "description": "Dark mode theme support",
    "rollout_percentage": 100
  },
  "advanced_search": {
    "enabled": false,
    "description": "AI-powered search functionality",
    "rollout_percentage": 0
  },
  "new_payment_flow": {
    "enabled": false,
    "description": "Redesigned checkout experience",
    "rollout_percentage": 0
  },
  "api_v2": {
    "enabled": true,
    "rollout_percentage": 100
  },
  "rate_limiting": {
    "enabled": true,
    "config": {
      "requests_per_minute": 60,
      "burst": 10
    }
  }
}
```

### Staging Flags

```yaml
# apps/feature-flags/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

configMapGenerator:
  - name: feature-flags
    namespace: myapp
    behavior: merge
    files:
      - flags.json=flags/flags-staging.json
    literals:
      # Staging: enable features for testing
      - FEATURE_NEW_DASHBOARD=true
      - FEATURE_DARK_MODE=true
      - FEATURE_ADVANCED_SEARCH=true
      - FEATURE_NEW_PAYMENT_FLOW=true
      - FEATURE_API_V2=true
      - FEATURE_RATE_LIMITING=true
```

## Consuming Feature Flags in Deployments

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v2.0.0
          ports:
            - containerPort: 8080
          # Load feature flags as environment variables
          envFrom:
            - configMapRef:
                name: feature-flags
                # Optional: prefix all keys
                prefix: ""
          # Mount the JSON flags file
          volumeMounts:
            - name: feature-flags
              mountPath: /etc/feature-flags
              readOnly: true
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
      volumes:
        - name: feature-flags
          configMap:
            name: feature-flags
            items:
              - key: flags.json
                path: flags.json
```

## Approach 2: Flux Variable Substitution for Feature Flags

Use Flux post-build substitution for more dynamic flag management:

```yaml
# clusters/production/feature-flags.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flag-vars
  namespace: flux-system
data:
  # These variables are substituted into manifests at reconciliation time
  FEATURE_NEW_DASHBOARD: "false"
  FEATURE_DARK_MODE: "true"
  FEATURE_ADVANCED_SEARCH: "false"
  FEATURE_NEW_PAYMENT_FLOW: "false"
  FEATURE_API_V2: "true"
  FEATURE_RATE_LIMITING: "true"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp
  prune: true
  # Substitute feature flag variables into the manifests
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: feature-flag-vars
```

```yaml
# apps/myapp/configmap.yaml (with variable placeholders)
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-feature-flags
  namespace: myapp
data:
  FEATURE_NEW_DASHBOARD: "${FEATURE_NEW_DASHBOARD:=false}"
  FEATURE_DARK_MODE: "${FEATURE_DARK_MODE:=false}"
  FEATURE_ADVANCED_SEARCH: "${FEATURE_ADVANCED_SEARCH:=false}"
  FEATURE_NEW_PAYMENT_FLOW: "${FEATURE_NEW_PAYMENT_FLOW:=false}"
  FEATURE_API_V2: "${FEATURE_API_V2:=false}"
  FEATURE_RATE_LIMITING: "${FEATURE_RATE_LIMITING:=false}"
```

## Approach 3: Dedicated Feature Flag Service

Deploy a lightweight feature flag service managed by Flux:

```yaml
# apps/feature-flag-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-flag-service
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: feature-flag-service
  template:
    metadata:
      labels:
        app: feature-flag-service
    spec:
      containers:
        - name: service
          image: myregistry.io/feature-flag-service:v1.0.0
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: flags
              mountPath: /etc/flags
              readOnly: true
          # Liveness check ensures the flag service is responsive
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          # Readiness check ensures flags are loaded
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
      volumes:
        - name: flags
          configMap:
            name: feature-flags
---
apiVersion: v1
kind: Service
metadata:
  name: feature-flag-service
  namespace: myapp
spec:
  selector:
    app: feature-flag-service
  ports:
    - port: 80
      targetPort: 8080
```

## Gradual Feature Rollout Workflow

Use Git commits to progressively roll out a feature:

```yaml
# Step 1: Enable for internal users (commit 1)
# apps/feature-flags/overlays/production/flags/flags-production.json
{
  "new_dashboard": {
    "enabled": true,
    "rollout_percentage": 0,
    "allowed_users": ["internal-team"]
  }
}
```

```yaml
# Step 2: Enable for 10% of users (commit 2)
{
  "new_dashboard": {
    "enabled": true,
    "rollout_percentage": 10,
    "allowed_users": ["internal-team"]
  }
}
```

```yaml
# Step 3: Enable for 50% of users (commit 3)
{
  "new_dashboard": {
    "enabled": true,
    "rollout_percentage": 50
  }
}
```

```yaml
# Step 4: Enable for all users (commit 4)
{
  "new_dashboard": {
    "enabled": true,
    "rollout_percentage": 100
  }
}
```

## Monitoring Feature Flag Changes

Track feature flag changes with Flux notifications:

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: feature-flags
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: feature-flag-changes
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: feature-flags
  summary: "Feature flag configuration updated"
```

## Audit Trail

Since all feature flag changes go through Git, you have a complete audit trail:

```bash
# View the history of feature flag changes
git log --oneline --follow apps/feature-flags/overlays/production/flags/flags-production.json

# See who changed a specific flag and when
git log -p --follow apps/feature-flags/overlays/production/flags/flags-production.json
```

## Summary

Implementing feature flags with Flux CD provides a controlled, auditable way to manage feature rollouts:

- Use ConfigMaps with Kustomize configMapGenerator for automatic pod restarts on flag changes
- Leverage Kustomize overlays for environment-specific flag configurations
- Use Flux post-build variable substitution for dynamic flag injection
- Implement gradual rollouts by progressively updating flag values through Git commits
- Maintain a complete audit trail of all flag changes in Git history
- Set up Flux notifications to alert your team when flags change
- Use percentage-based rollouts for controlled progressive delivery

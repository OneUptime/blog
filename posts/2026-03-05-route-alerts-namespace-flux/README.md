# How to Route Alerts to Different Channels Based on Namespace in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Namespace Routing

Description: Learn how to route Flux alerts to different notification channels based on the namespace of the event source resources.

---

In multi-tenant or multi-environment Kubernetes clusters, different namespaces represent different applications, teams, or environments. Routing Flux alerts to different notification channels based on namespace ensures that each team receives only the notifications relevant to them. This guide shows how to configure namespace-based alert routing in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- Multiple namespaces with Flux resources (Kustomizations, HelmReleases, etc.)
- Multiple notification providers or channels configured

## How Namespace-Based Routing Works

Flux alerts use the `spec.eventSources` field to specify which resources to watch. Each event source entry includes a `namespace` field that determines which namespace the alert monitors. By creating separate Alert resources with different event source namespaces and different provider references, you route notifications from each namespace to a specific channel.

## Step 1: Create Namespace-Specific Providers

Create separate providers for each namespace or team channel.

```yaml
# Provider for development team notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-dev-team
  namespace: flux-system
spec:
  type: slack
  channel: dev-deployments
  secretRef:
    name: slack-webhook
---
# Provider for staging notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-staging-team
  namespace: flux-system
spec:
  type: slack
  channel: staging-deployments
  secretRef:
    name: slack-webhook
---
# Provider for production notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-production-team
  namespace: flux-system
spec:
  type: slack
  channel: production-critical
  secretRef:
    name: slack-webhook
```

Apply the providers.

```bash
# Apply all namespace-specific providers
kubectl apply -f namespace-providers.yaml
```

## Step 2: Create Namespace-Specific Alerts

Create separate alerts for each namespace, routing to the appropriate provider.

```yaml
# Alert for development namespace
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: dev-namespace-alert
  namespace: flux-system
spec:
  summary: "[Development]"
  providerRef:
    name: slack-dev-team
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: development
    - kind: HelmRelease
      name: "*"
      namespace: development
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*is not ready$"
---
# Alert for staging namespace
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-namespace-alert
  namespace: flux-system
spec:
  summary: "[Staging]"
  providerRef:
    name: slack-staging-team
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: staging
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*is not ready$"
---
# Alert for production namespace
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-namespace-alert
  namespace: flux-system
spec:
  summary: "[Production]"
  providerRef:
    name: slack-production-team
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

Apply the alerts.

```bash
# Apply namespace-specific alerts
kubectl apply -f namespace-alerts.yaml

# Verify the configuration
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,PROVIDER:.spec.providerRef.name,SEVERITY:.spec.eventSeverity
```

## Step 3: Team-Based Namespace Routing

In multi-tenant clusters, route alerts from team-owned namespaces to team-specific channels.

```yaml
# Alert for Team Alpha's namespaces
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-alert
  namespace: flux-system
spec:
  summary: "[Team Alpha]"
  providerRef:
    name: slack-team-alpha
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-alpha-dev
    - kind: Kustomization
      name: "*"
      namespace: team-alpha-staging
    - kind: Kustomization
      name: "*"
      namespace: team-alpha-prod
    - kind: HelmRelease
      name: "*"
      namespace: team-alpha-dev
    - kind: HelmRelease
      name: "*"
      namespace: team-alpha-staging
    - kind: HelmRelease
      name: "*"
      namespace: team-alpha-prod
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Alert for Team Beta's namespaces
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-beta-alert
  namespace: flux-system
spec:
  summary: "[Team Beta]"
  providerRef:
    name: slack-team-beta
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-beta-dev
    - kind: Kustomization
      name: "*"
      namespace: team-beta-staging
    - kind: Kustomization
      name: "*"
      namespace: team-beta-prod
    - kind: HelmRelease
      name: "*"
      namespace: team-beta-dev
    - kind: HelmRelease
      name: "*"
      namespace: team-beta-staging
    - kind: HelmRelease
      name: "*"
      namespace: team-beta-prod
  exclusionList:
    - "^Reconciliation finished.*no changes$"
```

## Step 4: Infrastructure vs Application Namespace Routing

Separate infrastructure alerts from application alerts using namespace-based routing.

```yaml
# Infrastructure namespace alert
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: infra-namespace-alert
  namespace: flux-system
spec:
  summary: "[Infrastructure]"
  providerRef:
    name: slack-platform-team
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: Kustomization
      name: "*"
      namespace: cert-manager
    - kind: Kustomization
      name: "*"
      namespace: ingress-nginx
    - kind: Kustomization
      name: "*"
      namespace: monitoring
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Application namespace alert
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: apps-namespace-alert
  namespace: flux-system
spec:
  summary: "[Applications]"
  providerRef:
    name: slack-app-team
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: apps
    - kind: HelmRelease
      name: "*"
      namespace: microservices
    - kind: Kustomization
      name: "*"
      namespace: apps
  exclusionList:
    - "^Reconciliation finished.*no changes$"
```

## Step 5: Verify Namespace Routing

Test that alerts are routed to the correct channels.

```bash
# List all alerts with their configuration
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUMMARY:.spec.summary,PROVIDER:.spec.providerRef.name

# Trigger reconciliation in a specific namespace
flux reconcile kustomization apps --with-source

# Check notification controller logs for delivery
kubectl logs -n flux-system deploy/notification-controller --tail=20

# Verify event sources in the alert
kubectl get alert production-namespace-alert -n flux-system -o jsonpath='{.spec.eventSources}' | jq .
```

## Best Practices

1. **Use the summary field** to clearly identify the namespace or environment in notifications
2. **Match severity to environment** - use info for dev/staging and error for production
3. **Group related namespaces** in a single alert when they belong to the same team
4. **Include both Kustomization and HelmRelease** sources for complete coverage
5. **Use exclusion rules consistently** across namespace alerts to reduce noise
6. **Document your routing strategy** so team members know where to find their notifications

## Summary

Namespace-based alert routing in Flux is achieved by creating separate Alert resources with different event source namespaces and provider references. This approach ensures that each team, environment, or application area receives notifications in the appropriate channel. Combine namespace routing with severity filters and exclusion rules for a well-organized notification strategy that scales with your cluster.

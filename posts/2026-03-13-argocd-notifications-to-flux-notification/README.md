# How to Map ArgoCD Notifications to Flux Notification Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Notifications, Migration, GitOps, Slack, PagerDuty, Kubernetes

Description: Learn how to migrate ArgoCD notification configurations to Flux Notification Controller for deployment alerting during and after migration.

---

## Introduction

ArgoCD Notifications uses a ConfigMap-based system with triggers, templates, and subscription annotations. Flux Notification Controller uses CRD-based Provider and Alert resources. Both achieve the same goal-alerting teams about deployment events-but the configuration model and filtering capabilities differ.

This guide walks through converting common ArgoCD notification configurations to Flux equivalents.

## Prerequisites

- ArgoCD Notifications configured on your cluster
- Flux CD with Notification Controller bootstrapped
- Slack webhook URLs or other notification provider credentials

## Step 1: Export ArgoCD Notification Configuration

```bash
# Export existing notification config
kubectl get configmap argocd-notifications-cm -n argocd -o yaml > argocd-notifications-backup.yaml

# Export notification secrets
kubectl get secret argocd-notifications-secret -n argocd -o yaml > argocd-notifications-secrets-backup.yaml

# List all Applications with notification annotations
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.metadata.annotations}{"\n"}{end}' \
  | grep "notifications.argoproj.io"
```

## Step 2: Map ArgoCD Triggers to Flux Alert eventSeverity

```plaintext
ArgoCD Trigger                    Flux Alert
─────────────────────             ─────────────────────────
on-deployed (success)   ──►       eventSeverity: info
                                  inclusionList: [".*succeeded.*"]

on-sync-failed          ──►       eventSeverity: error
                                  inclusionList: [".*failed.*"]

on-health-degraded      ──►       eventSeverity: error
                                  inclusionList: [".*Health check failed.*"]

on-sync-running         ──►       eventSeverity: info
                                  inclusionList: [".*Reconciliation in progress.*"]
```

## Step 3: Convert Slack Notification

**ArgoCD Configuration**:

```yaml
# argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
  template.app-deployed: |
    message: Application {{.app.metadata.name}} synced to {{.app.status.sync.revision}}
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
```

**Flux Equivalent**:

```yaml
# clusters/production/notifications/slack.yaml

# Create the secret first
# kubectl create secret generic slack-url \
#   --from-literal=address=https://hooks.slack.com/services/xxx \
#   --namespace=flux-system

apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: '#deployments'
  secretRef:
    name: slack-url
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: deployment-success
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
  inclusionList:
    - ".*succeeded.*"
  summary: "Deployment succeeded"
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: deployment-failure
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: GitRepository
      name: '*'
  inclusionList:
    - ".*failed.*"
    - ".*error.*"
  summary: "Deployment FAILED"
```

## Step 4: Convert PagerDuty Notification

**ArgoCD Configuration**:

```yaml
data:
  service.pagerduty: |
    token: $pagerduty-token
  template.app-health-degraded: |
    pagerduty:
      summary: "Application {{.app.metadata.name}} is degraded"
      severity: critical
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded]
```

**Flux Equivalent**:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: pagerduty
  namespace: flux-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-key
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: critical-failures
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: 'production-*'
  inclusionList:
    - ".*failed.*"
  summary: "CRITICAL: Production deployment failure"
```

## Step 5: Convert GitHub Commit Status Notifications

**ArgoCD**: Uses the `github` service type with commit status updates.

**Flux**:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/your-org/fleet-repo
  secretRef:
    name: github-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: github-commit-status
  namespace: flux-system
spec:
  providerRef:
    name: github-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
  summary: "Flux reconciliation status"
```

## Step 6: Verify Notification Delivery

```bash
# Trigger a reconciliation to test notifications
flux reconcile kustomization myapp -n flux-system --with-source

# Check Provider status
flux get providers -n flux-system

# Check Alert status
flux get alerts -n flux-system

# View notification controller logs
kubectl logs -n flux-system deployment/notification-controller --tail=50

# View events for specific Alert
kubectl describe alert deployment-success -n flux-system
```

## Best Practices

- Create notification resources as part of the fleet repository migration, committed alongside the application Kustomizations.
- Use distinct Alerts for success and failure events; separate providers allow different routing per severity.
- Test each notification provider independently using `flux reconcile` to trigger a known event before relying on it for production alerts.
- During the migration overlap period, keep both ArgoCD notifications and Flux notifications active so no alerts are missed.
- Disable ArgoCD notifications for an application only after Flux notifications have been verified for that application.

## Conclusion

Migrating from ArgoCD Notifications to Flux Notification Controller is straightforward: the conceptual mapping between triggers/templates and Alert/Provider is direct. The main operational difference is that Flux's event model is simpler-severity and inclusion patterns replace ArgoCD's Lua-like trigger conditions. For complex custom message templates, Flux is less flexible, but for standard operational alerting, both systems are functionally equivalent.

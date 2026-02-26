# How to Subscribe Applications to Notification Channels in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, DevOps

Description: Learn how to subscribe individual ArgoCD applications to specific notification channels using annotations, enabling per-application alerting to Slack, email, PagerDuty, and other services.

---

ArgoCD notifications use a subscription model where applications opt into notification channels. Rather than configuring a central list of which applications send where, you annotate each Application resource with the channels it should notify. This gives teams fine-grained control over their own alerting without needing cluster-admin permissions. Here is how to set it up properly.

## How Subscriptions Work

The subscription model in ArgoCD notifications has three components:

1. **Triggers** - defined in `argocd-notifications-cm`, they specify when to send a notification
2. **Services** - configured in `argocd-notifications-cm`, they define how to send (Slack, email, webhook, etc.)
3. **Subscriptions** - annotations on Application resources that connect triggers to services

The annotation format follows this pattern:

```
notifications.argoproj.io/subscribe.<trigger-name>.<service-name>: <recipient>
```

## Basic Subscription Examples

### Subscribing to Slack

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-app
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-critical
```

The value `deployments` and `alerts-critical` are Slack channel names (without the `#` prefix).

### Subscribing to Email

```yaml
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.email: oncall@company.com
```

### Subscribing to Multiple Channels

You can send the same trigger to multiple channels by separating them with semicolons:

```yaml
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-critical;team-backend
```

This sends failure notifications to both `#alerts-critical` and `#team-backend` channels.

### Subscribing to Multiple Services

An application can send notifications through multiple services for the same trigger:

```yaml
  annotations:
    # Same trigger, different services
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-critical
    notifications.argoproj.io/subscribe.on-sync-failed.email: oncall@company.com
    notifications.argoproj.io/subscribe.on-sync-failed.pagerduty: ""
    notifications.argoproj.io/subscribe.on-sync-failed.webhook.deployment-tracker: ""
```

For services like PagerDuty and webhooks that do not need a recipient (the destination is configured in the service definition), use an empty string.

## Subscribing Declaratively in Application YAML

When you manage ArgoCD applications declaratively through Git, add subscriptions directly to the Application manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
  annotations:
    # Deployment lifecycle
    notifications.argoproj.io/subscribe.on-sync-running.slack: deployments
    notifications.argoproj.io/subscribe.on-deployed.slack: deployments
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: alerts-critical
    notifications.argoproj.io/subscribe.on-deploy-failed.pagerduty: ""
    # Health monitoring
    notifications.argoproj.io/subscribe.on-health-degraded.slack: alerts-critical
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: ""
    notifications.argoproj.io/subscribe.on-health-healthy.slack: deployments
spec:
  project: production
  source:
    repoURL: https://github.com/company/k8s-manifests.git
    targetRevision: main
    path: services/payment
  destination:
    server: https://kubernetes.default.svc
    namespace: payment
```

## Adding Subscriptions via CLI

If you need to add a subscription to an existing application without editing the YAML:

```bash
# Add a Slack subscription
kubectl annotate application frontend-app \
  -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack=alerts-critical

# Add an email subscription
kubectl annotate application frontend-app \
  -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.email=team@company.com

# Overwrite an existing subscription
kubectl annotate application frontend-app \
  -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack=new-channel \
  --overwrite
```

## Adding Subscriptions via ArgoCD UI

You can also add subscription annotations through the ArgoCD web UI:

1. Navigate to the Application
2. Click the three dots menu and select "Edit"
3. Switch to the YAML editor
4. Add the subscription annotation under `metadata.annotations`
5. Save

However, if you manage applications declaratively, UI changes will be overwritten on the next sync. Stick to Git-based configuration for consistency.

## Subscription Patterns for Common Scenarios

### Per-Team Channel Routing

Each team gets notifications for their own applications:

```yaml
# Backend team's app
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-gateway
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: team-backend-deploys
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: team-backend-alerts

---
# Frontend team's app
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-dashboard
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: team-frontend-deploys
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: team-frontend-alerts
```

### Tiered Alerting by Criticality

Critical services get PagerDuty integration, lower-priority services just get Slack:

```yaml
# Critical service
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: checkout-service
  labels:
    criticality: high
  annotations:
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: alerts-critical
    notifications.argoproj.io/subscribe.on-deploy-failed.pagerduty: ""
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: ""

---
# Non-critical service
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: analytics-dashboard
  labels:
    criticality: low
  annotations:
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: deployments
```

### Environment-Based Routing

Same application in different environments with different notification targets:

```yaml
# Production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-prod
  annotations:
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: prod-alerts
    notifications.argoproj.io/subscribe.on-deploy-failed.pagerduty: ""

---
# Staging
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-staging
  annotations:
    notifications.argoproj.io/subscribe.on-deploy-failed.slack: staging-deploys
```

## Using Default Triggers

ArgoCD supports a `defaultTriggers` configuration that automatically subscribes all applications to specified triggers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  defaultTriggers: |
    - on-sync-failed
    - on-health-degraded
```

With default triggers, every application that has any service subscription annotation will receive these triggers. This is useful for ensuring no application misses critical failure alerts.

An application can then subscribe with just the service:

```yaml
  annotations:
    notifications.argoproj.io/subscribe.slack: alerts
```

Without specifying a trigger name, the default triggers apply.

## Verifying Subscriptions

Check which subscriptions an application has:

```bash
# View all annotations on an application
kubectl get application my-app -n argocd -o jsonpath='{.metadata.annotations}' | jq

# Filter for notification annotations
kubectl get application my-app -n argocd -o json | \
  jq '.metadata.annotations | to_entries[] | select(.key | startswith("notifications"))'
```

## Troubleshooting Subscriptions

If notifications are not arriving, check these common issues:

**Missing trigger definition**: The trigger name in the annotation must match a trigger defined in `argocd-notifications-cm`. A typo means silent failure.

```bash
# List all defined triggers
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data | keys[] | select(startswith("trigger."))'
```

**Missing service configuration**: The service name in the annotation must have a corresponding service configured:

```bash
# List all defined services
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data | keys[] | select(startswith("service."))'
```

**Secret not found**: Service credentials are stored in `argocd-notifications-secret`. Missing tokens cause silent delivery failures:

```bash
# Verify secret exists
kubectl get secret argocd-notifications-secret -n argocd
```

**Controller not running**: The notifications controller pod must be running to process subscriptions:

```bash
kubectl get pods -n argocd -l app.kubernetes.io/component=notifications-controller
```

Application subscriptions are the glue between your trigger definitions and your notification services. For related configuration, see how to [subscribe entire projects to notification channels](https://oneuptime.com/blog/post/2026-02-26-argocd-subscribe-projects-notifications/view) and how to [use annotation-based subscriptions at scale](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-subscriptions-annotations/view).

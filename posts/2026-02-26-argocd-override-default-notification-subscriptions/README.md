# How to Override Default Notification Subscriptions in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications

Description: Learn strategies to override and customize ArgoCD default notification subscriptions for specific applications, including conditional routing, trigger filtering, and template customization.

---

Default notification subscriptions in ArgoCD provide a convenient baseline, but there are always applications that need different notification behavior. Maybe your canary deployment app generates too many sync events for the global channel. Maybe a batch processing application does not need health alerts because its pods are expected to terminate. This guide covers strategies to override, suppress, or customize default notification subscriptions for specific applications.

## The Override Challenge

ArgoCD Notifications does not have a built-in "opt-out" mechanism for default subscriptions. Default subscriptions defined in `argocd-notifications-cm` apply to all matching applications, and annotation-based subscriptions are additive. This means you cannot simply add an annotation to say "do not send to the default channel."

To work around this, you need to design your notification architecture with overrides in mind from the start. There are several strategies to achieve this.

## Strategy 1: Selector-Based Exclusion

The most straightforward approach is to use label selectors on default subscriptions that exclude certain applications:

```yaml
# argocd-notifications-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  subscriptions: |
    # Only notify applications that have NOT opted out
    - recipients:
        - slack:global-deployments
      triggers:
        - on-sync-succeeded
        - on-sync-failed
      selector: notifications-global!=disabled

    # Critical alerts - harder to opt out (requires explicit label)
    - recipients:
        - slack:critical-alerts
      triggers:
        - on-sync-failed
        - on-health-degraded
      selector: environment=production,notifications-critical!=disabled
```

Applications that need to opt out add the exclusion label:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: batch-processor
  namespace: argocd
  labels:
    environment: production
    # Opt out of global deployment notifications
    notifications-global: disabled
    # Still receive critical alerts (no critical opt-out label)
spec:
  # ...
```

This pattern gives applications control over which default subscriptions they receive:

```yaml
# Application that opts out of everything
labels:
  notifications-global: disabled
  notifications-critical: disabled

# Application that only opts out of non-critical
labels:
  notifications-global: disabled

# Application that receives all defaults (no opt-out labels)
labels:
  environment: production
```

## Strategy 2: Trigger-Level Override with Custom Triggers

Create custom triggers that add conditions to suppress notifications for specific applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Standard trigger - fires for all apps
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [sync-failed-template]

  # Smart trigger - skips noisy apps
  trigger.on-sync-failed-filtered: |
    - when: >
        app.status.operationState.phase in ['Error', 'Failed'] and
        app.metadata.labels['noise-level'] != 'high'
      send: [sync-failed-template]

  # Use the filtered trigger in default subscriptions
  subscriptions: |
    - recipients:
        - slack:global-alerts
      triggers:
        - on-sync-failed-filtered
```

You can include application metadata in trigger conditions:

```yaml
data:
  # Only fire for production apps
  trigger.on-sync-failed-prod: |
    - when: >
        app.status.operationState.phase in ['Error', 'Failed'] and
        app.spec.destination.namespace != 'staging' and
        app.spec.destination.namespace != 'dev'
      send: [sync-failed-template]

  # Only fire during business hours (using oncall label)
  trigger.on-sync-failed-business: |
    - when: >
        app.status.operationState.phase in ['Error', 'Failed'] and
        app.metadata.labels['alert-schedule'] == 'business-hours'
      send: [sync-failed-business-template]
```

## Strategy 3: Template-Level Routing

Use conditional logic in notification templates to route messages differently based on application attributes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.smart-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed in {{.app.spec.destination.namespace}}
    slack:
      # Dynamic channel based on application label
      {{- if eq (index .app.metadata.labels "team") "payments" }}
      channel: payments-alerts
      {{- else if eq (index .app.metadata.labels "team") "platform" }}
      channel: platform-alerts
      {{- else }}
      channel: general-alerts
      {{- end }}
      attachments: |
        [{
          "color": "#E96D76",
          "title": "{{.app.metadata.name}} Sync Failed",
          "text": "{{.app.status.operationState.message}}"
        }]
```

However, note that channel routing in templates has limitations. Not all notification services support dynamic routing within templates. For Slack, this approach works well.

## Strategy 4: Multiple Notification Controller Instances

For large organizations with complex notification requirements, run multiple notification controller instances with different configurations:

```yaml
# Controller 1: Handles production notifications
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-notifications-controller-prod
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: notifications-controller
          args:
            - /usr/local/bin/argocd-notifications
            - --config-map=argocd-notifications-cm-prod
            - --secret=argocd-notifications-secret-prod
            - --application-label-selector=environment=production

---
# Controller 2: Handles staging notifications
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-notifications-controller-staging
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: notifications-controller
          args:
            - /usr/local/bin/argocd-notifications
            - --config-map=argocd-notifications-cm-staging
            - --secret=argocd-notifications-secret-staging
            - --application-label-selector=environment=staging
```

Each controller instance has its own ConfigMap with its own default subscriptions, triggers, and templates. The `--application-label-selector` flag ensures each controller only processes relevant applications.

## Strategy 5: Per-Application Trigger Override

Override which triggers an application responds to using annotations that specify custom trigger behavior:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: canary-app
  namespace: argocd
  annotations:
    # Subscribe to a custom filtered trigger instead of the default
    notifications.argoproj.io/subscribe.on-sync-failed-only-final.slack: canary-alerts
spec:
  # ...
```

With a corresponding trigger that only fires on the final sync attempt:

```yaml
trigger.on-sync-failed-only-final: |
  - when: >
      app.status.operationState.phase in ['Error', 'Failed'] and
      app.status.operationState.retryCount >= app.status.operationState.syncResult.retryLimit
    send: [sync-failed-final-template]
```

## Practical Example: Complete Override Architecture

Here is a complete configuration that supports overrides at every level:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Services
  service.slack: |
    token: $slack-token

  service.email: |
    host: smtp.company.com
    port: 587
    from: argocd@company.com
    username: $email-user
    password: $email-pass

  # Triggers with built-in filtering
  trigger.on-sync-failed-global: |
    - when: >
        app.status.operationState.phase in ['Error', 'Failed'] and
        app.metadata.labels['notifications-global'] != 'disabled'
      send: [sync-failed-global]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [sync-failed-team]

  trigger.on-health-degraded-global: |
    - when: >
        app.status.health.status == 'Degraded' and
        app.metadata.labels['notifications-global'] != 'disabled'
      send: [health-degraded-global]

  # Templates
  template.sync-failed-global: |
    message: "[GLOBAL] {{.app.metadata.name}} sync failed"
    slack:
      attachments: |
        [{"color":"#E96D76","title":"{{.app.metadata.name}} Sync Failed"}]

  template.sync-failed-team: |
    message: "[TEAM] {{.app.metadata.name}} sync failed"
    slack:
      attachments: |
        [{"color":"#E96D76","title":"{{.app.metadata.name}} Sync Failed","text":"{{.app.status.operationState.message}}"}]

  template.health-degraded-global: |
    message: "[GLOBAL] {{.app.metadata.name}} health degraded"

  # Default subscriptions using filtered triggers
  subscriptions: |
    - recipients:
        - slack:global-deployments
      triggers:
        - on-sync-failed-global
        - on-health-degraded-global
      selector: environment=production
```

Applications can then:

```yaml
# Full participation in defaults
labels:
  environment: production

# Opt out of global notifications, use team-specific only
labels:
  environment: production
  notifications-global: disabled
annotations:
  notifications.argoproj.io/subscribe.on-sync-failed.slack: my-team-alerts
```

## Best Practices

1. **Design for overrides from day one** - retrofit override capability is much harder than building it in.
2. **Use label-based opt-out** as the primary override mechanism - it is visible and auditable.
3. **Keep the global subscription minimal** - only truly universal events should be global.
4. **Document your override labels** so teams know how to customize their notification behavior.
5. **Avoid complex trigger conditions** - they become hard to debug when notifications go missing.
6. **Monitor notification delivery** - silent failures in overridden subscriptions are easy to miss.

For more on default subscriptions, see [How to Configure Default Subscriptions](https://oneuptime.com/blog/post/2026-02-26-argocd-configure-default-subscriptions/view). For annotation-based subscriptions, see [How to Subscribe to Notifications via Annotations](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-subscriptions-annotations/view).

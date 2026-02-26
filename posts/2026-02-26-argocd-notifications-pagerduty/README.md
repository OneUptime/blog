# How to Send ArgoCD Notifications to PagerDuty

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, PagerDuty, Incident Management

Description: Learn how to configure ArgoCD notifications to create PagerDuty incidents on deployment failures and health degradation for automated incident response.

---

When an ArgoCD deployment fails in production at 2 AM, you need someone to know about it immediately. PagerDuty integration lets ArgoCD automatically create incidents, page on-call engineers, and provide enough context for them to start debugging without logging into the ArgoCD UI first. This guide covers the full setup from PagerDuty service creation to ArgoCD trigger configuration.

## Creating a PagerDuty Integration

You need a PagerDuty integration key for ArgoCD to create incidents.

1. Log into PagerDuty
2. Go to Services and either create a new service or select an existing one
3. Click the "Integrations" tab
4. Click "Add an integration"
5. Search for "Events API v2" and select it
6. Click "Add"
7. Copy the "Integration Key" (a 32-character hex string)

This integration key is what ArgoCD uses to send events to PagerDuty.

## Configuring ArgoCD for PagerDuty

Store the integration key in the ArgoCD notifications secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"pagerduty-integration-key": "your-32-char-integration-key"}}'
```

Configure the PagerDuty service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.pagerduty: |
    token: $pagerduty-integration-key
    # Optional: use a specific PagerDuty API URL (default is events API v2)
```

## Creating PagerDuty Notification Templates

### Trigger an Incident on Sync Failure

```yaml
  template.pagerduty-sync-failed: |
    pagerduty:
      # "trigger" creates a new incident, "resolve" resolves it
      routing_key: $pagerduty-integration-key
      event_action: trigger
      # Dedup key prevents duplicate incidents for the same app
      dedup_key: "argocd-{{ .app.metadata.name }}-sync-failed"
      payload:
        summary: "ArgoCD sync failed: {{ .app.metadata.name }} in {{ .app.spec.destination.namespace }}"
        severity: critical
        source: argocd
        component: "{{ .app.metadata.name }}"
        group: "{{ .app.spec.project }}"
        class: deployment-failure
        custom_details:
          application: "{{ .app.metadata.name }}"
          project: "{{ .app.spec.project }}"
          namespace: "{{ .app.spec.destination.namespace }}"
          cluster: "{{ .app.spec.destination.server }}"
          revision: "{{ .app.status.sync.revision }}"
          error_message: "{{ .app.status.operationState.message }}"
          argocd_url: "https://argocd.example.com/applications/{{ .app.metadata.name }}"
```

### Auto-Resolve on Successful Sync

This is one of the most useful features - automatically resolving PagerDuty incidents when the issue is fixed:

```yaml
  template.pagerduty-sync-succeeded: |
    pagerduty:
      routing_key: $pagerduty-integration-key
      event_action: resolve
      # Must match the dedup_key used in the trigger event
      dedup_key: "argocd-{{ .app.metadata.name }}-sync-failed"
      payload:
        summary: "ArgoCD sync succeeded: {{ .app.metadata.name }}"
        severity: info
        source: argocd
        component: "{{ .app.metadata.name }}"
```

### Incident for Health Degradation

```yaml
  template.pagerduty-health-degraded: |
    pagerduty:
      routing_key: $pagerduty-integration-key
      event_action: trigger
      dedup_key: "argocd-{{ .app.metadata.name }}-health-degraded"
      payload:
        summary: "ArgoCD application unhealthy: {{ .app.metadata.name }} is {{ .app.status.health.status }}"
        severity: warning
        source: argocd
        component: "{{ .app.metadata.name }}"
        group: "{{ .app.spec.project }}"
        class: health-degradation
        custom_details:
          application: "{{ .app.metadata.name }}"
          health_status: "{{ .app.status.health.status }}"
          sync_status: "{{ .app.status.sync.status }}"
          namespace: "{{ .app.spec.destination.namespace }}"
          argocd_url: "https://argocd.example.com/applications/{{ .app.metadata.name }}"

  template.pagerduty-health-resolved: |
    pagerduty:
      routing_key: $pagerduty-integration-key
      event_action: resolve
      dedup_key: "argocd-{{ .app.metadata.name }}-health-degraded"
      payload:
        summary: "ArgoCD application healthy: {{ .app.metadata.name }}"
        severity: info
        source: argocd
        component: "{{ .app.metadata.name }}"
```

## Configuring Triggers

Set up triggers that fire the PagerDuty templates at the right times:

```yaml
  # Trigger incident on sync failure
  trigger.on-sync-failed-pagerduty: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [pagerduty-sync-failed]

  # Auto-resolve incident on sync success
  trigger.on-sync-succeeded-pagerduty: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [pagerduty-sync-succeeded]

  # Trigger incident on health degradation
  trigger.on-health-degraded-pagerduty: |
    - when: app.status.health.status == 'Degraded'
      send: [pagerduty-health-degraded]

  # Auto-resolve when health recovers
  trigger.on-health-recovered-pagerduty: |
    - when: app.status.health.status == 'Healthy'
      send: [pagerduty-health-resolved]
```

## Subscribing Applications

Only subscribe production-critical applications to PagerDuty to avoid alert fatigue:

```bash
# Subscribe production applications
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-pagerduty.pagerduty=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-sync-succeeded-pagerduty.pagerduty=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-health-degraded-pagerduty.pagerduty=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-health-recovered-pagerduty.pagerduty=""
```

For project-level subscriptions:

```yaml
  subscriptions: |
    - recipients:
        - pagerduty
      triggers:
        - on-sync-failed-pagerduty
        - on-sync-succeeded-pagerduty
        - on-health-degraded-pagerduty
        - on-health-recovered-pagerduty
      selector: app.spec.project == 'production'
```

## Multiple PagerDuty Services

If you have different PagerDuty services for different teams, use the webhook service to target specific integration keys:

```yaml
  service.webhook.pagerduty-backend: |
    url: https://events.pagerduty.com/v2/enqueue
    headers:
      - name: Content-Type
        value: application/json

  service.webhook.pagerduty-frontend: |
    url: https://events.pagerduty.com/v2/enqueue
    headers:
      - name: Content-Type
        value: application/json

  template.pagerduty-backend-alert: |
    webhook:
      pagerduty-backend:
        method: POST
        body: |
          {
            "routing_key": "$pagerduty-backend-key",
            "event_action": "trigger",
            "dedup_key": "argocd-{{ .app.metadata.name }}",
            "payload": {
              "summary": "{{ .app.metadata.name }} sync failed",
              "severity": "critical",
              "source": "argocd",
              "component": "{{ .app.metadata.name }}"
            }
          }
```

## Severity Mapping

Map ArgoCD events to PagerDuty severity levels:

| ArgoCD Event | PagerDuty Severity | Rationale |
|---|---|---|
| Sync Failed | critical | Deployment is broken |
| Health Degraded | warning | App is unhealthy but may recover |
| OutOfSync | info | Drift detected but not critical |
| Sync Running | info | Informational only |

## Debugging PagerDuty Notifications

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f | grep -i pagerduty

# Common errors:
# "Invalid routing key" - The integration key is wrong
# "Event rejected" - The PagerDuty service may be disabled
# "Rate limited" - Too many events sent too quickly
```

Test the PagerDuty integration directly:

```bash
# Send a test event to PagerDuty
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "your-integration-key",
    "event_action": "trigger",
    "dedup_key": "argocd-test",
    "payload": {
      "summary": "Test event from ArgoCD",
      "severity": "info",
      "source": "argocd-test"
    }
  }'
```

## Best Practices

**Use dedup keys**: Always set a `dedup_key` based on the application name and event type. This prevents duplicate incidents and enables auto-resolve.

**Pair triggers with resolves**: For every trigger event, create a corresponding resolve event. This closes incidents automatically when the issue is fixed.

**Limit PagerDuty subscriptions to critical apps**: Not every staging app needs to page someone at 3 AM. Use PagerDuty for production-critical services only, and use [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view) or [email](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-email/view) for everything else.

**Include actionable context**: The `custom_details` section should have everything the on-call engineer needs - the ArgoCD URL, the error message, the namespace, and the revision.

PagerDuty integration turns ArgoCD from a passive deployment tool into an active incident detection system. When paired with auto-resolve, it gives your on-call team clear signals about what is broken and automatic confirmation when it is fixed.

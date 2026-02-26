# How to Send ArgoCD Notifications to Opsgenie

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Opsgenie, Incident Management

Description: Learn how to configure ArgoCD to send alerts to Opsgenie for automated incident management, on-call routing, and deployment failure response.

---

Opsgenie is a popular incident management platform, especially for teams already using the Atlassian ecosystem. Integrating it with ArgoCD means deployment failures and health degradations automatically create Opsgenie alerts, which route to the right on-call engineer based on your escalation policies. This guide covers the complete setup.

## Creating an Opsgenie API Integration

1. Log into Opsgenie
2. Go to Settings and then Integrations
3. Click "Add Integration"
4. Search for "API" and select it
5. Name it "ArgoCD" and assign it to the appropriate team
6. Copy the API Key
7. Make sure the integration is turned on

The API key is what ArgoCD uses to create and manage alerts in Opsgenie.

## Configuring ArgoCD for Opsgenie

ArgoCD does not have a built-in Opsgenie service, so you use the webhook notification service to send alerts via the Opsgenie REST API.

Store the API key in the secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"opsgenie-api-key": "your-opsgenie-api-key"}}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Opsgenie API webhook service
  service.webhook.opsgenie: |
    url: https://api.opsgenie.com/v2/alerts
    headers:
      - name: Content-Type
        value: application/json
      - name: Authorization
        value: GenieKey $opsgenie-api-key

  # For EU-based Opsgenie instances, use:
  # service.webhook.opsgenie: |
  #   url: https://api.eu.opsgenie.com/v2/alerts
  #   headers:
  #     - name: Content-Type
  #       value: application/json
  #     - name: Authorization
  #       value: GenieKey $opsgenie-api-key
```

## Creating Alert Templates

### Sync Failure Alert

```yaml
  template.opsgenie-sync-failed: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "ArgoCD sync failed: {{ .app.metadata.name }}",
            "alias": "argocd-sync-{{ .app.metadata.name }}",
            "description": "Sync operation failed for application {{ .app.metadata.name }} in namespace {{ .app.spec.destination.namespace }}.\n\nError: {{ .app.status.operationState.message }}\n\nRevision: {{ .app.status.sync.revision }}\n\nArgoCD URL: https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "priority": "P2",
            "source": "ArgoCD",
            "tags": ["argocd", "deployment", "sync-failure", "{{ .app.spec.project }}"],
            "entity": "{{ .app.metadata.name }}",
            "details": {
              "application": "{{ .app.metadata.name }}",
              "project": "{{ .app.spec.project }}",
              "namespace": "{{ .app.spec.destination.namespace }}",
              "cluster": "{{ .app.spec.destination.server }}",
              "revision": "{{ .app.status.sync.revision }}",
              "syncStatus": "{{ .app.status.sync.status }}",
              "healthStatus": "{{ .app.status.health.status }}"
            }
          }
```

### Health Degradation Alert

```yaml
  template.opsgenie-health-degraded: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "ArgoCD app unhealthy: {{ .app.metadata.name }} is {{ .app.status.health.status }}",
            "alias": "argocd-health-{{ .app.metadata.name }}",
            "description": "Application {{ .app.metadata.name }} health status changed to {{ .app.status.health.status }}.\n\nNamespace: {{ .app.spec.destination.namespace }}\nSync Status: {{ .app.status.sync.status }}\n\nArgoCD URL: https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "priority": "P3",
            "source": "ArgoCD",
            "tags": ["argocd", "health-degraded", "{{ .app.spec.project }}"],
            "entity": "{{ .app.metadata.name }}",
            "details": {
              "application": "{{ .app.metadata.name }}",
              "project": "{{ .app.spec.project }}",
              "healthStatus": "{{ .app.status.health.status }}",
              "syncStatus": "{{ .app.status.sync.status }}"
            }
          }
```

### Auto-Close Alert on Recovery

To close Opsgenie alerts when the issue is resolved, you need to call the close endpoint:

```yaml
  service.webhook.opsgenie-close: |
    url: https://api.opsgenie.com/v2/alerts
    headers:
      - name: Content-Type
        value: application/json
      - name: Authorization
        value: GenieKey $opsgenie-api-key

  template.opsgenie-sync-resolved: |
    webhook:
      opsgenie-close:
        method: POST
        path: /argocd-sync-{{ .app.metadata.name }}/close?identifierType=alias
        body: |
          {
            "note": "Sync succeeded for {{ .app.metadata.name }} at revision {{ .app.status.sync.revision | trunc 7 }}"
          }

  template.opsgenie-health-resolved: |
    webhook:
      opsgenie-close:
        method: POST
        path: /argocd-health-{{ .app.metadata.name }}/close?identifierType=alias
        body: |
          {
            "note": "Health recovered for {{ .app.metadata.name }}: {{ .app.status.health.status }}"
          }
```

Note: The auto-close approach above uses the alert alias to identify which alert to close. The alias must match between the create and close operations.

## Configuring Triggers

```yaml
  trigger.on-sync-failed-opsgenie: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [opsgenie-sync-failed]

  trigger.on-sync-succeeded-opsgenie: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [opsgenie-sync-resolved]

  trigger.on-health-degraded-opsgenie: |
    - when: app.status.health.status == 'Degraded'
      send: [opsgenie-health-degraded]

  trigger.on-health-recovered-opsgenie: |
    - when: app.status.health.status == 'Healthy'
      send: [opsgenie-health-resolved]
```

## Subscribing Applications

```bash
# Subscribe critical applications
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-opsgenie.opsgenie=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-sync-succeeded-opsgenie.opsgenie-close=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-health-degraded-opsgenie.opsgenie=""
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-health-recovered-opsgenie.opsgenie-close=""
```

## Priority Mapping

Map ArgoCD events to Opsgenie priorities based on your incident severity model:

```yaml
  # Critical production failure
  template.opsgenie-prod-sync-failed: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "PRODUCTION sync failed: {{ .app.metadata.name }}",
            "alias": "argocd-sync-{{ .app.metadata.name }}",
            "priority": "P1",
            "responders": [
              {"type": "team", "name": "SRE Team"},
              {"type": "escalation", "name": "Production Escalation"}
            ],
            "source": "ArgoCD",
            "tags": ["argocd", "production", "critical"]
          }

  # Staging failure - lower priority
  template.opsgenie-staging-sync-failed: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "Staging sync failed: {{ .app.metadata.name }}",
            "alias": "argocd-sync-{{ .app.metadata.name }}",
            "priority": "P4",
            "responders": [
              {"type": "team", "name": "Dev Team"}
            ],
            "source": "ArgoCD",
            "tags": ["argocd", "staging"]
          }
```

## Team-Based Routing

Route alerts to specific Opsgenie teams based on the ArgoCD project:

```yaml
  # Different templates per project with different team responders
  template.opsgenie-backend-alert: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "{{ .app.metadata.name }} sync failed",
            "alias": "argocd-{{ .app.metadata.name }}",
            "priority": "P2",
            "responders": [{"type": "team", "name": "Backend Team"}],
            "source": "ArgoCD"
          }

  template.opsgenie-frontend-alert: |
    webhook:
      opsgenie:
        method: POST
        body: |
          {
            "message": "{{ .app.metadata.name }} sync failed",
            "alias": "argocd-{{ .app.metadata.name }}",
            "priority": "P2",
            "responders": [{"type": "team", "name": "Frontend Team"}],
            "source": "ArgoCD"
          }
```

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the Opsgenie API directly
curl -X POST https://api.opsgenie.com/v2/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: GenieKey your-api-key" \
  -d '{
    "message": "Test from ArgoCD",
    "alias": "argocd-test",
    "priority": "P5",
    "source": "ArgoCD Test"
  }'

# Check if the alert was created
curl -X GET "https://api.opsgenie.com/v2/alerts?query=source:ArgoCD" \
  -H "Authorization: GenieKey your-api-key"
```

Common issues:
- **403 Forbidden**: API key is wrong or the integration is disabled
- **422 Unprocessable**: The request body has invalid fields
- **429 Rate Limited**: Too many alerts being created. Use the `oncePer` field in triggers

For other incident management integrations, see our guide on [PagerDuty notifications](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-pagerduty/view). For general notification setup, check our [ArgoCD notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view).

Opsgenie integration gives your team automated incident response for deployment failures. Combined with Opsgenie's routing rules and escalation policies, ArgoCD alerts reach the right person at the right time.

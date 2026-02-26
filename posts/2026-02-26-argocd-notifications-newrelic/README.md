# How to Send ArgoCD Notifications to NewRelic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, New Relic, Monitoring

Description: Learn how to send ArgoCD deployment events to New Relic as deployment markers and custom events for correlating releases with application performance.

---

New Relic is a widely used observability platform, and correlating ArgoCD deployments with application performance data is essential for understanding the impact of each release. By sending deployment events to New Relic, you get deployment markers on your APM charts and the ability to compare performance before and after each deploy. This guide shows you how to set it up.

## New Relic Deployment Tracking Options

New Relic provides several ways to record deployment events:

1. **Deployment markers (APM)**: Shows deployment lines on APM charts
2. **Custom events (NRDB)**: Stores deployment data queryable with NRQL
3. **Change tracking**: New Relic's newer change tracking API

We will configure ArgoCD to use both the deployment marker API and custom events.

## Getting Your New Relic API Key

1. Log into New Relic
2. Go to the API Keys page (account settings)
3. Create a new User API key (or use an existing one)
4. Copy the key (starts with `NRAK-`)

You also need your New Relic Account ID, visible in the URL when you are logged in.

Store credentials in the ArgoCD secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {
    "newrelic-api-key": "NRAK-your-api-key",
    "newrelic-account-id": "1234567"
  }}'
```

## Option 1: Deployment Markers via Change Tracking API

New Relic's change tracking GraphQL API is the modern way to record deployments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.newrelic-changes: |
    url: https://api.newrelic.com/graphql
    headers:
      - name: Content-Type
        value: application/json
      - name: API-Key
        value: $newrelic-api-key

  template.newrelic-deployment-marker: |
    webhook:
      newrelic-changes:
        method: POST
        body: |
          {
            "query": "mutation { changeTrackingCreateDeployment(deployment: { version: \"{{ .app.status.sync.revision | trunc 7 }}\", entityGuid: \"YOUR_ENTITY_GUID\", description: \"ArgoCD sync for {{ .app.metadata.name }}\", commit: \"{{ .app.status.sync.revision }}\", deploymentType: ROLLING, groupId: \"{{ .app.spec.project }}\" }) { deploymentId entityGuid } }"
          }
```

Replace `YOUR_ENTITY_GUID` with your application's New Relic entity GUID. You can find it in the entity metadata page in New Relic.

### Dynamic Entity GUID via Annotations

If you have multiple applications mapped to different New Relic entities, use annotations:

```yaml
  template.newrelic-dynamic-marker: |
    webhook:
      newrelic-changes:
        method: POST
        body: |
          {
            "query": "mutation { changeTrackingCreateDeployment(deployment: { version: \"{{ .app.status.sync.revision | trunc 7 }}\", entityGuid: \"{{ index .app.metadata.annotations \"newrelic.com/entity-guid\" }}\", description: \"{{ .app.metadata.name }} deployed to {{ .app.spec.destination.namespace }}\", commit: \"{{ .app.status.sync.revision }}\", deploymentType: ROLLING }) { deploymentId entityGuid } }"
          }
```

Then annotate your ArgoCD applications:

```bash
kubectl annotate app my-app -n argocd \
  newrelic.com/entity-guid="YOUR_ENTITY_GUID"
```

## Option 2: Custom Events via Event API

Send deployment data as custom events that you can query with NRQL:

```yaml
  service.webhook.newrelic-events: |
    url: https://insights-collector.newrelic.com/v1/accounts/$newrelic-account-id/events
    headers:
      - name: Content-Type
        value: application/json
      - name: Api-Key
        value: $newrelic-api-key

  template.newrelic-custom-event: |
    webhook:
      newrelic-events:
        method: POST
        body: |
          [{
            "eventType": "ArgoCDDeployment",
            "application": "{{ .app.metadata.name }}",
            "project": "{{ .app.spec.project }}",
            "namespace": "{{ .app.spec.destination.namespace }}",
            "cluster": "{{ .app.spec.destination.server }}",
            "revision": "{{ .app.status.sync.revision }}",
            "revisionShort": "{{ .app.status.sync.revision | trunc 7 }}",
            "syncStatus": "{{ .app.status.sync.status }}",
            "syncPhase": "{{ .app.status.operationState.phase }}",
            "healthStatus": "{{ .app.status.health.status }}",
            "repoURL": "{{ .app.spec.source.repoURL }}",
            "path": "{{ .app.spec.source.path }}"
          }]
```

### Querying Custom Events with NRQL

Once events are flowing, you can query them:

```sql
-- Recent deployments
SELECT * FROM ArgoCDDeployment SINCE 1 day ago

-- Deployment frequency per application
SELECT count(*) FROM ArgoCDDeployment
  WHERE syncPhase = 'Succeeded'
  FACET application
  SINCE 7 days ago
  TIMESERIES 1 day

-- Failed deployments
SELECT * FROM ArgoCDDeployment
  WHERE syncPhase IN ('Error', 'Failed')
  SINCE 7 days ago

-- Deployment frequency trend
SELECT count(*) FROM ArgoCDDeployment
  WHERE syncPhase = 'Succeeded'
  SINCE 30 days ago
  TIMESERIES 1 week

-- Deployments by project
SELECT count(*) FROM ArgoCDDeployment
  FACET project
  SINCE 30 days ago
```

## Option 3: Combined Approach

Send both deployment markers and custom events for the best of both worlds:

```yaml
  template.newrelic-full-tracking: |
    webhook:
      newrelic-changes:
        method: POST
        body: |
          {
            "query": "mutation { changeTrackingCreateDeployment(deployment: { version: \"{{ .app.status.sync.revision | trunc 7 }}\", entityGuid: \"{{ index .app.metadata.annotations \"newrelic.com/entity-guid\" }}\", description: \"{{ .app.metadata.name }}: {{ .app.status.operationState.phase }}\", commit: \"{{ .app.status.sync.revision }}\" }) { deploymentId } }"
          }
      newrelic-events:
        method: POST
        body: |
          [{
            "eventType": "ArgoCDDeployment",
            "application": "{{ .app.metadata.name }}",
            "project": "{{ .app.spec.project }}",
            "syncPhase": "{{ .app.status.operationState.phase }}",
            "revision": "{{ .app.status.sync.revision }}",
            "healthStatus": "{{ .app.status.health.status }}",
            "namespace": "{{ .app.spec.destination.namespace }}"
          }]
```

## Configuring Triggers

```yaml
  trigger.on-deployed-newrelic: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [newrelic-full-tracking]

  trigger.on-sync-failed-newrelic: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [newrelic-custom-event]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-newrelic.newrelic-changes=""
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-newrelic.newrelic-events=""
```

## Building New Relic Dashboards

Create a New Relic dashboard for ArgoCD deployment analytics:

```sql
-- Panel 1: Deployments Today
SELECT count(*) as 'Deployments'
FROM ArgoCDDeployment
WHERE syncPhase = 'Succeeded'
SINCE 1 day ago

-- Panel 2: Success Rate
SELECT percentage(count(*), WHERE syncPhase = 'Succeeded') as 'Success Rate'
FROM ArgoCDDeployment
SINCE 7 days ago

-- Panel 3: Deployments Timeline
SELECT count(*)
FROM ArgoCDDeployment
FACET syncPhase
SINCE 7 days ago
TIMESERIES 1 hour

-- Panel 4: Most Deployed Applications
SELECT count(*)
FROM ArgoCDDeployment
WHERE syncPhase = 'Succeeded'
FACET application
SINCE 30 days ago
LIMIT 10

-- Panel 5: Failed Deployments Table
SELECT application, revision, namespace, timestamp
FROM ArgoCDDeployment
WHERE syncPhase IN ('Error', 'Failed')
SINCE 7 days ago
LIMIT 50
```

## New Relic Alerts on Deployment Events

Create alerts based on deployment patterns:

```sql
-- Alert when deployment failure rate exceeds threshold
SELECT percentage(count(*), WHERE syncPhase IN ('Error', 'Failed'))
FROM ArgoCDDeployment
SINCE 1 hour ago

-- Alert when no deployments happen (possible pipeline issue)
SELECT count(*)
FROM ArgoCDDeployment
WHERE syncPhase = 'Succeeded'
SINCE 24 hours ago
```

## Debugging

```bash
# Check ArgoCD notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test New Relic Event API
curl -X POST "https://insights-collector.newrelic.com/v1/accounts/YOUR_ACCOUNT_ID/events" \
  -H "Content-Type: application/json" \
  -H "Api-Key: NRAK-your-key" \
  -d '[{"eventType": "ArgoCDDeployment", "application": "test", "syncPhase": "Succeeded"}]'

# Verify events arrived
# In New Relic: SELECT * FROM ArgoCDDeployment SINCE 10 minutes ago
```

For the complete ArgoCD notification setup, see our [notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other monitoring integrations, check out [Grafana annotations](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-grafana/view) and [Alertmanager](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-alertmanager/view).

New Relic integration gives you deployment context right alongside your application performance data. When you can see that a latency spike started exactly when a deployment happened, the debugging process becomes much faster.

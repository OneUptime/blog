# How to Send ArgoCD Notifications to Pushover

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Pushover, Mobile Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Pushover for instant mobile push alerts on deployment failures and health degradation.

---

Pushover delivers push notifications to your phone, tablet, and desktop. It is a lightweight alternative to PagerDuty or Opsgenie when you need instant alerts for ArgoCD deployment events but do not need a full incident management platform. Pushover is particularly useful for small teams, side projects, or as a personal alert channel for the on-call engineer.

## Setting Up Pushover

1. Create an account at https://pushover.net
2. Install the Pushover app on your phone (iOS or Android)
3. Note your **User Key** from the Pushover dashboard
4. Create an application:
   - Go to https://pushover.net/apps/build
   - Name it "ArgoCD"
   - Optionally upload an ArgoCD logo icon
   - Copy the **API Token/Key**

For team notifications, create a Pushover Group:
1. Go to the Groups page on pushover.net
2. Create a group and add team members
3. Copy the **Group Key** (use this instead of the User Key)

## Configuring ArgoCD

Store the Pushover credentials:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {
    "pushover-api-token": "your-application-api-token",
    "pushover-user-key": "your-user-or-group-key"
  }}'
```

Configure the webhook service pointing to the Pushover API:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.pushover: |
    url: https://api.pushover.net/1/messages.json
    headers:
      - name: Content-Type
        value: application/json
```

## Creating Notification Templates

### Basic Deployment Alert

```yaml
  template.pushover-sync-succeeded: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-user-key",
            "title": "Deploy: {{ .app.metadata.name }}",
            "message": "Synced to {{ .app.status.sync.revision | trunc 7 }}\nNamespace: {{ .app.spec.destination.namespace }}\nHealth: {{ .app.status.health.status }}",
            "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "url_title": "View in ArgoCD",
            "priority": 0,
            "sound": "pushover"
          }
```

### Critical Failure Alert

For sync failures, use a higher priority to ensure the notification is not missed:

```yaml
  template.pushover-sync-failed: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-user-key",
            "title": "FAILED: {{ .app.metadata.name }}",
            "message": "Sync failed!\nProject: {{ .app.spec.project }}\nRevision: {{ .app.status.sync.revision | trunc 7 }}\nError: {{ .app.status.operationState.message }}",
            "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "url_title": "Investigate",
            "priority": 1,
            "sound": "siren"
          }
```

### Emergency Priority (Requires Acknowledgment)

For production-critical failures, use emergency priority. This repeatedly sends the notification until acknowledged:

```yaml
  template.pushover-emergency: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-user-key",
            "title": "PRODUCTION: {{ .app.metadata.name }} FAILED",
            "message": "Critical production deployment failure!\nApp: {{ .app.metadata.name }}\nNamespace: {{ .app.spec.destination.namespace }}\nError: {{ .app.status.operationState.message }}",
            "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "url_title": "Fix Now",
            "priority": 2,
            "retry": 60,
            "expire": 3600,
            "sound": "alien"
          }
```

Priority levels in Pushover:
- **-2**: No notification, no sound, no vibration (lowest)
- **-1**: Quiet notification (no sound)
- **0**: Normal priority (default)
- **1**: High priority - bypasses quiet hours
- **2**: Emergency - repeats until acknowledged

### Health Degradation Alert

```yaml
  template.pushover-health-degraded: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-user-key",
            "title": "Health: {{ .app.metadata.name }}",
            "message": "Health status: {{ .app.status.health.status }}\nSync: {{ .app.status.sync.status }}\nNamespace: {{ .app.spec.destination.namespace }}",
            "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
            "url_title": "View App",
            "priority": 0,
            "sound": "falling"
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed-pushover: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [pushover-sync-succeeded]

  trigger.on-sync-failed-pushover: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [pushover-sync-failed]

  # Emergency alert for production only
  trigger.on-prod-failed-pushover: |
    - when: app.status.operationState.phase in ['Error', 'Failed'] and app.spec.project == 'production'
      send: [pushover-emergency]

  trigger.on-health-degraded-pushover: |
    - when: app.status.health.status == 'Degraded'
      send: [pushover-health-degraded]
```

## Subscribing Applications

```bash
# Regular deployments
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-pushover.pushover=""

# Failure alerts
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-pushover.pushover=""

# Production emergency
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-prod-failed-pushover.pushover=""
```

## Sending to Different Users

For routing alerts to specific people, create separate templates with different user keys:

```yaml
  template.pushover-alert-oncall: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-oncall-key",
            "title": "{{ .app.metadata.name }} sync failed",
            "message": "{{ .app.status.operationState.message }}",
            "priority": 1
          }

  template.pushover-info-team: |
    webhook:
      pushover:
        method: POST
        body: |
          {
            "token": "$pushover-api-token",
            "user": "$pushover-team-group-key",
            "title": "{{ .app.metadata.name }} deployed",
            "message": "Revision: {{ .app.status.sync.revision | trunc 7 }}",
            "priority": -1
          }
```

## Custom Sounds

Pushover supports various notification sounds. Use different sounds for different severity levels:

| Sound | Good For |
|---|---|
| `pushover` | Default, normal notifications |
| `bike` | Low priority, informational |
| `siren` | High priority failures |
| `alien` | Emergency alerts |
| `falling` | Health degradation |
| `none` | Silent push |

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test Pushover API directly
curl -X POST https://api.pushover.net/1/messages.json \
  -d "token=YOUR_API_TOKEN" \
  -d "user=YOUR_USER_KEY" \
  -d "title=ArgoCD Test" \
  -d "message=Test notification from ArgoCD"

# Common errors:
# "application token is invalid" - Wrong API token
# "user identifier is not valid" - Wrong user/group key
# "user has no active devices" - User hasn't set up the Pushover app
```

For the complete ArgoCD notification setup, see our [notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For full incident management, check out [PagerDuty](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-pagerduty/view) and [Opsgenie](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-opsgenie/view).

Pushover is the simplest way to get ArgoCD deployment alerts on your phone. No complex setup, no monthly per-user pricing - just instant push notifications when your deployments need attention.

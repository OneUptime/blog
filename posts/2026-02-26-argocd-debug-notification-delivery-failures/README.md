# How to Debug Notification Delivery Failures in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Troubleshooting

Description: Learn how to systematically debug ArgoCD notification delivery failures by checking controller logs, verifying service configuration, testing triggers, and diagnosing common connectivity issues.

---

ArgoCD notifications that fail silently are one of the most frustrating issues to debug. The notification controller does not always make it obvious why a message did not reach its destination. This guide gives you a systematic approach to find and fix notification delivery problems.

## The Debugging Checklist

When notifications are not arriving, work through these checks in order. Each one eliminates a category of problems:

1. Is the notifications controller running?
2. Is the trigger defined and matching?
3. Is the template defined?
4. Is the service configured with valid credentials?
5. Is the application subscribed to the trigger?
6. Can the controller reach the notification service?

## Step 1: Verify the Notifications Controller

The notifications controller is the pod that evaluates triggers and sends messages. If it is not running, nothing works:

```bash
# Check if the controller pod exists and is running
kubectl get pods -n argocd -l app.kubernetes.io/component=notifications-controller

# Expected output:
# NAME                                               READY   STATUS    RESTARTS
# argocd-notifications-controller-5b7db4d9f8-x2k4m   1/1     Running   0
```

If the pod is in CrashLoopBackOff or not present, check:

```bash
# View controller logs for startup errors
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller --tail=100

# Check for OOM kills or resource issues
kubectl describe pod -n argocd -l app.kubernetes.io/component=notifications-controller
```

## Step 2: Check Controller Logs for Delivery Errors

The notifications controller logs every delivery attempt. Search for error messages:

```bash
# Get recent logs from the controller
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller --tail=200

# Filter for errors
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller | grep -i "error\|fail\|warn"

# Watch logs in real-time while triggering a sync
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller -f
```

Common log messages and what they mean:

- `failed to notify: service 'slack' is not configured` - the service definition is missing from the ConfigMap
- `failed to send notification: channel not found` - the Slack channel name is wrong or the bot is not invited
- `failed to execute condition` - the trigger's `when` expression has a syntax error
- `template 'xyz' is not defined` - the trigger references a template that does not exist

## Step 3: Verify Trigger Configuration

Check that your trigger is properly defined:

```bash
# List all triggers in the ConfigMap
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data | to_entries[] | select(.key | startswith("trigger.")) | .key'
```

Verify the trigger condition matches your application's current state:

```bash
# Get the application's current state
kubectl get application my-app -n argocd -o json | \
  jq '{
    syncStatus: .status.sync.status,
    healthStatus: .status.health.status,
    operationPhase: .status.operationState.phase,
    revision: .status.sync.revision
  }'
```

Compare these values against the `when` condition in your trigger. If the application status does not match the trigger condition, the trigger will not fire.

## Step 4: Check for oncePer Deduplication

The `oncePer` field prevents duplicate notifications. If a notification was already sent for the current value of `oncePer`, it will not send again:

```bash
# Check the trigger's oncePer field
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data["trigger.on-sync-failed"]'
```

If you changed the trigger configuration but the `oncePer` value has not changed (same revision, same timestamp), the controller considers the notification already sent. To force a resend, you need to change the `oncePer` value or delete the notification state:

```bash
# The notifications controller stores state in a secret
kubectl get secret argocd-notifications-secret -n argocd -o json | \
  jq '.data | keys'
```

## Step 5: Verify Service Configuration

Each service needs proper configuration in the ConfigMap and credentials in the Secret:

```bash
# Check service definitions
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data | to_entries[] | select(.key | startswith("service.")) | .key'

# Verify the Slack service config (without showing the token)
kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '.data["service.slack"]'
```

For Slack specifically, check:

```bash
# Verify the Slack token exists in the secret
kubectl get secret argocd-notifications-secret -n argocd -o json | \
  jq -r '.data | keys[] | select(contains("slack"))'

# Verify the token is not empty
kubectl get secret argocd-notifications-secret -n argocd -o jsonpath='{.data.slack-token}' | \
  base64 -d | wc -c
```

## Step 6: Verify Application Subscriptions

Confirm the application has the correct subscription annotation:

```bash
# List notification annotations on the application
kubectl get application my-app -n argocd -o json | \
  jq '.metadata.annotations | to_entries[] | select(.key | startswith("notifications"))'

# Also check the parent project
PROJECT=$(kubectl get application my-app -n argocd -o jsonpath='{.spec.project}')
kubectl get appproject "$PROJECT" -n argocd -o json | \
  jq '.metadata.annotations | to_entries[] | select(.key | startswith("notifications"))'
```

The trigger name in the annotation must exactly match the trigger name in the ConfigMap. A common mistake is a subtle typo like `on-sync-fail` instead of `on-sync-failed`.

## Step 7: Test Connectivity

If the controller logs show delivery failures, the issue might be network connectivity:

```bash
# Test Slack API connectivity from within the cluster
kubectl run -it --rm debug-notifications \
  --image=curlimages/curl \
  --namespace=argocd \
  -- curl -s -o /dev/null -w "%{http_code}" \
  https://slack.com/api/api.test

# Expected: 200
```

For SMTP email services:

```bash
# Test SMTP connectivity
kubectl run -it --rm debug-smtp \
  --image=busybox \
  --namespace=argocd \
  -- nc -zv smtp.gmail.com 587
```

If you are behind a corporate firewall or using network policies, ensure the notifications controller pod can reach external services.

## Common Problems and Solutions

### Problem: "channel_not_found" Error

The Slack bot cannot post to the specified channel. Fix:

```bash
# 1. Verify channel exists and name is correct (no # prefix)
# 2. Invite the bot to the channel in Slack:
#    /invite @ArgoCD-Notifications
```

### Problem: Notifications Work for Some Apps but Not Others

Check that the non-working applications have the correct annotations and are in the expected sync/health state:

```bash
# Compare working and non-working apps
kubectl get application working-app -n argocd -o json | \
  jq '{annotations: .metadata.annotations, status: {sync: .status.sync.status, health: .status.health.status}}'

kubectl get application broken-app -n argocd -o json | \
  jq '{annotations: .metadata.annotations, status: {sync: .status.sync.status, health: .status.health.status}}'
```

### Problem: Notifications Sent Once but Stopped

This is almost always due to `oncePer` deduplication. If the application state has not changed since the last notification, the controller will not resend:

```yaml
  # Bad: oncePer uses a value that does not change between events
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      oncePer: app.metadata.name
      send:
        - sync-failed

  # Good: oncePer uses a value that changes with each event
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      oncePer: app.status.operationState.finishedAt
      send:
        - sync-failed
```

### Problem: Template Rendering Errors

If the trigger fires but the template fails to render, you will see errors in the controller logs:

```bash
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller | grep "render"
```

Common causes:
- Accessing nil fields without nil checks (e.g., `app.status.operationState.message` when operationState is nil)
- Typos in Go template expressions
- Using pipes with functions that do not exist

### Problem: Missing Secret Reference

If your service config references a variable like `$slack-token` but the secret does not have that key:

```bash
# Check what keys exist in the secret
kubectl get secret argocd-notifications-secret -n argocd -o json | \
  jq -r '.data | keys[]'

# Verify the expected key exists
kubectl get secret argocd-notifications-secret -n argocd -o jsonpath='{.data.slack-token}'
```

## Enabling Debug Logging

For deeper investigation, increase the log level on the notifications controller:

```bash
# Edit the deployment to add --loglevel=debug
kubectl edit deployment argocd-notifications-controller -n argocd
```

Add the argument to the container spec:

```yaml
spec:
  containers:
    - name: argocd-notifications-controller
      args:
        - --loglevel=debug
```

Debug logging shows every trigger evaluation, every template render, and every delivery attempt with full details.

## Notification State Reset

As a last resort, you can reset the notification state to force all notifications to be re-evaluated:

```bash
# Get the notification state annotation from an application
kubectl get application my-app -n argocd -o json | \
  jq '.metadata.annotations["notified.notifications.argoproj.io"]'

# Remove the notification state to force re-evaluation
kubectl annotate application my-app \
  -n argocd \
  notified.notifications.argoproj.io-
```

This removes the record of previously sent notifications, so the controller will re-evaluate all triggers as if no notifications have ever been sent for this application.

Systematic debugging saves hours of guesswork. Start from the controller, verify each layer, and you will find the issue. For related topics, see [monitoring notification system health](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-notification-system-health/view) and [testing notification templates locally](https://oneuptime.com/blog/post/2026-02-26-argocd-test-notification-templates-locally/view).

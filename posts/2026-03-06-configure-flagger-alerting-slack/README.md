# How to Configure Flagger Alerting with Slack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, Flagger, Slack, Alerting, Notifications, Canary, Kubernetes, GitOps

Description: A practical guide to setting up Slack notifications for Flagger canary deployment events in Flux-managed Kubernetes clusters.

---

## Introduction

When running canary deployments with Flagger, it is essential to receive real-time notifications about deployment progress, promotions, and rollbacks. Slack is one of the most popular team communication platforms, and Flagger has built-in support for sending deployment alerts to Slack channels.

This guide walks you through configuring Flagger to send alerts to Slack, from creating a Slack webhook to defining alert providers and customizing notification behavior.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- A Slack workspace with permissions to create incoming webhooks
- An application with a Flagger Canary resource
- kubectl and flux CLI tools

## Step 1: Create a Slack Incoming Webhook

First, create an incoming webhook in your Slack workspace.

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch" and give it a name like "Flagger Alerts"
3. Select your workspace and click "Create App"
4. Navigate to "Incoming Webhooks" in the sidebar
5. Toggle "Activate Incoming Webhooks" to On
6. Click "Add New Webhook to Workspace"
7. Select the channel where you want to receive alerts
8. Copy the webhook URL

The webhook URL will look like:
```yaml
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## Step 2: Create a Kubernetes Secret for the Webhook URL

Store the Slack webhook URL as a Kubernetes secret.

```yaml
# slack-webhook-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flagger-system
type: Opaque
stringData:
  # Your Slack incoming webhook URL
  address: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

Apply the secret:

```bash
kubectl apply -f slack-webhook-secret.yaml
```

## Step 3: Create a Flagger AlertProvider for Slack

Define an AlertProvider resource that tells Flagger how to send notifications to Slack.

```yaml
# slack-alert-provider.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-alert
  namespace: default
spec:
  # Provider type
  type: slack
  # Channel to post messages to (must match the webhook channel)
  channel: deployments
  # Username that appears as the message sender
  username: flagger
  # Reference to the secret containing the webhook URL
  secretRef:
    name: slack-webhook-url
```

Apply the AlertProvider:

```bash
kubectl apply -f slack-alert-provider.yaml
```

## Step 4: Reference the AlertProvider in Your Canary Resource

Link the AlertProvider to your Canary resource to enable notifications.

```yaml
# canary-with-slack-alerts.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    # Alert configuration
    alerts:
      # Reference the Slack alert provider
      - name: slack-notification
        # Minimum severity level for alerts
        # info: all events including progress updates
        # warn: warnings and errors only
        # error: errors only
        severity: info
        providerRef:
          name: slack-alert
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

## Step 5: Configure Multiple Alert Severity Levels

You can configure different Slack channels for different severity levels.

```yaml
# slack-alert-providers-multi.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-info
  namespace: default
spec:
  type: slack
  channel: deploy-info
  username: flagger
  secretRef:
    name: slack-webhook-url
---
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-errors
  namespace: default
spec:
  type: slack
  # Send errors to a separate high-priority channel
  channel: deploy-errors
  username: flagger-alert
  secretRef:
    name: slack-webhook-url-errors
```

Reference both providers in the Canary:

```yaml
# canary-multi-severity.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    alerts:
      # Info-level alerts go to deploy-info channel
      - name: info-alerts
        severity: info
        providerRef:
          name: slack-info
      # Error-level alerts go to deploy-errors channel
      - name: error-alerts
        severity: error
        providerRef:
          name: slack-errors
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 6: Configure Alert Provider at the Cluster Level

For cluster-wide alerting, configure the AlertProvider in the flagger-system namespace and reference it from any Canary resource.

```yaml
# cluster-slack-alert.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: cluster-slack
  namespace: flagger-system
spec:
  type: slack
  channel: k8s-deployments
  username: flagger
  secretRef:
    name: slack-webhook-url
```

Reference the cluster-level provider from your canary:

```yaml
# canary-cluster-alert.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    alerts:
      - name: cluster-notifications
        severity: info
        providerRef:
          name: cluster-slack
          # Cross-namespace reference
          namespace: flagger-system
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 7: Understanding Slack Alert Messages

Flagger sends structured Slack messages with the following information:

- **Canary name and namespace**: Identifies the deployment
- **Status**: Current state (Initialized, Progressing, Promoting, Finalising, Succeeded, Failed)
- **Traffic weight**: Current percentage of traffic routed to the canary
- **Metric analysis results**: Pass or fail status for each configured metric
- **Event messages**: Detailed event information for promotions and rollbacks

Example Slack messages you will see:

- "Starting canary analysis for my-app.default"
- "Advance my-app.default canary weight 10"
- "Advance my-app.default canary weight 20"
- "Promotion completed! my-app.default"
- "Rolling back my-app.default failed checks threshold reached 5"

## Step 8: Test the Slack Integration

Verify that alerts are working by triggering a canary deployment.

```bash
# Apply the AlertProvider and Canary
kubectl apply -f slack-alert-provider.yaml
kubectl apply -f canary-with-slack-alerts.yaml

# Wait for initialization
kubectl get canary my-app -n default -w

# Trigger a canary deployment
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Watch the canary and check Slack for notifications
kubectl get canary my-app -n default -w
```

Check Flagger logs for alert delivery:

```bash
# View alert-related logs
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep -i "alert\|slack"
```

## Troubleshooting

Common issues with Slack alerting:

- **No messages appearing**: Verify the webhook URL is correct and the secret is in the right namespace
- **Channel not found**: Ensure the channel name in the AlertProvider matches an existing Slack channel
- **Webhook expired**: Slack webhooks can be revoked; check the Slack app configuration
- **Rate limiting**: Slack has rate limits on incoming webhooks; reduce alert frequency if needed

```bash
# Test the webhook URL directly
kubectl run -n flagger-system test-slack --rm -it --image=curlimages/curl -- \
  curl -s -X POST "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message from Flagger"}'

# Check Flagger logs for errors
kubectl logs -n flagger-system deployment/flagger --tail=50 | grep -i error
```

## Conclusion

You have successfully configured Flagger to send canary deployment alerts to Slack. With severity-based routing, you can direct informational updates to a general channel and error alerts to a high-priority channel. This integration ensures your team stays informed about deployment progress and can quickly respond to rollbacks. Combined with Flux GitOps, your alerting configuration is version-controlled and consistently applied across environments.

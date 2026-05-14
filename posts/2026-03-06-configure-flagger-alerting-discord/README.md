# How to Configure Flagger Alerting with Discord

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flagger, Discord, Alerting, Notification, Canary, Kubernetes, GitOps

Description: Set up Discord webhook notifications for Flagger canary deployment events in Flux-managed Kubernetes clusters.

---

## Introduction

Discord has grown beyond gaming to become a popular communication platform for developer teams and open-source communities. Flagger supports Discord as an alert provider, enabling you to receive canary deployment notifications directly in your Discord channels. This is ideal for teams that use Discord as their primary communication tool and want real-time visibility into progressive delivery events.

This guide covers the full setup of Flagger alerting with Discord, including webhook creation, provider configuration, and best practices for notification management.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- A Discord server with permissions to manage webhooks
- An application with a Flagger Canary resource
- kubectl and flux CLI tools

## Step 1: Create a Discord Webhook

Create a webhook in your Discord server.

1. Open Discord and navigate to the server where you want alerts
2. Right-click the target channel and select "Edit Channel"
3. Go to the "Integrations" tab
4. Click "Create Webhook" (or "View Webhooks" then "New Webhook")
5. Give it a name like "Flagger Alerts"
6. Optionally set a custom avatar
7. Click "Copy Webhook URL"

The webhook URL will look like:
```yaml
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

## Step 2: Create a Kubernetes Secret for the Webhook URL

Store the Discord webhook URL as a Kubernetes secret.

```yaml
# discord-webhook-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook-url
  namespace: default
type: Opaque
stringData:
  # Your Discord webhook URL
  address: "https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz"
```

Apply the secret:

```bash
kubectl apply -f discord-webhook-secret.yaml
```

## Step 3: Create a Flagger AlertProvider for Discord

Define an AlertProvider resource for Discord.

```yaml
# discord-alert-provider.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: discord-alert
  namespace: default
spec:
  # Provider type for Discord
  type: discord
  # Reference to the secret containing the webhook URL
  secretRef:
    name: discord-webhook-url
```

Apply the AlertProvider:

```bash
kubectl apply -f discord-alert-provider.yaml
```

## Step 4: Link the AlertProvider to Your Canary Resource

Add the Discord alert provider to your Canary resource.

```yaml
# canary-with-discord-alerts.yaml
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
      - name: discord-notification
        # info captures all events including progress updates
        severity: info
        providerRef:
          name: discord-alert
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

## Step 5: Configure Multiple Discord Channels

Route alerts to different Discord channels based on severity.

```yaml
# discord-multi-channel-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook-deployments
  namespace: default
type: Opaque
stringData:
  # Webhook for the #deployments channel
  address: "https://discord.com/api/webhooks/1111111111/webhook-token-for-deployments"
---
apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook-alerts
  namespace: default
type: Opaque
stringData:
  # Webhook for the #alerts channel
  address: "https://discord.com/api/webhooks/2222222222/webhook-token-for-alerts"
```

Create corresponding AlertProviders:

```yaml
# discord-multi-providers.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: discord-deployments
  namespace: default
spec:
  type: discord
  secretRef:
    name: discord-webhook-deployments
---
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: discord-alerts
  namespace: default
spec:
  type: discord
  secretRef:
    name: discord-webhook-alerts
```

Reference both in the Canary resource:

```yaml
# canary-multi-discord.yaml
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
      # All canary alerts go to #deployments
      - name: deployment-updates
        severity: info
        providerRef:
          name: discord-deployments
      # Failures and rollbacks also go to #alerts
      - name: critical-alerts
        severity: error
        providerRef:
          name: discord-alerts
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 6: Configure Cluster-Wide Discord Alerting

Set up a shared AlertProvider in the flagger-system namespace for use across all namespaces. The secret referenced by an AlertProvider must be in the same namespace as the AlertProvider, so create or copy the webhook secret into flagger-system first.

```yaml
# cluster-discord-webhook-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook-url
  namespace: flagger-system
type: Opaque
stringData:
  address: "https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz"
```

```yaml
# cluster-discord-alert.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: cluster-discord
  namespace: flagger-system
spec:
  type: discord
  secretRef:
    name: discord-webhook-url
```

Reference it from any canary in any namespace:

```yaml
# canary-cluster-discord.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: staging
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
      - name: cluster-discord-alert
        severity: info
        providerRef:
          name: cluster-discord
          # Cross-namespace reference to the shared provider
          namespace: flagger-system
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 7: Understanding Discord Alert Messages

Flagger sends Slack-compatible attachment payloads to Discord with color-coded status:

- **Green (success/info)**: Canary initialized, new revision detected, promoted successfully
- **Red (failure)**: Canary failed, rolling back

Depending on the event, messages can contain:

- Canary name and namespace
- Current status and phase
- Traffic weight information
- Canary analysis configuration metadata

Example Flagger events and related Discord notifications:

- "Initialization done! my-app.default"
- "New revision detected! Scaling up my-app.default"
- "Promotion completed! my-app.default"
- "Rolling back my-app.default failed checks threshold reached 5"

## Step 8: Customize the Discord Webhook Identity

Flagger's Discord provider sends notifications through incoming webhooks, not the Discord bot API. For more control over the displayed sender, set the webhook name and avatar in Discord, or set the optional username in the AlertProvider. Interactive bot features require a separate integration outside Flagger.

```yaml
# discord-custom-alert-provider.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: discord-custom-alert
  namespace: default
spec:
  type: discord
  username: flagger
  secretRef:
    name: discord-webhook-url
```

## Step 9: Test the Discord Integration

Verify alerts are being delivered to your Discord channel.

```bash
# Apply all resources
kubectl apply -f discord-webhook-secret.yaml
kubectl apply -f discord-alert-provider.yaml
kubectl apply -f canary-with-discord-alerts.yaml

# Wait for canary initialization
kubectl get canary my-app -n default -w

# Trigger a deployment to see alerts
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Monitor canary status
kubectl get canary my-app -n default -w
```

Check Flagger logs:

```bash
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep -i "alert\|discord"
```

## Step 10: Rate Limiting Considerations

Discord webhooks have rate limits. Discord returns rate-limit headers and HTTP 429 responses when a limit is exceeded; avoid generating more alerts than your webhook can handle.

- If you have many canaries, consider using separate webhooks for different services
- Use higher severity levels (warn or error) to reduce message volume

```yaml
# canary-reduced-alerts.yaml
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
      # Only send warnings and errors to reduce noise
      - name: discord-important-only
        severity: warn
        providerRef:
          name: discord-alert
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Troubleshooting

Common issues with Discord alerting:

- **No messages appearing**: Verify the webhook URL is correct and the webhook has not been deleted
- **429 Too Many Requests**: You are hitting Discord rate limits; reduce alert frequency or use separate webhooks
- **Invalid webhook token**: The webhook may have been regenerated; update the secret with the new URL
- **Messages going to wrong channel**: Each webhook is tied to a specific channel; verify the webhook configuration in Discord

```bash
# Test the webhook directly
kubectl run -n flagger-system test-discord --rm -it --image=curlimages/curl -- \
  curl -s -X POST "https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message from Flagger"}'

# Check Flagger events
kubectl get events -n default --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'
```

## Conclusion

You have configured Flagger to send canary deployment alerts to Discord. With support for multiple channels, severity-based routing, and rich embed messages, Discord provides an effective platform for monitoring progressive delivery events. This setup integrates naturally with Flux GitOps workflows, keeping all alerting configuration version-controlled alongside your application deployments.

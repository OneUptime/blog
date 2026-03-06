# How to Configure Flagger Alerting with Microsoft Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, Flagger, microsoft-teams, Alerting, Notifications, Canary, Kubernetes, GitOps

Description: How to set up Microsoft Teams notifications for Flagger canary deployments in Flux-managed Kubernetes clusters.

---

## Introduction

Microsoft Teams is widely used in enterprise environments for team communication and collaboration. Flagger supports Microsoft Teams as an alert provider, allowing you to receive real-time notifications about canary deployment events directly in your Teams channels. This is particularly valuable for organizations that use Microsoft 365 and want to centralize their deployment notifications.

This guide covers the complete setup of Flagger alerting with Microsoft Teams, including webhook creation, alert provider configuration, and notification customization.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- A Microsoft Teams workspace with permissions to add connectors
- An application with a Flagger Canary resource
- kubectl and flux CLI tools

## Step 1: Create a Microsoft Teams Incoming Webhook

Create an incoming webhook connector in your Microsoft Teams channel.

1. Open Microsoft Teams and navigate to the channel where you want alerts
2. Click the three dots menu next to the channel name
3. Select "Connectors" (or "Manage channel" then "Connectors")
4. Find "Incoming Webhook" and click "Configure"
5. Give it a name like "Flagger Canary Alerts"
6. Optionally upload a custom icon
7. Click "Create"
8. Copy the webhook URL

The webhook URL will look like:
```yaml
https://outlook.office.com/webhook/GUID@GUID/IncomingWebhook/GUID/GUID
```

For Teams using Workflows (Power Automate), the URL format may differ:
```yaml
https://prod-XX.westus.logic.azure.com:443/workflows/GUID/triggers/manual/paths/invoke?...
```

## Step 2: Create a Kubernetes Secret for the Webhook URL

Store the Teams webhook URL as a Kubernetes secret.

```yaml
# teams-webhook-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teams-webhook-url
  namespace: flagger-system
type: Opaque
stringData:
  # Your Microsoft Teams incoming webhook URL
  address: "https://outlook.office.com/webhook/GUID@GUID/IncomingWebhook/GUID/GUID"
```

Apply the secret:

```bash
kubectl apply -f teams-webhook-secret.yaml
```

## Step 3: Create a Flagger AlertProvider for Microsoft Teams

Define an AlertProvider resource for Microsoft Teams.

```yaml
# teams-alert-provider.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: teams-alert
  namespace: default
spec:
  # Provider type for Microsoft Teams
  type: msteams
  # Reference to the secret containing the webhook URL
  secretRef:
    name: teams-webhook-url
```

Apply the AlertProvider:

```bash
kubectl apply -f teams-alert-provider.yaml
```

## Step 4: Link the AlertProvider to Your Canary Resource

Add the Teams alert provider to your Canary resource configuration.

```yaml
# canary-with-teams-alerts.yaml
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
      - name: teams-notification
        # Severity levels: info, warn, error
        severity: info
        providerRef:
          name: teams-alert
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

## Step 5: Configure Multiple Alert Providers for Different Channels

Set up different Teams channels for different severity levels or different teams.

```yaml
# teams-multi-channel-providers.yaml
# Provider for the development team channel
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: teams-dev
  namespace: default
spec:
  type: msteams
  secretRef:
    name: teams-webhook-dev
---
# Provider for the SRE/ops team channel
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: teams-sre
  namespace: default
spec:
  type: msteams
  secretRef:
    name: teams-webhook-sre
```

Create the corresponding secrets:

```yaml
# teams-webhook-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teams-webhook-dev
  namespace: flagger-system
type: Opaque
stringData:
  address: "https://outlook.office.com/webhook/dev-channel-webhook-url"
---
apiVersion: v1
kind: Secret
metadata:
  name: teams-webhook-sre
  namespace: flagger-system
type: Opaque
stringData:
  address: "https://outlook.office.com/webhook/sre-channel-webhook-url"
```

Reference both in the Canary:

```yaml
# canary-multi-teams-alerts.yaml
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
      # Info alerts go to the dev team
      - name: dev-notifications
        severity: info
        providerRef:
          name: teams-dev
      # Error alerts go to the SRE team
      - name: sre-notifications
        severity: error
        providerRef:
          name: teams-sre
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 6: Configure Teams Alerts Across Namespaces

For cluster-wide alerting, create the AlertProvider in the flagger-system namespace.

```yaml
# cluster-teams-alert.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: cluster-teams
  namespace: flagger-system
spec:
  type: msteams
  secretRef:
    name: teams-webhook-url
```

Reference it from any namespace:

```yaml
# canary-cross-namespace-alert.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
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
      - name: cluster-teams-alert
        severity: info
        providerRef:
          name: cluster-teams
          # Reference provider from the flagger-system namespace
          namespace: flagger-system
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Step 7: Understanding Teams Alert Messages

Flagger sends Adaptive Card messages to Microsoft Teams with structured information:

- **Title**: Canary name, namespace, and current status
- **Color coding**: Green for success, yellow for progress, red for failures
- **Details**: Traffic weight, metric results, and event messages
- **Timestamp**: When the event occurred

You will see messages like:

- "Initialization done! my-app.default"
- "New revision detected! Scaling up my-app.default"
- "Starting canary analysis for my-app.default"
- "Advance my-app.default canary weight 10"
- "Promotion completed! my-app.default"
- "Rolling back my-app.default failed checks threshold reached"

## Step 8: Test the Teams Integration

Verify that alerts are delivered to your Teams channel.

```bash
# Apply configurations
kubectl apply -f teams-webhook-secret.yaml
kubectl apply -f teams-alert-provider.yaml
kubectl apply -f canary-with-teams-alerts.yaml

# Wait for initialization and check Teams for the init message
kubectl get canary my-app -n default -w

# Trigger a canary deployment
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Monitor progression
kubectl get canary my-app -n default -w
```

Check Flagger logs for alert delivery status:

```bash
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep -i "alert\|teams"
```

## Troubleshooting

Common issues with Microsoft Teams alerting:

- **No messages appearing**: Verify the webhook URL is valid and has not been deleted from the Teams connector settings
- **403 Forbidden**: The webhook may have been disabled or the connector removed from the channel
- **Webhook URL expired**: Microsoft Teams webhooks can expire; regenerate if needed
- **Message format errors**: Ensure you are using the correct provider type (`msteams`)

```bash
# Test the webhook directly
kubectl run -n flagger-system test-teams --rm -it --image=curlimages/curl -- \
  curl -s -X POST "https://outlook.office.com/webhook/GUID@GUID/IncomingWebhook/GUID/GUID" \
  -H "Content-Type: application/json" \
  -d '{"@type":"MessageCard","summary":"Test","themeColor":"0076D7","title":"Flagger Test","text":"Test message from Flagger"}'

# Check Flagger events
kubectl get events -n default --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'
```

## Migrating from Connectors to Workflows

Microsoft is deprecating Office 365 Connectors in favor of Power Automate Workflows. If you need to use the new Workflows-based webhooks:

1. Create a new Workflow in Power Automate with the "When a Teams webhook request is received" trigger
2. Add a "Post a message in a chat or channel" action
3. Copy the workflow HTTP POST URL
4. Update your Kubernetes secret with the new URL

The Flagger AlertProvider configuration remains the same regardless of which webhook type you use.

## Conclusion

You have configured Flagger to send canary deployment alerts to Microsoft Teams. With severity-based routing to different channels, your development and SRE teams can stay informed about deployment status in real time. This integration works seamlessly with Flux GitOps, ensuring that your alerting configuration is version-controlled and consistently applied across your Kubernetes clusters.

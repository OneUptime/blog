# How to Configure Flux Notification Provider for Slack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Slack, Monitoring

Description: Learn how to configure Flux CD's notification controller to send deployment and reconciliation alerts to Slack channels using the Provider resource.

---

Keeping your team informed about what is happening in your Kubernetes clusters is essential for operational visibility. Flux CD's notification controller allows you to route events from Flux resources directly to Slack, so your team can see deployments, failures, and reconciliation updates in real time.

This guide walks you through configuring a Flux notification Provider for Slack, creating the necessary secrets, setting up alerts, and verifying that messages flow correctly.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster with Flux CD installed (including the notification controller)
- `kubectl` access to the cluster
- A Slack workspace where you have permission to create incoming webhooks
- The `flux` CLI installed (optional but helpful for troubleshooting)

## Step 1: Create a Slack Incoming Webhook

Navigate to the Slack API portal at https://api.slack.com/apps and create a new app (or use an existing one). Under **Incoming Webhooks**, activate the feature and add a new webhook to the workspace. Select the channel where you want Flux notifications to appear. Copy the webhook URL -- you will need it in the next step.

The webhook URL will look something like:

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## Step 2: Create a Kubernetes Secret for the Webhook URL

Store the Slack webhook URL in a Kubernetes secret in the same namespace where Flux runs (typically `flux-system`).

```bash
# Create a secret containing the Slack webhook URL
kubectl create secret generic slack-webhook-url \
  --namespace=flux-system \
  --from-literal=address=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

This secret will be referenced by the Provider resource so that Flux can authenticate with Slack without exposing the webhook URL in plain text.

## Step 3: Create the Flux Notification Provider

Define a Provider resource that tells Flux how to send messages to Slack.

```yaml
# provider-slack.yaml
# Configures Flux to send notifications to a Slack channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  # The type field identifies the notification backend
  type: slack
  # Channel where messages will be posted (without the # prefix)
  channel: deployments
  # Reference to the secret containing the webhook URL
  secretRef:
    name: slack-webhook-url
```

Apply the Provider to your cluster:

```bash
# Apply the Slack provider configuration
kubectl apply -f provider-slack.yaml
```

## Step 4: Create an Alert Resource

The Provider on its own does not send anything. You need an Alert resource that selects which Flux events should be forwarded to the provider.

```yaml
# alert-slack.yaml
# Sends alerts for Kustomization and HelmRelease events to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: slack-alert
  namespace: flux-system
spec:
  # Reference to the provider created above
  providerRef:
    name: slack-provider
  # Filter events by severity (info, error)
  eventSeverity: info
  # Select which Flux resources trigger notifications
  eventSources:
    - kind: Kustomization
      name: "*"        # Watch all Kustomizations
    - kind: HelmRelease
      name: "*"        # Watch all HelmReleases
    - kind: GitRepository
      name: "*"        # Watch all GitRepositories
```

Apply the Alert:

```bash
# Apply the alert configuration
kubectl apply -f alert-slack.yaml
```

## Step 5: Verify the Configuration

Check that the Provider and Alert resources are ready.

```bash
# Verify the provider status
kubectl get providers.notification.toolkit.fluxcd.io -n flux-system

# Verify the alert status
kubectl get alerts.notification.toolkit.fluxcd.io -n flux-system
```

Both resources should show `Ready: True` in their status. You can also inspect details with:

```bash
# Describe the provider to see detailed status and any errors
kubectl describe provider slack-provider -n flux-system
```

## Step 6: Test the Notification

Trigger a reconciliation to generate an event that will be sent to Slack.

```bash
# Force a reconciliation on a Kustomization to generate a notification
flux reconcile kustomization flux-system --with-source
```

Within a few seconds, you should see a message appear in your configured Slack channel containing details about the reconciliation event.

## How It Works

The notification controller watches for events emitted by Flux resources (GitRepositories, Kustomizations, HelmReleases, and others). When an event matches the criteria defined in an Alert, the controller formats the event and sends it to the configured Provider endpoint.

The following diagram shows the flow:

```mermaid
graph LR
    A[Flux Source Controller] -->|emits event| B[Notification Controller]
    C[Flux Kustomize Controller] -->|emits event| B
    D[Flux Helm Controller] -->|emits event| B
    B -->|matches Alert rules| E[Provider: Slack]
    E -->|HTTP POST| F[Slack Channel]
```

## Customizing the Provider

You can further customize the Provider with additional fields:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider-custom
  namespace: flux-system
spec:
  type: slack
  channel: critical-alerts
  # Optional: set a custom username for the bot
  username: flux-bot
  secretRef:
    name: slack-webhook-url
```

## Filtering Events by Severity

If you only want to receive error notifications (and skip informational messages), set the severity filter in the Alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: slack-errors-only
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Only forward error events
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Troubleshooting

If notifications are not arriving in Slack, check the following:

1. **Secret format**: The secret must have an `address` key containing the full webhook URL.
2. **Namespace alignment**: The Provider, Alert, and Secret must all be in the same namespace.
3. **Notification controller logs**: Inspect the logs for errors with `kubectl logs -n flux-system deploy/notification-controller`.
4. **Webhook validity**: Make sure the Slack webhook URL has not been revoked or rotated.
5. **Channel name**: The `channel` field should not include the `#` prefix.

## Conclusion

Configuring Slack notifications for Flux CD gives your team immediate visibility into cluster operations. By combining Providers and Alerts, you can route different types of events to different Slack channels, ensuring that the right people see the right information at the right time. This setup takes only a few minutes and provides significant operational value for any team running Flux-managed Kubernetes workloads.

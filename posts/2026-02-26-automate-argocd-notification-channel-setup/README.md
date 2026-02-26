# Automate ArgoCD Notification Channel Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Automation

Description: Learn how to automate ArgoCD notification channel setup for Slack, email, webhooks, and other services using scripts and GitOps configuration management.

---

ArgoCD notifications keep your team informed about sync successes, failures, health degradations, and other critical events. Setting up notification channels manually through ConfigMap editing is tedious and error-prone, especially when you have multiple teams that each need their own channels and triggers. This guide shows you how to automate the entire notification channel setup process.

## How ArgoCD Notifications Work

ArgoCD notifications are configured through two resources:

- **argocd-notifications-cm** ConfigMap - contains services, templates, and triggers
- **argocd-notifications-secret** Secret - stores sensitive credentials like webhook URLs and API tokens

Applications opt into notifications via annotations on the Application resource.

## Automated Slack Channel Setup

Here is a script that configures Slack notifications for a team:

```bash
#!/bin/bash
# setup-slack-notifications.sh - Configure Slack notifications for ArgoCD
set -euo pipefail

TEAM_NAME="${1:?Usage: $0 <team-name> <slack-channel> <webhook-url>}"
SLACK_CHANNEL="${2:?Specify Slack channel (e.g., #team-deploys)}"
WEBHOOK_URL="${3:?Specify Slack webhook URL}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Setting up Slack notifications for team: ${TEAM_NAME}"

# Step 1: Store the webhook URL in the notifications secret
echo "Storing webhook URL in secret..."
kubectl patch secret argocd-notifications-secret -n "${NAMESPACE}" \
  --type merge -p "{
    \"stringData\": {
      \"slack-token-${TEAM_NAME}\": \"${WEBHOOK_URL}\"
    }
  }" 2>/dev/null || \
kubectl create secret generic argocd-notifications-secret -n "${NAMESPACE}" \
  --from-literal="slack-token-${TEAM_NAME}=${WEBHOOK_URL}"

# Step 2: Add the Slack service configuration
echo "Configuring Slack service..."
CURRENT_CM=$(kubectl get configmap argocd-notifications-cm -n "${NAMESPACE}" -o json 2>/dev/null || echo '{"data":{}}')

# Build the service configuration
SERVICE_KEY="service.slack.${TEAM_NAME}"
SERVICE_VALUE="token: \$slack-token-${TEAM_NAME}"

# Build notification template if it does not exist yet
TEMPLATE_KEY="template.${TEAM_NAME}-deploy-status"
TEMPLATE_VALUE="message: |
  Application {{.app.metadata.name}} sync status: {{.app.status.sync.status}}
  Health: {{.app.status.health.status}}
  Repository: {{.app.spec.source.repoURL}}
  Revision: {{.app.status.sync.revision}}
  {{if eq .app.status.operationState.phase \"Failed\"}}
  Error: {{.app.status.operationState.message}}
  {{end}}
slack:
  attachments: |
    [{
      \"title\": \"{{.app.metadata.name}}\",
      \"color\": \"{{if eq .app.status.sync.status \"Synced\"}}good{{else}}danger{{end}}\",
      \"fields\": [
        {\"title\": \"Sync Status\", \"value\": \"{{.app.status.sync.status}}\", \"short\": true},
        {\"title\": \"Health\", \"value\": \"{{.app.status.health.status}}\", \"short\": true},
        {\"title\": \"Project\", \"value\": \"{{.app.spec.project}}\", \"short\": true}
      ]
    }]"

# Build trigger configuration
TRIGGER_KEY="trigger.on-sync-${TEAM_NAME}"
TRIGGER_VALUE="- when: app.status.operationState.phase in ['Succeeded', 'Failed', 'Error']
  send: [${TEAM_NAME}-deploy-status]"

# Apply all configuration at once
kubectl patch configmap argocd-notifications-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"${SERVICE_KEY}\": \"${SERVICE_VALUE}\",
    \"${TEMPLATE_KEY}\": $(echo "${TEMPLATE_VALUE}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"${TRIGGER_KEY}\": $(echo "${TRIGGER_VALUE}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"

echo "Slack notifications configured for ${TEAM_NAME}"
echo ""
echo "To enable notifications on an application, add this annotation:"
echo "  notifications.argoproj.io/subscribe.on-sync-${TEAM_NAME}.slack.${TEAM_NAME}: ${SLACK_CHANNEL}"
```

## Batch Setup from Configuration File

For setting up notifications for multiple teams at once:

```bash
#!/bin/bash
# batch-setup-notifications.sh - Setup notifications for multiple teams
set -euo pipefail

CONFIG_FILE="${1:?Usage: $0 <notification-config.yaml>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Setting up notifications from ${CONFIG_FILE}"

# Process each team configuration
TEAM_COUNT=$(yq '.teams | length' "${CONFIG_FILE}")

for i in $(seq 0 $((TEAM_COUNT - 1))); do
  TEAM=$(yq ".teams[${i}].name" "${CONFIG_FILE}")
  TYPE=$(yq ".teams[${i}].type" "${CONFIG_FILE}")
  CHANNEL=$(yq ".teams[${i}].channel" "${CONFIG_FILE}")
  CREDENTIAL=$(yq ".teams[${i}].credential" "${CONFIG_FILE}")

  echo "---"
  echo "Configuring ${TYPE} notifications for team: ${TEAM}"

  case "${TYPE}" in
    slack)
      ./setup-slack-notifications.sh "${TEAM}" "${CHANNEL}" "${CREDENTIAL}"
      ;;
    webhook)
      ./setup-webhook-notifications.sh "${TEAM}" "${CREDENTIAL}"
      ;;
    email)
      ./setup-email-notifications.sh "${TEAM}" "${CHANNEL}"
      ;;
    *)
      echo "  WARNING: Unknown notification type '${TYPE}', skipping"
      ;;
  esac
done

echo ""
echo "All notification channels configured"
```

The configuration file:

```yaml
# notification-config.yaml
teams:
  - name: frontend
    type: slack
    channel: "#frontend-deploys"
    credential: "https://hooks.slack.com/services/T00/B00/xxx"
  - name: backend
    type: slack
    channel: "#backend-deploys"
    credential: "https://hooks.slack.com/services/T00/B00/yyy"
  - name: platform
    type: webhook
    channel: ""
    credential: "https://platform-alerts.example.com/argocd"
  - name: security
    type: email
    channel: "security@example.com"
    credential: ""
```

## Webhook Notification Setup

For custom integrations, webhooks are the most flexible option:

```bash
#!/bin/bash
# setup-webhook-notifications.sh - Configure webhook notifications
set -euo pipefail

TEAM_NAME="${1:?Usage: $0 <team-name> <webhook-url>}"
WEBHOOK_URL="${2:?Specify webhook URL}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Setting up webhook notifications for: ${TEAM_NAME}"

# Store webhook URL
kubectl patch secret argocd-notifications-secret -n "${NAMESPACE}" \
  --type merge -p "{
    \"stringData\": {
      \"webhook-url-${TEAM_NAME}\": \"${WEBHOOK_URL}\"
    }
  }"

# Configure webhook service and template
SERVICE_CONFIG="url: \$webhook-url-${TEAM_NAME}
headers:
  - name: Content-Type
    value: application/json"

TEMPLATE_CONFIG="webhook:
  ${TEAM_NAME}:
    method: POST
    body: |
      {
        \"app\": \"{{.app.metadata.name}}\",
        \"project\": \"{{.app.spec.project}}\",
        \"sync_status\": \"{{.app.status.sync.status}}\",
        \"health_status\": \"{{.app.status.health.status}}\",
        \"revision\": \"{{.app.status.sync.revision}}\",
        \"timestamp\": \"{{.app.status.operationState.finishedAt}}\"
      }"

kubectl patch configmap argocd-notifications-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"service.webhook.${TEAM_NAME}\": $(echo "${SERVICE_CONFIG}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"template.${TEAM_NAME}-webhook\": $(echo "${TEMPLATE_CONFIG}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"

echo "Webhook notifications configured for ${TEAM_NAME}"
```

## Annotating Applications Automatically

After setting up channels, applications need annotations to subscribe to notifications. Automate this too:

```bash
#!/bin/bash
# annotate-apps-notifications.sh - Subscribe applications to notifications
set -euo pipefail

PROJECT="${1:?Usage: $0 <project> <team-name> <channel>}"
TEAM_NAME="${2:?Specify team name}"
CHANNEL="${3:?Specify notification channel}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Subscribing ${PROJECT} applications to ${TEAM_NAME} notifications..."

# Find all applications in the project
APPS=$(argocd app list --project "${PROJECT}" -o name 2>/dev/null)

if [[ -z "${APPS}" ]]; then
  echo "No applications found in project ${PROJECT}"
  exit 0
fi

echo "${APPS}" | while read -r app_name; do
  echo "  Annotating: ${app_name}"
  kubectl annotate application "${app_name}" -n "${NAMESPACE}" \
    "notifications.argoproj.io/subscribe.on-sync-${TEAM_NAME}.slack.${TEAM_NAME}=${CHANNEL}" \
    --overwrite
done

echo "All applications in project ${PROJECT} subscribed to ${TEAM_NAME} notifications"
```

## GitOps-Native Notification Configuration

For the cleanest approach, manage notification configuration as Git-tracked manifests:

```yaml
# notifications/argocd-notifications-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Global Slack service
  service.slack: |
    token: $slack-token

  # Sync succeeded template
  template.sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} has been successfully synced.
    slack:
      attachments: |
        [{
          "color": "good",
          "title": "{{.app.metadata.name}} - Sync Succeeded",
          "fields": [
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 8}}", "short": true}
          ]
        }]

  # Sync failed template
  template.sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync has FAILED.
      Error: {{.app.status.operationState.message}}
    slack:
      attachments: |
        [{
          "color": "danger",
          "title": "{{.app.metadata.name}} - Sync Failed",
          "fields": [
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true},
            {"title": "Error", "value": "{{.app.status.operationState.message}}", "short": false}
          ]
        }]

  # Health degraded template
  template.health-degraded: |
    message: |
      Application {{.app.metadata.name}} health has degraded.
    slack:
      attachments: |
        [{
          "color": "warning",
          "title": "{{.app.metadata.name}} - Health Degraded",
          "fields": [
            {"title": "Health", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true}
          ]
        }]

  # Triggers
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [sync-succeeded]
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [sync-failed]
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [health-degraded]
```

Let ArgoCD manage this ConfigMap through an Application that points to your platform configuration repository. This way, any notification configuration change goes through a pull request review.

## Summary

Automating ArgoCD notification channel setup removes a common operational bottleneck and ensures consistent notification configuration across teams. Whether you use imperative scripts for quick setup or GitOps-native manifests for full auditability, the goal is the same - every team gets the right notifications for the right events without manual intervention. For more comprehensive alerting beyond ArgoCD events, consider integrating with [OneUptime](https://oneuptime.com) for unified incident management across your entire infrastructure.

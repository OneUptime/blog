# Understanding ArgoCD argocd-notifications-secret Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Security

Description: A detailed guide to the ArgoCD argocd-notifications-secret, covering what credentials to store, how they are referenced, and best practices for managing notification service secrets.

---

The `argocd-notifications-secret` Kubernetes Secret stores sensitive credentials used by the ArgoCD notification system. While the `argocd-notifications-cm` ConfigMap defines services, templates, and triggers, it references credentials in this Secret using the `$variable-name` syntax. This guide explains what goes into this Secret, how it is referenced, and how to manage it securely.

## How the Secret Works

The notification system uses a simple variable substitution mechanism. Any value in the `argocd-notifications-cm` ConfigMap prefixed with `$` is looked up in the `argocd-notifications-secret`.

For example, in the ConfigMap:

```yaml
# argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
```

ArgoCD replaces `$slack-token` with the value of the `slack-token` key from the Secret:

```yaml
# argocd-notifications-secret
stringData:
  slack-token: "xoxb-123456789-abcdefghijklmnop"
```

## Common Secret Keys

Here is a reference of common keys stored in the notifications secret, organized by service type.

### Slack Credentials

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  # Bot token for Slack API
  slack-token: "xoxb-your-bot-token-here"

  # Optional: Signing secret for verifying Slack requests
  slack-signing-secret: "your-signing-secret"

  # Multiple workspace tokens
  slack-token-workspace-a: "xoxb-workspace-a-token"
  slack-token-workspace-b: "xoxb-workspace-b-token"
```

Referenced in argocd-notifications-cm:

```yaml
data:
  service.slack: |
    token: $slack-token
    signingSecret: $slack-signing-secret

  service.slack.workspace-b: |
    token: $slack-token-workspace-b
```

### Email Credentials

```yaml
stringData:
  email-username: "argocd-notifications@example.com"
  email-password: "app-specific-password-here"
```

Referenced as:

```yaml
data:
  service.email: |
    host: smtp.gmail.com
    port: 465
    from: argocd-notifications@example.com
    username: $email-username
    password: $email-password
```

### Webhook Secrets

```yaml
stringData:
  # Custom webhook authentication tokens
  webhook-token: "Bearer abc123def456"
  webhook-api-key: "sk-webhook-key-here"

  # Team-specific webhook URLs
  webhook-url-frontend: "https://hooks.example.com/frontend"
  webhook-url-backend: "https://hooks.example.com/backend"
```

### Microsoft Teams

```yaml
stringData:
  teams-webhook-url: "https://outlook.office.com/webhook/abc123..."
  teams-channel-ops: "https://outlook.office.com/webhook/def456..."
```

### PagerDuty

```yaml
stringData:
  pagerduty-service-key: "your-pagerduty-integration-key"
  pagerduty-service-key-critical: "another-integration-key"
```

### Opsgenie

```yaml
stringData:
  opsgenie-api-key: "your-opsgenie-api-key"
```

### Telegram

```yaml
stringData:
  telegram-token: "bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
```

### GitHub App

```yaml
stringData:
  github-app-private-key: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

### Grafana

```yaml
stringData:
  grafana-api-key: "eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWm..."
```

## Creating the Secret

### From the Command Line

```bash
# Create the secret with multiple keys
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token="xoxb-your-token" \
  --from-literal=email-password="your-password" \
  --from-literal=webhook-token="your-webhook-token"
```

### From a YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  slack-token: "xoxb-your-bot-token"
  email-username: "argocd@example.com"
  email-password: "smtp-password"
  webhook-token: "bearer-token-value"
  pagerduty-service-key: "pd-integration-key"
  teams-webhook-url: "https://outlook.office.com/webhook/..."
```

## Adding Keys to an Existing Secret

To add or update a single key without replacing the entire Secret:

```bash
# Add a new key
kubectl patch secret argocd-notifications-secret -n argocd --type merge -p '{
  "stringData": {
    "new-webhook-token": "new-token-value"
  }
}'

# Update an existing key
kubectl patch secret argocd-notifications-secret -n argocd --type merge -p '{
  "stringData": {
    "slack-token": "xoxb-new-token-value"
  }
}'
```

## Using External Secret Managers

For production environments, consider using an external secret manager instead of managing the Secret directly.

### With External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: argocd-notifications-secret
    creationPolicy: Owner
  data:
    - secretKey: slack-token
      remoteRef:
        key: argocd/notifications
        property: slack-token
    - secretKey: email-password
      remoteRef:
        key: argocd/notifications
        property: email-password
    - secretKey: pagerduty-service-key
      remoteRef:
        key: argocd/notifications
        property: pagerduty-key
```

### With Sealed Secrets

```bash
# Create a sealed secret
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token="xoxb-token" \
  --dry-run=client -o yaml | \
  kubeseal --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  --format=yaml > sealed-notifications-secret.yaml
```

## Validating the Secret

Check that all referenced variables exist in the Secret:

```bash
#!/bin/bash
# validate-notification-secrets.sh
NAMESPACE="argocd"

# Extract all $variable references from the notifications ConfigMap
REFERENCED_VARS=$(kubectl get configmap argocd-notifications-cm -n "${NAMESPACE}" -o json | \
  jq -r '.data | to_entries[] | .value' | \
  grep -oP '\$[\w-]+' | \
  sed 's/\$//' | \
  sort -u)

# Check each variable exists in the Secret
SECRET_KEYS=$(kubectl get secret argocd-notifications-secret -n "${NAMESPACE}" -o json | \
  jq -r '.data | keys[]')

echo "Checking notification secret variables..."
MISSING=0
for var in ${REFERENCED_VARS}; do
  if echo "${SECRET_KEYS}" | grep -q "^${var}$"; then
    echo "  OK: ${var}"
  else
    echo "  MISSING: ${var}"
    MISSING=$((MISSING + 1))
  fi
done

if [[ ${MISSING} -gt 0 ]]; then
  echo ""
  echo "WARNING: ${MISSING} referenced variables are missing from the secret"
  exit 1
fi

echo ""
echo "All referenced variables are present"
```

## Credential Rotation

Rotate notification credentials regularly:

```bash
#!/bin/bash
# rotate-notification-creds.sh
NAMESPACE="argocd"

echo "Rotating notification credentials..."

# Rotate Slack token (after generating new token in Slack admin)
read -sp "New Slack token: " NEW_SLACK_TOKEN
echo

kubectl patch secret argocd-notifications-secret -n "${NAMESPACE}" --type merge -p "{
  \"stringData\": {
    \"slack-token\": \"${NEW_SLACK_TOKEN}\"
  }
}"

# Restart notifications controller to pick up changes
kubectl rollout restart deployment argocd-notifications-controller -n "${NAMESPACE}"

# Test by sending a test notification
echo "Testing notification delivery..."
sleep 10
argocd admin notifications template notify app-sync-succeeded test-app \
  --recipient slack:test-channel 2>/dev/null && echo "Test notification sent" || echo "Test failed"
```

## Troubleshooting

When notifications are not working, check the secret first:

```bash
# Check if the secret exists
kubectl get secret argocd-notifications-secret -n argocd

# List all keys (not values)
kubectl get secret argocd-notifications-secret -n argocd -o json | jq '.data | keys'

# Check notification controller logs for credential errors
kubectl logs -n argocd deployment/argocd-notifications-controller | grep -i "error\|fail\|secret"
```

Common issues:

- **Missing key**: The ConfigMap references `$slack-token` but the Secret does not have a `slack-token` key
- **Wrong encoding**: Using `data` instead of `stringData` and forgetting to base64-encode
- **Stale credentials**: Token was rotated in the provider but not updated in the Secret
- **Controller not restarted**: After changing the Secret, the controller may need a restart

## Summary

The `argocd-notifications-secret` is the credential vault for ArgoCD's notification system. Every service token, API key, and webhook secret lives here, referenced by the notification ConfigMap through the `$variable` syntax. Keep this Secret secure using external secret managers or sealed secrets for production, rotate credentials regularly, and validate that all referenced variables exist. For comprehensive notification management including incident response, consider pairing ArgoCD notifications with [OneUptime](https://oneuptime.com) for end-to-end alerting and on-call management.

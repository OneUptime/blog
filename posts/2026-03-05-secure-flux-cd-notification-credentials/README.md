# How to Secure Flux CD Notification Provider Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Notifications, Secrets Management

Description: Learn how to securely manage credentials for Flux CD notification providers such as Slack, Microsoft Teams, PagerDuty, and webhook endpoints.

---

Flux CD notification providers send alerts to external services when reconciliation events occur. These providers require credentials such as webhook URLs, API tokens, and OAuth tokens. Properly securing these credentials is essential to prevent unauthorized access to your notification channels. This guide covers best practices for securing Flux CD notification provider credentials.

## Types of Notification Provider Credentials

Flux notification providers use different credential types:

- **Slack**: Webhook URL or Bot OAuth token
- **Microsoft Teams**: Webhook URL
- **PagerDuty**: Routing key
- **Generic webhooks**: URL with optional auth headers
- **GitHub**: Personal access token or App installation token
- **Grafana**: API key

## Step 1: Create Secrets for Notification Providers

Store provider credentials in Kubernetes Secrets:

```yaml
# notification-secrets.yaml
# Slack webhook URL secret
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
type: Opaque
stringData:
  address: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
---
# PagerDuty routing key secret
apiVersion: v1
kind: Secret
metadata:
  name: pagerduty-routing-key
  namespace: flux-system
type: Opaque
stringData:
  token: "your-pagerduty-routing-key"
---
# Generic webhook with auth header
apiVersion: v1
kind: Secret
metadata:
  name: webhook-auth
  namespace: flux-system
type: Opaque
stringData:
  address: "https://webhook.example.com/flux-events"
  headers: |
    Authorization: Bearer your-auth-token
```

Create the secrets using kubectl instead of storing them in Git:

```bash
# Create Slack webhook secret
kubectl create secret generic slack-webhook-url \
  --from-literal=address="https://hooks.slack.com/services/T00000000/B00000000/XXXX" \
  -n flux-system

# Create PagerDuty secret
kubectl create secret generic pagerduty-routing-key \
  --from-literal=token="your-pagerduty-routing-key" \
  -n flux-system

# Create GitHub token secret for commit status notifications
kubectl create secret generic github-token \
  --from-literal=token="ghp_your_github_token" \
  -n flux-system
```

## Step 2: Configure Notification Providers

Reference the secrets in Flux Provider resources:

```yaml
# providers.yaml
# Slack notification provider
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: gitops-alerts
  secretRef:
    name: slack-webhook-url
---
# PagerDuty notification provider
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: pagerduty
  namespace: flux-system
spec:
  type: pagerduty
  channel: "your-pagerduty-service-id"
  secretRef:
    name: pagerduty-routing-key
---
# GitHub commit status provider
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/myorg/fleet-repo
  secretRef:
    name: github-token
```

## Step 3: Use SOPS to Encrypt Notification Secrets in Git

If you want to store notification secrets in Git, encrypt them with SOPS:

```bash
# Create a SOPS configuration
cat > .sops.yaml << 'EOF'
creation_rules:
  - path_regex: .*notification-secrets.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
EOF

# Encrypt the notification secrets file
sops --encrypt notification-secrets.yaml > notification-secrets.enc.yaml
```

Configure Flux to decrypt SOPS-encrypted secrets:

```yaml
# kustomization-notifications.yaml
# Flux Kustomization with SOPS decryption for notification secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: notification-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./notifications
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Step 4: Use External Secrets Operator

For production environments, use External Secrets Operator to sync credentials from a vault:

```yaml
# external-secret-slack.yaml
# Sync Slack webhook URL from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: slack-webhook-url
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: slack-webhook-url
    creationPolicy: Owner
  data:
    - secretKey: address
      remoteRef:
        key: flux/notifications/slack
        property: webhook_url
---
# Sync PagerDuty routing key from HashiCorp Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: pagerduty-routing-key
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: pagerduty-routing-key
    creationPolicy: Owner
  data:
    - secretKey: token
      remoteRef:
        key: secret/flux/pagerduty
        property: routing_key
```

## Step 5: Restrict Access to Notification Secrets

Use RBAC to limit who can read notification secrets:

```yaml
# rbac-notification-secrets.yaml
# Role restricting access to notification provider secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: notification-secrets-reader
  namespace: flux-system
rules:
  # Only notification-controller should read these secrets
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["slack-webhook-url", "pagerduty-routing-key", "github-token", "webhook-auth"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: notification-controller-secrets
  namespace: flux-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: notification-secrets-reader
subjects:
  - kind: ServiceAccount
    name: notification-controller
    namespace: flux-system
```

## Step 6: Rotate Notification Credentials

Establish a rotation procedure for notification credentials:

```bash
#!/bin/bash
# rotate-notification-credentials.sh
# Rotate Slack webhook URL

# Step 1: Create a new Slack webhook in the Slack App settings
# Step 2: Update the Kubernetes secret
kubectl create secret generic slack-webhook-url \
  --from-literal=address="https://hooks.slack.com/services/T00000000/B00000000/NEW_TOKEN" \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Restart notification-controller to pick up the change
kubectl rollout restart deployment notification-controller -n flux-system

# Step 4: Test by triggering a reconciliation
flux reconcile kustomization flux-system

# Step 5: Verify alerts are working
kubectl logs -n flux-system deployment/notification-controller --tail=10

# Step 6: Revoke the old Slack webhook URL in Slack settings
```

## Best Practices

1. **Never store credentials in Git as plaintext**: Use SOPS encryption or External Secrets Operator.
2. **Use minimal token scopes**: Grant notification tokens only the permissions they need.
3. **Rotate credentials regularly**: Set up periodic rotation for all notification provider credentials.
4. **Restrict secret access with RBAC**: Limit which service accounts can read notification secrets.
5. **Use separate credentials per environment**: Do not share notification credentials between production and staging.
6. **Monitor for credential exposure**: Set up alerts for unauthorized access to notification secrets using audit logs.

Securing notification provider credentials prevents unauthorized access to your communication channels and ensures that your GitOps alerting pipeline remains trustworthy.

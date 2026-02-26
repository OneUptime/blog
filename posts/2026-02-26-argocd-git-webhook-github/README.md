# How to Configure Git Webhook for GitHub in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, Webhooks

Description: Step-by-step guide to configuring GitHub webhooks for ArgoCD to trigger immediate reconciliation when code is pushed to your repositories.

---

Setting up a GitHub webhook for ArgoCD is one of the first things you should do after installing ArgoCD. Without it, ArgoCD polls your repositories every 3 minutes, which means changes take up to 3 minutes to be detected. With a webhook, ArgoCD knows about changes within seconds of a push. This guide walks through the complete setup process, including security configuration, testing, and troubleshooting.

## Prerequisites

Before starting, ensure:

- ArgoCD is installed and accessible
- The ArgoCD API server is reachable from the internet (or from GitHub's webhook IPs)
- You have admin access to the GitHub repository or organization
- You know your ArgoCD server URL

## Step 1: Generate a Webhook Secret

Create a secure shared secret that GitHub and ArgoCD will use to verify webhook payloads:

```bash
# Generate a random 32-character hex secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Save this secret: $WEBHOOK_SECRET"
```

## Step 2: Configure the Secret in ArgoCD

Add the webhook secret to ArgoCD's secret store:

```bash
# Patch the argocd-secret with the webhook secret
kubectl patch secret argocd-secret -n argocd --type merge -p "{
  \"stringData\": {
    \"webhook.github.secret\": \"$WEBHOOK_SECRET\"
  }
}"
```

Or declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  webhook.github.secret: "your-generated-secret-here"
  # Keep existing secrets - do not overwrite them
```

## Step 3: Configure the Webhook in GitHub

### For a Single Repository

1. Go to your GitHub repository
2. Navigate to Settings > Webhooks > Add webhook
3. Configure the webhook with these settings:

```
Payload URL: https://argocd.example.com/api/webhook
Content type: application/json
Secret: <your-generated-secret>
SSL verification: Enable SSL verification
```

Select which events to trigger the webhook:

```
Events: Just the push event
```

You can also select additional events if needed:

```
- Push events (required)
- Pull request events (optional - useful for preview environments)
```

### For an Entire GitHub Organization

If you have many repos that ArgoCD manages, configure an organization-level webhook:

1. Go to your GitHub organization settings
2. Navigate to Webhooks > Add webhook
3. Use the same configuration as above

Organization webhooks fire for all repositories in the organization, so ArgoCD will receive notifications for every push across all repos.

### Using the GitHub CLI

```bash
# Create webhook for a single repo using gh CLI
gh api repos/org/repo/hooks -X POST -f "name=web" \
  -f "config[url]=https://argocd.example.com/api/webhook" \
  -f "config[content_type]=json" \
  -f "config[secret]=$WEBHOOK_SECRET" \
  -f "events[]=push" \
  -f "active=true"

# Create webhook for an organization
gh api orgs/my-org/hooks -X POST -f "name=web" \
  -f "config[url]=https://argocd.example.com/api/webhook" \
  -f "config[content_type]=json" \
  -f "config[secret]=$WEBHOOK_SECRET" \
  -f "events[]=push" \
  -f "active=true"
```

## Step 4: Verify the Webhook Works

Push a commit to your repository and check if ArgoCD receives the webhook:

```bash
# Watch ArgoCD API server logs for webhook events
kubectl logs -n argocd deployment/argocd-server -f | grep -i "webhook\|received"
```

You should see log entries like:

```
level=info msg="Received push event repo: https://github.com/org/repo, revision: abc1234, ref: refs/heads/main"
```

Also check the webhook delivery status in GitHub:

1. Go to your repo/org Settings > Webhooks
2. Click on the webhook
3. Scroll down to "Recent Deliveries"
4. Look for a green checkmark (200 response)

## Step 5: Test with a Manual Delivery

GitHub lets you redeliver webhooks for testing:

```bash
# List recent webhook deliveries
gh api repos/org/repo/hooks/HOOK_ID/deliveries

# Redeliver a specific webhook
gh api repos/org/repo/hooks/HOOK_ID/deliveries/DELIVERY_ID/attempts -X POST
```

Or use curl to simulate a webhook:

```bash
# Create a test payload
PAYLOAD='{"ref":"refs/heads/main","repository":{"clone_url":"https://github.com/org/repo.git","html_url":"https://github.com/org/repo","full_name":"org/repo"},"head_commit":{"id":"abc123"}}'

# Calculate the signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)"

# Send the test webhook
curl -X POST https://argocd.example.com/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Handling GitHub Enterprise

For GitHub Enterprise Server, the webhook configuration is identical but you need to ensure network connectivity between your GitHub Enterprise instance and ArgoCD.

```yaml
# If GitHub Enterprise uses a custom CA certificate
# Add it to ArgoCD's trusted certificates
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  github-enterprise.example.com: |
    -----BEGIN CERTIFICATE-----
    ...your CA certificate...
    -----END CERTIFICATE-----
```

## Handling Multiple GitHub Accounts

If you have repositories across multiple GitHub accounts or organizations, use the same webhook secret for all of them. ArgoCD uses a single `webhook.github.secret` value.

If you need different secrets per organization, you will need to use a webhook proxy:

```yaml
# Example: Using a simple nginx proxy to route webhooks
apiVersion: v1
kind: ConfigMap
metadata:
  name: webhook-proxy-config
data:
  nginx.conf: |
    server {
      listen 8080;
      location /api/webhook {
        proxy_pass https://argocd-server.argocd.svc.cluster.local/api/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
      }
    }
```

## Optimizing After Webhook Setup

Once webhooks are working reliably, increase the polling interval:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase from default 180s to 600s
  # Webhooks handle immediate detection
  timeout.reconciliation: "600"
```

## Securing the Webhook Endpoint

### IP Allowlisting

GitHub publishes its webhook IP ranges. Restrict access to the ArgoCD webhook endpoint to only these IPs:

```bash
# Get GitHub's current webhook IPs
curl -s https://api.github.com/meta | jq '.hooks'
```

Configure your ingress or firewall:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-webhook
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/whitelist-source-range: "140.82.112.0/20,185.199.108.0/22,192.30.252.0/22"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /api/webhook
            pathType: Exact
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

### Rate Limiting

Protect against webhook flooding:

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-rps: "10"
  nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
```

## Troubleshooting Common Issues

### Error: 404 Not Found

The ArgoCD API server is not receiving requests on the webhook path:

```bash
# Verify the ArgoCD server is running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check if the webhook endpoint is accessible
curl -I https://argocd.example.com/api/webhook
# Should return 405 Method Not Allowed (because we're using GET, not POST)
```

### Error: 403 Forbidden

The webhook secret does not match:

```bash
# Verify the secret in ArgoCD
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.github\.secret}' | base64 -d

# Compare with what is configured in GitHub
```

### Error: Connection Timeout

ArgoCD is not reachable from GitHub:

```bash
# Check if your ingress is working
kubectl get ingress -n argocd

# Check if the ArgoCD service is accessible
kubectl port-forward svc/argocd-server -n argocd 8443:443
curl -k https://localhost:8443/api/webhook
```

### Webhook Received but App Not Refreshed

ArgoCD received the webhook but could not match it to an application. Check that the repository URL matches exactly:

```bash
# Check the repo URL ArgoCD has
argocd app get my-app -o json | jq '.spec.source.repoURL'

# GitHub sends the URL as clone_url, which typically includes .git
# Make sure they match or both formats are registered
```

For comprehensive monitoring of your webhook delivery and ArgoCD sync performance, [OneUptime](https://oneuptime.com) provides end-to-end visibility from Git push to deployment completion.

## Key Takeaways

- GitHub webhooks reduce change detection from 3 minutes to seconds
- Always use a webhook secret for payload verification
- The webhook URL is `https://your-argocd-server/api/webhook`
- Select only the "push" event for basic operation
- Use organization-level webhooks if you manage many repositories
- Increase the polling interval after confirming webhooks are reliable
- Restrict webhook endpoint access to GitHub's published IP ranges
- Check GitHub's Recent Deliveries page for troubleshooting

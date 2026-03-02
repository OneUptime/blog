# How to Configure Git Webhook for GitLab in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitLab, Webhook

Description: Step-by-step guide to setting up GitLab webhooks for ArgoCD to trigger instant reconciliation when commits are pushed to your GitLab repositories.

---

If you are using GitLab as your Git provider with ArgoCD, setting up webhooks is essential for fast change detection. Without webhooks, ArgoCD relies on polling every 3 minutes, which adds unnecessary delay to your deployment pipeline. GitLab webhooks notify ArgoCD immediately when code is pushed, cutting detection time from minutes to seconds. This guide covers the complete setup for both GitLab.com and self-hosted GitLab instances.

## Prerequisites

Before starting, you need:

- ArgoCD installed and running in your cluster
- The ArgoCD API server accessible from your GitLab instance
- Admin or Maintainer access to the GitLab project or group
- ArgoCD server URL (e.g., `https://argocd.example.com`)

## Step 1: Generate a Webhook Secret

Create a shared secret for webhook payload verification:

```bash
# Generate a secure random secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Your webhook secret: $WEBHOOK_SECRET"
```

## Step 2: Configure the Secret in ArgoCD

ArgoCD uses a dedicated key for GitLab webhook secrets:

```bash
# Patch the ArgoCD secret
kubectl patch secret argocd-secret -n argocd --type merge -p "{
  \"stringData\": {
    \"webhook.gitlab.secret\": \"$WEBHOOK_SECRET\"
  }
}"
```

Or apply it declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  webhook.gitlab.secret: "your-generated-secret-here"
```

After applying, restart the ArgoCD API server:

```bash
kubectl rollout restart deployment argocd-server -n argocd
```

## Step 3: Configure the Webhook in GitLab

### For a Single Project

1. Navigate to your GitLab project
2. Go to Settings > Webhooks
3. Fill in the webhook form:

```
URL: https://argocd.example.com/api/webhook
Secret token: <your-generated-secret>
Trigger: Push events
SSL verification: Enable SSL verification
```

Click "Add webhook" to save.

### For a GitLab Group

To receive webhooks from all projects in a group:

1. Navigate to your GitLab group
2. Go to Settings > Webhooks
3. Use the same configuration as above

Group-level webhooks fire for all projects within the group and any subgroups.

### Using the GitLab API

```bash
# Create webhook for a single project
curl -X POST "https://gitlab.com/api/v4/projects/PROJECT_ID/hooks" \
  -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"push_events\": true,
    \"tag_push_events\": true,
    \"token\": \"$WEBHOOK_SECRET\",
    \"enable_ssl_verification\": true
  }"

# Create webhook for a group
curl -X POST "https://gitlab.com/api/v4/groups/GROUP_ID/hooks" \
  -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"push_events\": true,
    \"tag_push_events\": true,
    \"token\": \"$WEBHOOK_SECRET\",
    \"enable_ssl_verification\": true
  }"
```

## Step 4: Verify Webhook Delivery

Push a commit to your repository and check both sides:

### Check ArgoCD Logs

```bash
# Watch the ArgoCD API server logs
kubectl logs -n argocd deployment/argocd-server -f | grep -i "webhook\|gitlab\|received"
```

You should see:

```
level=info msg="Received push event repo: https://gitlab.com/org/repo, revision: abc1234, ref: refs/heads/main"
```

### Check GitLab Delivery Status

1. Go to your project's Settings > Webhooks
2. Scroll to the configured webhook
3. Click "Edit"
4. Scroll down to "Recent events"
5. Look for a successful delivery (HTTP 200)

### Test with GitLab's Test Feature

GitLab provides a built-in test button:

1. Go to Settings > Webhooks
2. Find your webhook and click "Test"
3. Select "Push events"
4. Check the response

## Handling GitLab Self-Hosted Instances

For self-hosted GitLab instances, additional configuration may be needed.

### Network Connectivity

Ensure your GitLab instance can reach the ArgoCD API server:

```bash
# From the GitLab server, test connectivity
curl -v https://argocd.example.com/api/webhook
```

### Custom TLS Certificates

If your ArgoCD instance uses a self-signed or internal CA certificate:

```yaml
# GitLab allows you to skip SSL verification per webhook
# But it is better to add your CA to GitLab's trust store

# In gitlab.rb (Omnibus GitLab):
# gitlab_rails['webhooks_ssl_verify'] = true

# Add your CA to the system trust store on the GitLab server
```

On the ArgoCD side, if GitLab uses custom certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  gitlab.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    ...your GitLab CA certificate...
    -----END CERTIFICATE-----
```

### GitLab Behind a Reverse Proxy

If GitLab is behind a reverse proxy, ensure the `X-Forwarded-For` and `X-Forwarded-Proto` headers are passed through, and that the proxy does not modify the webhook payload.

## Handling GitLab Subgroups

GitLab subgroups inherit group-level webhooks. If you have a structure like:

```
org/
  platform/
    service-a/
    service-b/
  applications/
    app-x/
    app-y/
```

A webhook configured on the `org` group will fire for pushes to all four projects. However, if you only want webhooks for the `platform` subgroup, configure the webhook at that level instead.

## GitLab-Specific Webhook Events

ArgoCD primarily needs push events, but you can configure additional events:

```bash
# Useful events for ArgoCD
# push_events: true       - Required for branch updates
# tag_push_events: true   - Required if tracking Git tags
# merge_requests_events: false - Not used by ArgoCD
# pipeline_events: false   - Not used by ArgoCD
```

If you are tracking Git tags in your ArgoCD applications, make sure tag push events are enabled:

```yaml
# Application tracking a tag
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://gitlab.com/org/repo
    targetRevision: v1.2.3  # Git tag
    path: manifests/
```

## Optimizing After Setup

Once GitLab webhooks are confirmed working, increase the polling interval:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "600"  # 10 minutes
```

## Handling Multiple GitLab Instances

If you manage repositories across multiple GitLab instances (e.g., gitlab.com and a self-hosted instance), ArgoCD uses the same webhook secret for all GitLab webhooks. This means:

- All GitLab instances must use the same webhook secret
- Or you need a webhook proxy that translates secrets

```yaml
# Both instances use the same secret
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
stringData:
  webhook.gitlab.secret: "shared-secret-for-all-gitlab-instances"
```

## Troubleshooting

### Webhook Returns 400 Bad Request

The most common cause is a secret token mismatch:

```bash
# Verify the secret in ArgoCD
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.gitlab\.secret}' | base64 -d

# Compare with GitLab webhook configuration
```

### Webhook Returns 404

The ArgoCD API server path might be wrong:

```bash
# The correct URL is /api/webhook (not /webhook or /api/v1/webhook)
# Verify the endpoint is accessible
curl -X POST https://argocd.example.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 (bad request) not 404
```

### Application Not Refreshed After Webhook

Check the repository URL matching:

```bash
# GitLab sends the repository URL in the webhook payload
# It must match what ArgoCD has configured
argocd repo list | grep gitlab

# Common mismatch: HTTP vs SSH
# ArgoCD app uses: git@gitlab.com:org/repo.git
# Webhook sends:   https://gitlab.com/org/repo.git
```

ArgoCD normalizes URLs, but in some cases the normalization misses edge cases. Check the ArgoCD server logs for the exact URL it receives:

```bash
kubectl logs -n argocd deployment/argocd-server | grep "Received push" | tail -5
```

### GitLab Self-Hosted: Webhook Blocked by Allowlist

GitLab self-hosted instances may have an allowlist for webhook URLs. Check:

1. Admin Area > Settings > Network > Outbound requests
2. Ensure "Allow requests to the local network from webhooks" is enabled (if ArgoCD is on the same network)
3. Add your ArgoCD URL to the allowlist if needed

For monitoring the health of your webhook delivery pipeline and ArgoCD sync performance, [OneUptime](https://oneuptime.com) provides observability across your entire GitOps workflow.

## Key Takeaways

- Configure the webhook secret in both ArgoCD (`webhook.gitlab.secret`) and GitLab
- Use project-level webhooks for specific repos or group-level for entire groups
- Enable push events at minimum, plus tag push events if you track tags
- Test webhooks using GitLab's built-in test feature
- Increase polling interval to 600s after confirming webhooks work
- For self-hosted GitLab, verify network connectivity and TLS trust
- Check URL matching if webhooks are received but applications are not refreshed

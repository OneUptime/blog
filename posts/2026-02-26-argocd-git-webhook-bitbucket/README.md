# How to Configure Git Webhook for Bitbucket in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Bitbucket, Webhook

Description: Step-by-step guide to configuring Bitbucket Cloud and Bitbucket Server webhooks for ArgoCD to enable instant change detection on code push events.

---

Bitbucket comes in two flavors - Bitbucket Cloud (bitbucket.org) and Bitbucket Server (self-hosted, also known as Bitbucket Data Center). Each has a different webhook configuration process and uses different authentication mechanisms with ArgoCD. This guide covers both variants so you can set up instant change detection regardless of which Bitbucket version you use.

## Bitbucket Cloud vs Bitbucket Server Webhooks

The key difference is how webhook secrets work:

- **Bitbucket Cloud** uses a UUID-based identifier instead of a shared secret for webhook verification
- **Bitbucket Server** uses a shared secret similar to GitHub and GitLab

ArgoCD handles both, but the configuration in `argocd-secret` uses different keys for each.

## Part 1: Bitbucket Cloud Setup

### Step 1: Generate a UUID for Bitbucket Cloud

Bitbucket Cloud identifies webhooks by UUID rather than a shared secret:

```bash
# Generate a UUID for Bitbucket Cloud webhook identification
BITBUCKET_UUID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
echo "Your Bitbucket UUID: $BITBUCKET_UUID"
```

### Step 2: Configure ArgoCD Secret for Bitbucket Cloud

```bash
# Patch the ArgoCD secret with the Bitbucket UUID
kubectl patch secret argocd-secret -n argocd --type merge -p "{
  \"stringData\": {
    \"webhook.bitbucket.uuid\": \"$BITBUCKET_UUID\"
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
  webhook.bitbucket.uuid: "your-generated-uuid"
```

### Step 3: Create the Webhook in Bitbucket Cloud

1. Navigate to your Bitbucket repository
2. Go to Repository settings > Webhooks > Add webhook
3. Configure:

```
Title: ArgoCD Webhook
URL: https://argocd.example.com/api/webhook
Status: Active
Triggers: Repository push
```

For Bitbucket Cloud, select these triggers:
- **Repository push** - fires on push events to any branch

You can also use the Bitbucket API:

```bash
# Create webhook using Bitbucket Cloud API
curl -X POST "https://api.bitbucket.org/2.0/repositories/WORKSPACE/REPO/hooks" \
  -u "username:app_password" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"ArgoCD Webhook\",
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"active\": true,
    \"events\": [\"repo:push\"]
  }"
```

### Step 4: Verify Bitbucket Cloud Webhook

```bash
# Check ArgoCD server logs for incoming webhooks
kubectl logs -n argocd deployment/argocd-server -f | grep -i "bitbucket\|webhook\|received"

# Push a commit and watch for:
# "Received push event repo: https://bitbucket.org/workspace/repo"
```

In Bitbucket Cloud, check webhook delivery:
1. Repository settings > Webhooks
2. Click "View requests" next to your webhook
3. Look for 200 status codes

## Part 2: Bitbucket Server (Data Center) Setup

### Step 1: Generate a Webhook Secret

```bash
# Generate a shared secret for Bitbucket Server
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Your webhook secret: $WEBHOOK_SECRET"
```

### Step 2: Configure ArgoCD Secret for Bitbucket Server

```bash
# Patch the ArgoCD secret with the Bitbucket Server secret
kubectl patch secret argocd-secret -n argocd --type merge -p "{
  \"stringData\": {
    \"webhook.bitbucketserver.secret\": \"$WEBHOOK_SECRET\"
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
  webhook.bitbucketserver.secret: "your-generated-secret"
```

### Step 3: Create the Webhook in Bitbucket Server

1. Navigate to your Bitbucket Server repository
2. Go to Repository settings > Webhooks > Create webhook
3. Configure:

```
Name: ArgoCD Webhook
URL: https://argocd.example.com/api/webhook
Secret: <your-generated-secret>
Events: Repository > Push
```

Using the Bitbucket Server API:

```bash
# Create webhook using Bitbucket Server REST API
curl -X POST "https://bitbucket-server.example.com/rest/api/1.0/projects/PROJECT/repos/REPO/webhooks" \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"ArgoCD Webhook\",
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"active\": true,
    \"events\": [\"repo:refs_changed\"],
    \"configuration\": {
      \"secret\": \"$WEBHOOK_SECRET\"
    }
  }"
```

### Step 4: Verify Bitbucket Server Webhook

```bash
# Watch ArgoCD logs
kubectl logs -n argocd deployment/argocd-server -f | grep -i webhook

# In Bitbucket Server, check webhook delivery:
# Repository settings > Webhooks > Click the webhook > Latest deliveries
```

## Project-Level Webhooks in Bitbucket Server

For managing many repositories, configure webhooks at the project level:

```bash
# Create a project-level webhook in Bitbucket Server
curl -X POST "https://bitbucket-server.example.com/rest/api/1.0/projects/PROJECT/webhooks" \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"ArgoCD Project Webhook\",
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"active\": true,
    \"events\": [\"repo:refs_changed\"],
    \"configuration\": {
      \"secret\": \"$WEBHOOK_SECRET\"
    }
  }"
```

## Network Configuration for Bitbucket Server

Since Bitbucket Server is self-hosted, you control the network. Ensure connectivity between Bitbucket and ArgoCD:

```bash
# From the Bitbucket Server, test connectivity to ArgoCD
curl -v https://argocd.example.com/api/webhook

# If both are in the same Kubernetes cluster
# Use the internal service URL
# URL: http://argocd-server.argocd.svc.cluster.local/api/webhook
```

## Handling Repository URL Matching

Bitbucket URLs can take several forms. ArgoCD needs to match the webhook payload URL with the application's `repoURL`:

```bash
# Bitbucket Cloud URLs
# https://bitbucket.org/workspace/repo.git
# git@bitbucket.org:workspace/repo.git
# https://bitbucket.org/workspace/repo

# Bitbucket Server URLs
# https://bitbucket-server.example.com/scm/project/repo.git
# ssh://git@bitbucket-server.example.com:7999/project/repo.git
# https://bitbucket-server.example.com/projects/PROJECT/repos/repo
```

Ensure your ArgoCD application `repoURL` matches what Bitbucket sends in the webhook:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    # Use the HTTPS clone URL for best webhook matching
    repoURL: https://bitbucket.org/workspace/repo.git
    targetRevision: main
    path: manifests/
```

Check what URL ArgoCD receives:

```bash
kubectl logs -n argocd deployment/argocd-server | grep "Received push" | tail -5
```

## Workspace-Level Webhooks in Bitbucket Cloud

Bitbucket Cloud supports workspace-level webhooks that fire for all repositories:

```bash
# Create a workspace-level webhook
curl -X POST "https://api.bitbucket.org/2.0/workspaces/WORKSPACE/hooks" \
  -u "username:app_password" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"ArgoCD Workspace Webhook\",
    \"url\": \"https://argocd.example.com/api/webhook\",
    \"active\": true,
    \"events\": [\"repo:push\"]
  }"
```

## Optimizing After Webhook Setup

Once webhooks are confirmed working, increase the polling interval:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "600"
```

## Troubleshooting

### Bitbucket Cloud: Webhook Returns 403

```bash
# Verify the UUID matches
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.bitbucket\.uuid}' | base64 -d
```

### Bitbucket Server: Webhook Returns 400

```bash
# Verify the server secret matches
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.bitbucketserver\.secret}' | base64 -d
```

### SSL Certificate Errors

```bash
# For Bitbucket Server with self-signed certs
# Disable SSL verification temporarily for testing
# In Bitbucket Server webhook config, uncheck "Verify SSL"

# Better: Add your CA cert to ArgoCD
kubectl create configmap argocd-tls-certs-cm -n argocd \
  --from-file=bitbucket-server.example.com=/path/to/ca.crt
```

### Webhook Delivery Delayed

Bitbucket Cloud sometimes delays webhook delivery during high load. If you notice delays:

```bash
# Check Bitbucket status page for known issues
# https://bitbucket.status.atlassian.com/

# Keep the polling interval as a fallback
# Do not set timeout.reconciliation to 0
```

For monitoring your webhook delivery pipeline and tracking ArgoCD sync latency end-to-end, [OneUptime](https://oneuptime.com) helps you maintain visibility across your GitOps workflow.

## Key Takeaways

- Bitbucket Cloud uses `webhook.bitbucket.uuid` while Bitbucket Server uses `webhook.bitbucketserver.secret`
- The webhook URL is always `https://your-argocd/api/webhook` regardless of Bitbucket variant
- Use workspace/project-level webhooks to cover many repositories at once
- Verify repository URL matching between webhook payload and application repoURL
- Increase polling interval after confirming webhook reliability
- Keep polling as a fallback since webhook delivery is not guaranteed

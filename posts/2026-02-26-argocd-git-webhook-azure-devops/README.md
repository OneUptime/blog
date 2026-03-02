# How to Configure Git Webhook for Azure DevOps in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure DevOps, Webhook

Description: Step-by-step guide to configuring Azure DevOps service hooks for ArgoCD to trigger immediate reconciliation when code is pushed to your Azure Repos.

---

Azure DevOps uses a slightly different webhook mechanism compared to GitHub and GitLab. Instead of repository-level webhooks, Azure DevOps uses "Service Hooks" to send notifications to external services. ArgoCD supports Azure DevOps webhooks natively, but the setup requires understanding how Azure DevOps service hooks work. This guide covers the complete setup from secret configuration to troubleshooting.

## How Azure DevOps Webhooks Differ

Azure DevOps service hooks have a few unique characteristics:

- They are configured at the project level, not the repository level
- They use a different event payload format than GitHub/GitLab
- They support filtering by repository, branch, and other criteria
- Authentication uses a basic auth username/password or webhook secret

ArgoCD's API server handles the Azure DevOps payload format and extracts the repository URL and branch information for matching against applications.

## Step 1: Generate a Webhook Secret

```bash
# Generate a secure webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Your webhook secret: $WEBHOOK_SECRET"
```

## Step 2: Configure ArgoCD for Azure DevOps Webhooks

Azure DevOps webhooks are processed by ArgoCD's generic webhook handler. Configure the secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  # Azure DevOps uses the generic webhook secret or
  # can authenticate via basic auth header
  webhook.azuredevops.username: "argocd"
  webhook.azuredevops.password: "your-generated-secret"
```

Apply and restart:

```bash
kubectl apply -f argocd-secret.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Step 3: Create a Service Hook in Azure DevOps

### Using the Azure DevOps UI

1. Navigate to your Azure DevOps project
2. Go to Project Settings > Service hooks
3. Click "Create subscription"
4. Select "Web Hooks" as the service
5. Configure the trigger:

```
Trigger: Code pushed
Repository: <select your repo or "Any">
Branch: <select branch or leave blank for all>
Pushed by: <leave blank for all>
```

6. Configure the action:

```
URL: https://argocd.example.com/api/webhook
HTTP headers:
  Content-Type: application/json
Basic authentication username: argocd
Basic authentication password: <your-webhook-secret>
Resource details to send: All
Messages to send: All
Detailed messages to send: All
```

7. Click "Test" to verify, then "Finish"

### Using the Azure DevOps REST API

```bash
# Get your Azure DevOps organization URL and PAT token
AZDO_ORG="https://dev.azure.com/your-org"
AZDO_PROJECT="your-project"
AZDO_PAT="your-personal-access-token"

# Create a service hook subscription
curl -X POST "$AZDO_ORG/_apis/hooks/subscriptions?api-version=7.0" \
  -u ":$AZDO_PAT" \
  -H "Content-Type: application/json" \
  -d "{
    \"publisherId\": \"tfs\",
    \"eventType\": \"git.push\",
    \"resourceVersion\": \"1.0\",
    \"consumerId\": \"webHooks\",
    \"consumerActionId\": \"httpRequest\",
    \"publisherInputs\": {
      \"projectId\": \"$AZDO_PROJECT\",
      \"repository\": \"\",
      \"branch\": \"\"
    },
    \"consumerInputs\": {
      \"url\": \"https://argocd.example.com/api/webhook\",
      \"basicAuthUsername\": \"argocd\",
      \"basicAuthPassword\": \"$WEBHOOK_SECRET\",
      \"httpHeaders\": \"Content-Type: application/json\"
    }
  }"
```

## Step 4: Verify the Webhook

### Test from Azure DevOps

When creating the service hook, Azure DevOps provides a "Test" button. Click it to send a test event and verify the response.

### Check ArgoCD Logs

```bash
# Watch for incoming webhook events
kubectl logs -n argocd deployment/argocd-server -f | grep -i "webhook\|azure\|received"
```

### Push a Test Commit

```bash
# Make a small change and push
echo "# test" >> README.md
git add README.md
git commit -m "Test webhook delivery"
git push origin main

# Check ArgoCD logs for the push event
kubectl logs -n argocd deployment/argocd-server --tail=20 | grep webhook
```

## Handling Azure DevOps Repository URL Formats

Azure DevOps repositories can have multiple URL formats, which affects webhook matching:

```bash
# HTTPS format (most common)
https://dev.azure.com/org/project/_git/repo

# Old HTTPS format
https://org.visualstudio.com/project/_git/repo

# SSH format
git@ssh.dev.azure.com:v3/org/project/repo

# Alternate HTTPS format
https://org@dev.azure.com/org/project/_git/repo
```

Ensure your ArgoCD application uses the same URL format that Azure DevOps sends in the webhook:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    # Use the HTTPS clone URL from Azure DevOps
    repoURL: https://dev.azure.com/org/project/_git/repo
    targetRevision: main
    path: manifests/
```

Check what URL ArgoCD receives from the webhook:

```bash
kubectl logs -n argocd deployment/argocd-server | grep "Received push" | tail -5
```

## Filtering Service Hooks by Repository

If your Azure DevOps project has many repositories but you only want webhooks for specific ones:

```bash
# Create a service hook for a specific repository
curl -X POST "$AZDO_ORG/_apis/hooks/subscriptions?api-version=7.0" \
  -u ":$AZDO_PAT" \
  -H "Content-Type: application/json" \
  -d "{
    \"publisherId\": \"tfs\",
    \"eventType\": \"git.push\",
    \"resourceVersion\": \"1.0\",
    \"consumerId\": \"webHooks\",
    \"consumerActionId\": \"httpRequest\",
    \"publisherInputs\": {
      \"projectId\": \"$AZDO_PROJECT\",
      \"repository\": \"REPO_ID\",
      \"branch\": \"refs/heads/main\"
    },
    \"consumerInputs\": {
      \"url\": \"https://argocd.example.com/api/webhook\",
      \"basicAuthUsername\": \"argocd\",
      \"basicAuthPassword\": \"$WEBHOOK_SECRET\"
    }
  }"
```

Get the repository ID:

```bash
# List repositories in a project
curl "$AZDO_ORG/$AZDO_PROJECT/_apis/git/repositories?api-version=7.0" \
  -u ":$AZDO_PAT" | jq '.value[] | {name, id}'
```

## Azure DevOps Server (On-Premises)

For Azure DevOps Server (formerly TFS), the webhook setup is identical, but use your on-premises URL:

```bash
# Replace dev.azure.com with your server URL
AZDO_ORG="https://tfs.example.com/tfs/DefaultCollection"

# The rest of the API calls are the same
```

Ensure network connectivity between your Azure DevOps Server and ArgoCD:

```bash
# Test from the Azure DevOps Server
curl -v https://argocd.example.com/api/webhook
```

## Optimizing After Setup

Once webhooks are working:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase polling interval
  timeout.reconciliation: "600"
```

## Troubleshooting

### Service Hook Returns 401 Unauthorized

The basic auth credentials do not match:

```bash
# Check the credentials in ArgoCD
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.azuredevops\.username}' | base64 -d
kubectl get secret argocd-secret -n argocd \
  -o jsonpath='{.data.webhook\.azuredevops\.password}' | base64 -d
```

### Service Hook Returns 404

The ArgoCD endpoint is not accessible:

```bash
# Verify the ArgoCD server is reachable
curl -I https://argocd.example.com/api/webhook
# Should return 405 Method Not Allowed for GET requests
```

### Webhook Received but Application Not Refreshed

Check the repository URL format matching:

```bash
# Compare the URL Azure DevOps sends with what ArgoCD has
argocd app get my-app -o json | jq '.spec.source.repoURL'

# Azure DevOps might send:
# https://dev.azure.com/org/project/_git/repo
# But your app might use:
# https://org@dev.azure.com/org/project/_git/repo
```

### Service Hook Shows "Disabled" Status

Azure DevOps automatically disables service hooks after consecutive failures (usually 5):

1. Go to Project Settings > Service hooks
2. Find the disabled hook
3. Fix the underlying issue
4. Re-enable the hook

```bash
# Re-enable via API
curl -X PATCH "$AZDO_ORG/_apis/hooks/subscriptions/SUBSCRIPTION_ID?api-version=7.0" \
  -u ":$AZDO_PAT" \
  -H "Content-Type: application/json" \
  -d '{"status": "enabled"}'
```

For monitoring your Azure DevOps to ArgoCD webhook pipeline and overall deployment health, [OneUptime](https://oneuptime.com) provides end-to-end observability for your GitOps workflow.

## Key Takeaways

- Azure DevOps uses Service Hooks instead of repository-level webhooks
- Configure at the project level with optional repository and branch filters
- ArgoCD uses basic auth credentials for Azure DevOps webhook verification
- Match repository URL formats between ArgoCD applications and Azure DevOps
- Azure DevOps auto-disables hooks after repeated failures, so monitor delivery status
- Use the Azure DevOps REST API for automated hook management across projects
- Increase polling interval after confirming webhook reliability

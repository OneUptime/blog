# ArgoCD Runbook: Webhooks Not Working

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Webhook, Runbook

Description: A step-by-step operational runbook for diagnosing and fixing ArgoCD webhook failures, covering GitHub, GitLab, and Bitbucket webhook configuration, secret validation, and network connectivity.

---

Webhooks are ArgoCD's primary mechanism for detecting Git changes in real time. When webhooks stop working, ArgoCD falls back to polling, which means changes take minutes instead of seconds to be detected. If polling is also disabled, changes are not detected at all until the next reconciliation cycle. This runbook covers how to diagnose and fix webhook delivery failures.

## Symptoms

- Git changes are not detected until the polling interval passes (default 3 minutes)
- The Git provider shows webhook delivery failures in its webhook settings
- ArgoCD API server logs show no incoming webhook requests
- Applications refresh on schedule but not immediately after a push

## Impact Assessment

**Severity:** P3

**Impact:** Deployments are delayed by the polling interval (typically 3 minutes). All other ArgoCD functionality continues to work normally. This is degraded but not broken.

## Diagnostic Steps

### Step 1: Verify Webhook Configuration in Git Provider

```bash
# GitHub: Check webhook deliveries
# Go to: Repository > Settings > Webhooks > Recent Deliveries
# Look for failed deliveries (red X icon)

# The webhook URL should be one of:
# https://argocd.example.com/api/webhook
# (Some setups use a dedicated path)

# Expected settings:
# Content type: application/json
# Events: Push events (minimum), optionally Pull Request events
```

### Step 2: Check API Server Logs for Webhook Requests

```bash
# Check if the API server is receiving webhook requests
kubectl logs -n argocd deployment/argocd-server --tail=500 | grep -i "webhook"

# If you see webhook entries, the request is reaching ArgoCD
# If not, the request is being blocked before reaching ArgoCD

# Look for specific error messages
kubectl logs -n argocd deployment/argocd-server --tail=500 | grep -i "webhook\|signature\|unauthorized"
```

### Step 3: Test Webhook Endpoint

```bash
# Test if the webhook endpoint is reachable
curl -v -X POST https://argocd.example.com/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","repository":{"url":"https://github.com/org/repo","html_url":"https://github.com/org/repo"}}'

# Expected response: 200 OK
# If you get 404: the endpoint path is wrong
# If you get 403: the webhook secret is wrong
# If you get 502/503: ArgoCD API server is down
# If connection times out: network issue
```

### Step 4: Check Network Connectivity

```bash
# Check if the ArgoCD service is reachable from outside
kubectl get svc -n argocd argocd-server
kubectl get ingress -n argocd

# Check Ingress controller logs for blocked requests
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100 | grep webhook

# Check if a NetworkPolicy is blocking incoming traffic
kubectl get networkpolicy -n argocd
```

### Step 5: Check Webhook Secret

```bash
# Check if a webhook secret is configured in ArgoCD
kubectl get configmap argocd-cm -n argocd -o yaml | grep webhook

# Expected to see:
# webhook.github.secret: <secret>
# webhook.gitlab.secret: <secret>
# webhook.bitbucket.secret: <secret>
# webhook.bitbucketserver.secret: <secret>

# The secret in ArgoCD must match exactly what is configured in the Git provider
```

## Root Causes and Resolutions

### Cause 1: Webhook Secret Mismatch

The most common issue. The secret configured in ArgoCD does not match the secret in the Git provider.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Secret must match what is configured in the Git provider
  webhook.github.secret: "my-webhook-secret-123"
```

```bash
# Update the secret in ArgoCD
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p='{"data":{"webhook.github.secret":"my-webhook-secret-123"}}'

# Restart the API server to pick up the change
kubectl rollout restart deployment/argocd-server -n argocd

# Then update the same secret in your Git provider's webhook settings
```

If you are unsure of the secret, remove it from both sides temporarily to test without signature validation (not recommended for production).

```yaml
# Temporarily remove webhook secret for testing
# argocd-cm ConfigMap
data:
  # Remove or comment out the webhook secret
  # webhook.github.secret: ""
```

### Cause 2: Wrong Webhook URL

The URL configured in the Git provider does not match ArgoCD's actual endpoint.

```bash
# The correct webhook URL format:
# https://argocd.example.com/api/webhook

# Common mistakes:
# - Missing /api prefix: https://argocd.example.com/webhook (wrong)
# - Using HTTP instead of HTTPS
# - Using the internal service URL instead of the external URL
# - Path prefix not included: https://argocd.example.com/argocd/api/webhook (if using rootpath)

# Check if ArgoCD uses a rootpath
kubectl get configmap argocd-cmd-params-cm -n argocd -o jsonpath='{.data.server\.rootpath}'
# If set, prepend it to the webhook URL
```

### Cause 3: Firewall or Network Policy Blocking

The Git provider cannot reach the ArgoCD API server.

```bash
# Check if a NetworkPolicy blocks incoming traffic
kubectl get networkpolicy -n argocd -o yaml

# If there's a restrictive NetworkPolicy, add an ingress rule for webhook traffic
```

```yaml
# Allow incoming traffic from your Git provider's IP ranges
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-webhooks
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  ingress:
  - from:
    # GitHub webhook IPs (check GitHub docs for current list)
    - ipBlock:
        cidr: 140.82.112.0/20
    - ipBlock:
        cidr: 185.199.108.0/22
    ports:
    - port: 8080
      protocol: TCP
```

### Cause 4: Ingress Not Routing Webhook Path

Some Ingress configurations only route certain paths, missing the webhook endpoint.

```yaml
# Ensure the Ingress covers the webhook path
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
spec:
  rules:
  - host: argocd.example.com
    http:
      paths:
      # This must cover /api/webhook
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
```

### Cause 5: ArgoCD API Server Overloaded

The API server is too slow to respond to webhook requests, causing timeouts.

```bash
# Check API server health
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check for slow responses
kubectl logs -n argocd deployment/argocd-server --tail=200 | grep -i "slow\|timeout"

# Scale up API server replicas
kubectl scale deployment argocd-server -n argocd --replicas=3
```

### Cause 6: Webhook Events Not Configured

The Git provider is not sending the right event types.

```bash
# GitHub requires at minimum: Push events
# For ApplicationSets with pull request generators: Pull Request events
# For branch-based apps: Push events only

# GitLab requires: Push events
# Bitbucket requires: Repository Push events

# Check the webhook settings in your Git provider
# Ensure "Push events" is checked
```

## Verification

```bash
# After fixing the webhook, trigger a test delivery from the Git provider
# GitHub: Go to webhook settings > "Redeliver" a recent delivery
# GitLab: Go to webhook settings > "Test" > "Push events"

# Check API server logs for the incoming webhook
kubectl logs -n argocd deployment/argocd-server --tail=50 | grep -i webhook

# Make a test commit and verify ArgoCD detects it immediately
git commit --allow-empty -m "Test webhook delivery"
git push

# Check the application refresh timestamp
argocd app get <app-name> | grep "Last Synced"
# Should show a timestamp within seconds of the push
```

## Prevention

1. Monitor webhook delivery success rate in your Git provider's settings
2. Set up a synthetic webhook test that fires periodically and verifies ArgoCD responds
3. Use IP allowlisting in ArgoCD's Ingress to only accept webhooks from your Git provider's IP ranges
4. Document the exact webhook configuration (URL, secret, events) for each repository
5. Include webhook verification in your ArgoCD upgrade checklist

## Escalation

If webhooks still do not work after checking all the above:

- Check if a WAF (Web Application Firewall) is blocking the requests
- Verify the DNS resolution for your ArgoCD domain from the Git provider's perspective
- If using a self-hosted Git provider, check its outgoing network connectivity
- As a temporary workaround, reduce the polling interval in `timeout.reconciliation`

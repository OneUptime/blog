# How to Fix Flux CD Webhook Receiver Not Triggering Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, webhook, receiver, gitops, kubernetes, troubleshooting, reconciliation

Description: A comprehensive troubleshooting guide for Flux CD webhook receivers that fail to trigger reconciliation when receiving push events from Git providers.

---

Flux CD webhook receivers allow external systems like GitHub, GitLab, and Bitbucket to notify Flux of changes, triggering immediate reconciliation instead of waiting for the next poll interval. When receivers stop working, deployments are delayed until the next scheduled sync. This guide covers every common failure point.

## Understanding Flux CD Webhook Receivers

A Receiver resource creates an HTTP endpoint inside your cluster. When your Git provider sends a webhook payload to this endpoint, Flux triggers reconciliation of the specified resources immediately.

The flow looks like this:

1. Code is pushed to Git
2. Git provider sends a webhook POST to the Receiver endpoint
3. The notification-controller validates the payload
4. Flux reconciles the specified resources

## Step 1: Check Receiver Status

Start by verifying the Receiver resource is healthy.

```bash
# List all receivers
kubectl get receivers -A

# Get detailed status
kubectl describe receiver github-receiver -n flux-system

# Check the webhook URL assigned to the receiver
kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}'
```

A healthy Receiver will have a `Ready: True` condition and a `webhookPath` in its status.

```yaml
# Example Receiver configuration for GitHub
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  # The type must match your Git provider
  type: github
  # Events to listen for
  events:
    - "ping"
    - "push"
  # Secret containing the webhook token for validation
  secretRef:
    name: receiver-token
  # Resources to reconcile when triggered
  resources:
    - kind: GitRepository
      name: flux-system
```

## Step 2: Verify the Webhook Token Secret

The Receiver uses a shared secret to validate incoming webhook payloads. This must match what is configured in your Git provider.

```bash
# Check the secret exists
kubectl get secret receiver-token -n flux-system

# View the token value
kubectl get secret receiver-token -n flux-system \
  -o jsonpath='{.data.token}' | base64 -d
```

Create or fix the secret:

```yaml
# The secret must have a "token" key
apiVersion: v1
kind: Secret
metadata:
  name: receiver-token
  namespace: flux-system
type: Opaque
stringData:
  # This token must match the webhook secret in your Git provider
  token: "my-secure-webhook-token-12345"
```

```bash
# Alternatively, create via CLI
kubectl create secret generic receiver-token \
  --namespace=flux-system \
  --from-literal=token=my-secure-webhook-token-12345
```

## Step 3: Verify the Webhook URL

The full webhook URL is composed of the notification controller service address and the Receiver's webhook path.

```bash
# Get the webhook path from the Receiver status
WEBHOOK_PATH=$(kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}')

echo "Webhook path: $WEBHOOK_PATH"

# The full URL format is:
# http://<notification-controller-address>/<webhook-path>
```

The external URL that your Git provider should call depends on how you expose the notification controller.

## Step 4: Expose the Notification Controller

The notification controller must be reachable from the internet for Git providers to send webhooks. This is where many setups fail.

### Option A: Using an Ingress

```yaml
# Ingress to expose the webhook receiver endpoint
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-receiver
  namespace: flux-system
  annotations:
    # Adjust annotations for your ingress controller
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                # This is the notification controller service
                name: notification-controller
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: webhook-tls
```

### Option B: Using a LoadBalancer Service

```yaml
# Expose notification controller via LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: webhook-receiver
  namespace: flux-system
spec:
  type: LoadBalancer
  selector:
    app: notification-controller
  ports:
    - port: 80
      targetPort: 9292
      protocol: TCP
```

### Option C: Using Port Forwarding for Testing

```bash
# Temporary port-forward for testing
kubectl port-forward -n flux-system \
  svc/notification-controller 9292:80

# Test locally
curl -X POST localhost:9292/<webhook-path> \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 5: Configure Your Git Provider Webhook

The webhook in your Git provider must be configured with the correct URL and secret.

### GitHub Configuration

```bash
# The webhook URL should be:
# https://flux-webhook.example.com/<webhook-path>

# Content type must be: application/json
# Secret must match the receiver-token secret value
# Events: select "Just the push event"
```

### GitLab Configuration

```yaml
# For GitLab, use type: gitlab in the Receiver
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Tag Push Hook"
  secretRef:
    name: receiver-token
  resources:
    - kind: GitRepository
      name: flux-system
```

### Bitbucket Configuration

```yaml
# For Bitbucket Server, use type: bitbucket
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: receiver-token
  resources:
    - kind: GitRepository
      name: flux-system
```

## Step 6: Test the Webhook Manually

Send a test payload to verify the receiver is processing requests.

```bash
# Get the webhook path
WEBHOOK_PATH=$(kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}')

# For GitHub-type receivers, you need to include the correct signature
TOKEN="my-secure-webhook-token-12345"
BODY='{"ref":"refs/heads/main"}'

# Compute the HMAC signature (GitHub uses SHA256)
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print "sha256=" $2}')

# Send the test webhook
curl -X POST "https://flux-webhook.example.com${WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: ${SIGNATURE}" \
  -d "$BODY"
```

## Step 7: Check Notification Controller Logs

The notification controller processes all webhook requests. Its logs reveal validation and processing issues.

```bash
# View notification controller logs
kubectl logs -n flux-system deployment/notification-controller

# Filter for receiver-related messages
kubectl logs -n flux-system deployment/notification-controller | grep -i "receiver\|webhook"

# Watch logs during a webhook delivery
kubectl logs -n flux-system deployment/notification-controller -f
```

Common error messages:

```bash
# "signature verification failed" - token mismatch
# Fix: Ensure the secret token matches what is in your Git provider

# "no matching event" - event type not in the events list
# Fix: Add the correct event type to the Receiver spec

# "resource not found" - referenced resource does not exist
# Fix: Verify the resources list in the Receiver spec
```

## Step 8: Verify Resources Exist

The Receiver must reference existing Flux resources. If a referenced resource does not exist, the Receiver may be ready but will not trigger anything.

```bash
# Check that referenced resources exist
kubectl get gitrepositories -n flux-system
kubectl get kustomizations -n flux-system
kubectl get helmreleases -n flux-system

# The names must match exactly what is in the Receiver spec
kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.spec.resources}' | python3 -m json.tool
```

## Step 9: Check Network Policies

If you have NetworkPolicies in place, they may block incoming webhook traffic to the notification controller.

```yaml
# NetworkPolicy to allow webhook traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-webhook-receiver
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  ingress:
    # Allow traffic from the ingress controller namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 9292
          protocol: TCP
```

```bash
# Check existing network policies
kubectl get networkpolicies -n flux-system

# Verify the notification controller pod is receiving traffic
kubectl logs -n flux-system deployment/notification-controller | grep "received"
```

## Step 10: Verify Git Provider Webhook Delivery

Most Git providers have a webhook delivery log that shows the request and response.

### GitHub

```bash
# Go to: Repository Settings > Webhooks > Recent Deliveries
# Look for:
# - HTTP status code (should be 200)
# - Response body
# - Request headers and payload
```

### GitLab

```bash
# Go to: Project Settings > Webhooks > Edit > Recent events
# Check the response status and body
```

## Step 11: Full Debugging Checklist

```bash
# 1. Receiver is ready
kubectl get receivers -n flux-system

# 2. Webhook path is assigned
kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}'

# 3. Token secret exists with correct key
kubectl get secret receiver-token -n flux-system \
  -o jsonpath='{.data.token}' | base64 -d

# 4. Notification controller is running
kubectl get pods -n flux-system -l app=notification-controller

# 5. Ingress or LoadBalancer is configured
kubectl get ingress -n flux-system
kubectl get svc -n flux-system

# 6. Check controller logs
kubectl logs -n flux-system deployment/notification-controller --tail=50

# 7. Verify referenced resources exist
kubectl get gitrepositories -n flux-system
```

## Summary

When Flux CD webhook receivers fail to trigger reconciliation, the problem is typically one of these:

- **Notification controller not exposed** - no Ingress or LoadBalancer configured
- **Token mismatch** - secret in Kubernetes does not match Git provider webhook secret
- **Wrong event type** - the events list in the Receiver does not include the correct event names
- **Network policies blocking** - ingress traffic cannot reach the notification controller
- **Wrong webhook URL** - the Git provider is configured with an incorrect URL

Check the Git provider's webhook delivery logs and the notification-controller logs simultaneously to quickly identify where the chain breaks.

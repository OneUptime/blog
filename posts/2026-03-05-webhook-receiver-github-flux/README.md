# How to Configure Webhook Receiver for GitHub in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhook, GitHub, Receiver

Description: Learn how to configure a Flux Receiver to accept GitHub webhooks and trigger immediate reconciliation on push events.

---

By default, Flux polls Git repositories on a schedule to detect changes. While this works well, it introduces a delay between when you push a commit and when Flux applies the changes. A GitHub webhook receiver eliminates this delay by notifying Flux immediately when a push event occurs. This guide walks you through configuring a Flux Receiver for GitHub webhooks.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A GitHub repository used as a Flux source
- Access to the GitHub repository settings to configure webhooks
- An ingress controller or load balancer to expose the receiver endpoint

## How It Works

The Flux Receiver resource creates an HTTP endpoint that accepts incoming webhooks. When GitHub sends a webhook payload on a push event, the receiver validates the payload using a shared secret, then triggers reconciliation of the specified Flux resources. This creates a push-based GitOps workflow instead of a poll-based one.

## Step 1: Create a Webhook Secret

First, create a Kubernetes secret containing a shared token that GitHub will use to sign webhook payloads.

```bash
# Generate a random token for webhook authentication
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the Kubernetes secret
kubectl create secret generic github-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save the token value for configuring GitHub later
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Create a Receiver resource that accepts GitHub webhook events and triggers reconciliation of your GitRepository resource.

```yaml
# Receiver that accepts GitHub push webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  # Type specifies the webhook source
  type: github
  # Events to listen for
  events:
    - "ping"
    - "push"
  # Secret containing the webhook token
  secretRef:
    name: github-webhook-secret
  # Resources to trigger reconciliation for
  resources:
    - kind: GitRepository
      name: flux-system
```

Apply the receiver.

```bash
# Apply the receiver configuration
kubectl apply -f github-receiver.yaml

# Check the receiver status
kubectl get receivers -n flux-system
```

## Step 3: Get the Receiver Webhook URL

Once the receiver is created, Flux generates a unique webhook path. Retrieve it to configure GitHub.

```bash
# Get the webhook URL path from the receiver status
kubectl get receiver github-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The output will be something like `/hook/a1b2c3d4e5f6...`. The full URL you will configure in GitHub combines your cluster's external address with this path.

## Step 4: Expose the Receiver Endpoint

The notification controller needs to be accessible from the internet for GitHub to reach it. You can use an Ingress or a LoadBalancer service.

```yaml
# Ingress resource to expose the notification controller webhook endpoint
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-receiver
  namespace: flux-system
  annotations:
    # Adjust annotations based on your ingress controller
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: webhook-tls
```

Apply the ingress.

```bash
# Apply the ingress configuration
kubectl apply -f webhook-ingress.yaml
```

## Step 5: Configure the GitHub Webhook

Now configure GitHub to send webhooks to your Flux receiver.

1. Navigate to your GitHub repository
2. Go to Settings > Webhooks > Add webhook
3. Set the **Payload URL** to `https://flux-webhook.example.com/<webhook-path>` (use the path from Step 3)
4. Set **Content type** to `application/json`
5. Set the **Secret** to the token value generated in Step 1
6. Select **Just the push event** under "Which events would you like to trigger this webhook?"
7. Click **Add webhook**

## Step 6: Trigger Multiple Resources

You can configure the receiver to trigger reconciliation of multiple resources when a webhook is received.

```yaml
# Receiver triggering multiple resources on GitHub push
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-multi-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: github-webhook-secret
  resources:
    # Trigger the GitRepository source refresh
    - kind: GitRepository
      name: flux-system
    # Trigger an additional GitRepository
    - kind: GitRepository
      name: app-source
```

## Step 7: Verify the Receiver

Test that the webhook is working correctly.

```bash
# Check the receiver status for readiness
kubectl get receiver github-receiver -n flux-system

# Describe the receiver for detailed status
kubectl describe receiver github-receiver -n flux-system

# Watch the notification controller logs for incoming webhooks
kubectl logs -n flux-system deploy/notification-controller -f

# After pushing a commit to GitHub, check if reconciliation was triggered
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.conditions[0].message}'
```

## Troubleshooting

If webhooks are not triggering reconciliation, check these common issues.

```bash
# Verify the secret exists and has the correct token
kubectl get secret github-webhook-secret -n flux-system -o jsonpath='{.data.token}' | base64 -d

# Check notification controller logs for webhook errors
kubectl logs -n flux-system deploy/notification-controller | grep -i "webhook\|receiver"

# Test the webhook endpoint is reachable
curl -I https://flux-webhook.example.com/

# Verify the receiver status
kubectl get receiver github-receiver -n flux-system -o yaml
```

Common issues include:
- Secret mismatch between GitHub and the Kubernetes secret
- The notification controller not being exposed externally
- Firewall rules blocking GitHub's webhook IP ranges
- Incorrect webhook path in the GitHub configuration

## Summary

Configuring a GitHub webhook receiver in Flux enables push-based GitOps, eliminating the delay between code pushes and cluster updates. The setup involves creating a shared secret, defining a Receiver resource, exposing the notification controller endpoint, and configuring the webhook in GitHub. Once operational, every push to your repository triggers an immediate reconciliation, making your deployments faster and more responsive.

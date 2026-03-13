# How to Configure Webhook Receiver for GitLab in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, GitLab, Receiver

Description: Learn how to configure a Flux Receiver to accept GitLab webhooks and trigger immediate reconciliation on push events.

---

Flux CD supports webhook receivers for GitLab, enabling push-based reconciliation instead of relying solely on periodic polling. When you configure a GitLab webhook receiver, Flux immediately picks up changes as soon as you push to your repository. This guide covers the complete setup of a GitLab webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A GitLab repository configured as a Flux GitRepository source
- Admin or maintainer access to the GitLab project for webhook configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret containing a token that GitLab will use to authenticate webhook requests.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret in the flux-system namespace
kubectl create secret generic gitlab-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Note the token for GitLab configuration
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver resource with type `gitlab` that listens for push events.

```yaml
# Receiver for GitLab webhook events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  # Specify gitlab as the webhook type
  type: gitlab
  # Events to respond to
  events:
    - "Push Hook"
    - "Tag Push Hook"
  # Reference to the secret containing the webhook token
  secretRef:
    name: gitlab-webhook-secret
  # Resources to reconcile when a webhook is received
  resources:
    - kind: GitRepository
      name: flux-system
```

Apply the configuration.

```bash
# Apply the receiver
kubectl apply -f gitlab-receiver.yaml

# Check the receiver status
kubectl get receivers -n flux-system
```

## Step 3: Retrieve the Webhook URL Path

Get the generated webhook path from the receiver status.

```bash
# Get the webhook path
kubectl get receiver gitlab-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

This returns a path like `/hook/a1b2c3d4...`. Combine this with your cluster's external URL to form the complete webhook URL.

## Step 4: Expose the Notification Controller

Make the notification controller accessible from GitLab.

```yaml
# Ingress to expose the webhook receiver endpoint
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gitlab-webhook-ingress
  namespace: flux-system
  annotations:
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

## Step 5: Configure the GitLab Webhook

Set up the webhook in your GitLab project.

1. Navigate to your GitLab project
2. Go to Settings > Webhooks
3. Set the **URL** to `https://flux-webhook.example.com/<webhook-path>` (use the path from Step 3)
4. Set the **Secret token** to the token value generated in Step 1
5. Under **Trigger**, select **Push events** and optionally **Tag push events**
6. Check **Enable SSL verification** if using a valid TLS certificate
7. Click **Add webhook**

## Step 6: Configure for Multiple Resources

Trigger reconciliation of multiple resources when a GitLab webhook arrives.

```yaml
# Receiver triggering multiple GitRepository resources
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-multi-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Tag Push Hook"
  secretRef:
    name: gitlab-webhook-secret
  resources:
    # Primary flux source
    - kind: GitRepository
      name: flux-system
    # Application source
    - kind: GitRepository
      name: app-manifests
    # Infrastructure source
    - kind: GitRepository
      name: infra-config
```

## Step 7: Verify and Test

Confirm the receiver is working by pushing a change and observing the results.

```bash
# Check that the receiver is ready
kubectl get receiver gitlab-receiver -n flux-system

# View the receiver details
kubectl describe receiver gitlab-receiver -n flux-system

# Monitor the notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f

# After pushing to GitLab, verify reconciliation was triggered
kubectl get gitrepository flux-system -n flux-system
```

You can also test the webhook from GitLab's interface by clicking "Test" next to the configured webhook and selecting "Push events."

## Troubleshooting

If the GitLab webhook is not working, check these items.

```bash
# Verify the secret exists
kubectl get secret gitlab-webhook-secret -n flux-system

# Check notification controller logs for errors
kubectl logs -n flux-system deploy/notification-controller | grep -i "gitlab\|receiver\|webhook"

# Verify the receiver is not in an error state
kubectl get receiver gitlab-receiver -n flux-system -o yaml

# Check if the webhook endpoint is reachable
curl -I https://flux-webhook.example.com/
```

In GitLab, you can also check the webhook delivery history under Settings > Webhooks by clicking "Edit" on the webhook and scrolling to "Recent events." This shows the HTTP status code and response for each delivery attempt.

Common issues include:
- Token mismatch between the Kubernetes secret and the GitLab webhook configuration
- The notification controller not being accessible from GitLab (firewall or ingress issues)
- Self-managed GitLab instances needing outbound network access to reach the cluster
- SSL certificate verification failures (disable if using self-signed certificates, but only for testing)

## Summary

Setting up a GitLab webhook receiver in Flux provides instant reconciliation whenever changes are pushed to your repository. The configuration involves creating a shared secret, defining a Receiver resource with type `gitlab`, exposing the notification controller, and adding the webhook in your GitLab project settings. This push-based approach significantly reduces the time between code changes and cluster updates compared to the default polling mechanism.

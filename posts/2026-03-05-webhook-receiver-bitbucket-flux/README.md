# How to Configure Webhook Receiver for Bitbucket in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Bitbucket, Receiver

Description: Learn how to configure a Flux Receiver to accept Bitbucket webhooks and trigger immediate reconciliation on push events.

---

Flux CD supports Bitbucket as a webhook source, allowing you to trigger immediate reconciliation when changes are pushed to your Bitbucket repositories. This eliminates the polling delay and makes your GitOps pipeline more responsive. This guide covers how to configure a Bitbucket webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Bitbucket repository configured as a Flux GitRepository source
- Admin access to the Bitbucket repository for webhook configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret with a token for webhook authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic bitbucket-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save the token for Bitbucket configuration
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver resource with type `bitbucket`.

```yaml
# Receiver for Bitbucket webhook events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-receiver
  namespace: flux-system
spec:
  # Specify bitbucket as the webhook type
  type: bitbucket
  # Bitbucket push events
  events:
    - "repo:push"
  # Secret for webhook validation
  secretRef:
    name: bitbucket-webhook-secret
  # Resources to reconcile on webhook receipt
  resources:
    - kind: GitRepository
      name: flux-system
```

Apply it.

```bash
# Apply the receiver
kubectl apply -f bitbucket-receiver.yaml

# Verify the receiver was created
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the generated webhook path.

```bash
# Get the webhook path from the receiver status
kubectl get receiver bitbucket-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Create an ingress to make the notification controller reachable from Bitbucket.

```yaml
# Ingress for the Bitbucket webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bitbucket-webhook-ingress
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

## Step 5: Configure the Bitbucket Webhook

For Bitbucket Cloud:

1. Navigate to your repository in Bitbucket
2. Go to Repository settings > Webhooks > Add webhook
3. Set the **Title** to a descriptive name like "Flux CD Receiver"
4. Set the **URL** to `https://flux-webhook.example.com/<webhook-path>`
5. Under **Triggers**, select **Repository push**
6. Click **Save**

For Bitbucket Server, the process is similar but accessed through Repository settings > Webhooks.

Note that Bitbucket Cloud uses the token as a query parameter or header depending on the configuration. Flux handles the validation based on the receiver type.

## Step 6: Configure for Multiple Resources

Trigger multiple resource reconciliations from a single Bitbucket webhook.

```yaml
# Receiver triggering multiple resources from Bitbucket
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-multi-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:push"
  secretRef:
    name: bitbucket-webhook-secret
  resources:
    - kind: GitRepository
      name: flux-system
    - kind: GitRepository
      name: app-source
```

## Step 7: Verify the Configuration

Test the webhook integration after setup.

```bash
# Check receiver status
kubectl get receiver bitbucket-receiver -n flux-system

# Describe the receiver
kubectl describe receiver bitbucket-receiver -n flux-system

# Monitor notification controller logs during a push
kubectl logs -n flux-system deploy/notification-controller -f

# Check if reconciliation was triggered after a push
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.lastHandledReconcileAt}'
```

## Troubleshooting

Common issues and how to resolve them.

```bash
# Check if the receiver is ready
kubectl get receiver bitbucket-receiver -n flux-system -o yaml

# Verify the secret exists and has the token key
kubectl get secret bitbucket-webhook-secret -n flux-system -o jsonpath='{.data.token}' | base64 -d

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "bitbucket\|receiver"

# Test endpoint accessibility
curl -I https://flux-webhook.example.com/
```

If Bitbucket reports webhook delivery failures, check:
- The webhook URL matches the receiver's webhook path exactly
- The notification controller service is exposed and reachable
- TLS certificates are valid if SSL verification is enabled
- Network policies are not blocking incoming traffic from Bitbucket's IP ranges

## Summary

Configuring a Bitbucket webhook receiver in Flux enables push-based GitOps with immediate reconciliation on repository pushes. The setup requires creating a secret for authentication, defining a Receiver resource with type `bitbucket`, exposing the notification controller, and adding the webhook in Bitbucket's repository settings. This reduces deployment latency and keeps your cluster in sync with your Git repository in near real-time.

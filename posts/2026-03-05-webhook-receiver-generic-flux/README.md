# How to Configure Webhook Receiver for Generic Webhook in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Receiver, Generic

Description: Learn how to configure a Flux Receiver with the generic webhook type to accept webhooks from any source and trigger reconciliation.

---

The generic webhook receiver in Flux is a versatile option that accepts webhooks from any HTTP source, regardless of the provider. This is useful when you need to integrate with tools or services that do not have a dedicated receiver type in Flux, such as custom CI/CD systems, monitoring tools, or internal automation platforms. This guide covers how to set up a generic webhook receiver.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- An ingress controller or load balancer to expose the receiver endpoint
- A system or tool capable of sending HTTP POST requests

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for token-based authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic generic-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save the token for configuring the webhook sender
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Generic Receiver

Define a Receiver with type `generic`.

```yaml
# Generic webhook receiver
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: generic-receiver
  namespace: flux-system
spec:
  # Generic type accepts any webhook payload
  type: generic
  # Secret for token-based authentication
  secretRef:
    name: generic-webhook-secret
  # Resources to reconcile when the webhook is received
  resources:
    - kind: GitRepository
      name: flux-system
    - kind: Kustomization
      name: flux-system
```

Apply the receiver.

```bash
# Apply the receiver
kubectl apply -f generic-receiver.yaml

# Verify the receiver
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the webhook path.

```bash
# Get the webhook URL path
kubectl get receiver generic-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The full URL will be `https://flux-webhook.example.com/<webhook-path>`.

## Step 4: Expose the Receiver Endpoint

Make the notification controller reachable from external systems.

```yaml
# Ingress for generic webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: generic-webhook-ingress
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

## Step 5: Send Webhooks to the Generic Receiver

The generic receiver validates requests using a token passed in the HTTP headers. Send a POST request with an empty body and the token in the header.

```bash
# Trigger reconciliation by sending a webhook
curl -X POST \
  https://flux-webhook.example.com/<webhook-path> \
  -H "Content-Type: application/json" \
  -d '{}'
```

The generic receiver authenticates using the token from the secret. The token should be included as part of the webhook path that Flux generates.

## Step 6: Integrate with CI/CD Pipelines

Use the generic receiver to trigger Flux reconciliation at the end of a CI/CD pipeline.

Here is an example for a GitHub Actions workflow.

```yaml
# GitHub Actions step to trigger Flux reconciliation
# Add this at the end of your CI/CD pipeline
- name: Trigger Flux Reconciliation
  run: |
    curl -X POST \
      "https://flux-webhook.example.com/${{ secrets.FLUX_WEBHOOK_PATH }}" \
      -H "Content-Type: application/json" \
      -d '{}' \
      --fail --silent --show-error
```

Here is an example for a Jenkins pipeline.

```bash
# Jenkins pipeline step to trigger Flux
curl -X POST \
  "https://flux-webhook.example.com/${FLUX_WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --fail
```

## Step 7: Configure for Specific Resources

Target specific resources for reconciliation from the generic webhook.

```yaml
# Generic receiver targeting specific application resources
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: app-deploy-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: generic-webhook-secret
  resources:
    # Trigger source refresh
    - kind: GitRepository
      name: app-source
    # Trigger deployment
    - kind: Kustomization
      name: app-deployment
    # Trigger Helm release
    - kind: HelmRelease
      name: app-release
```

## Step 8: Create Multiple Generic Receivers

Create separate receivers for different purposes, each with their own secret and resource targets.

```yaml
# Receiver for infrastructure updates
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: infra-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: infra-webhook-secret
  resources:
    - kind: GitRepository
      name: infra-source
    - kind: Kustomization
      name: infra-controllers
---
# Receiver for application deployments
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: apps-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: apps-webhook-secret
  resources:
    - kind: GitRepository
      name: apps-source
    - kind: Kustomization
      name: apps
```

## Step 9: Verify and Test

Test the generic receiver with a curl command.

```bash
# Check receiver status
kubectl get receiver generic-receiver -n flux-system

# Get the full webhook path
WEBHOOK_PATH=$(kubectl get receiver generic-receiver -n flux-system -o jsonpath='{.status.webhookPath}')

# Monitor notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f &

# Send a test webhook
curl -X POST "https://flux-webhook.example.com${WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' -v

# Verify reconciliation was triggered
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.lastHandledReconcileAt}'
```

## Troubleshooting

If the generic receiver is not responding, check these items.

```bash
# Verify receiver status
kubectl get receiver generic-receiver -n flux-system -o yaml

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "generic\|receiver"

# Verify the secret
kubectl get secret generic-webhook-secret -n flux-system

# Test from within the cluster
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl -X POST "http://notification-controller.flux-system.svc/$(kubectl get receiver generic-receiver -n flux-system -o jsonpath='{.status.webhookPath}')"
```

## Summary

The generic webhook receiver in Flux provides maximum flexibility for integrating with any system that can send HTTP POST requests. It is ideal for custom CI/CD pipelines, internal automation tools, and any webhook source that does not have a dedicated Flux receiver type. The setup is straightforward: create a secret, define a Receiver with type `generic`, expose the endpoint, and send POST requests to the generated webhook URL. Each receiver gets its own unique URL path, enabling you to create multiple receivers for different integration points.

# How to Use Flux Receiver for CI/CD Pipeline Triggered Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, CI/CD, Receiver, Webhooks, Reconciliation

Description: Learn how to configure Flux Receivers to trigger immediate reconciliation from CI/CD pipelines, bridging the gap between build and deploy.

---

In a typical GitOps workflow, Flux polls for changes on a schedule. When your CI/CD pipeline builds a new image or pushes configuration changes, there is a delay before Flux detects the update. By using a Flux Receiver, your CI/CD pipeline can trigger reconciliation immediately after a build completes, creating a seamless build-to-deploy workflow. This guide shows how to integrate Flux Receivers with common CI/CD platforms.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins, etc.)
- An ingress controller or load balancer to expose the receiver endpoint
- Flux resources (GitRepository, Kustomization, HelmRelease) configured

## How It Works

The Flux Receiver creates an HTTP endpoint that accepts incoming webhook calls. When your CI/CD pipeline finishes building and pushing artifacts, it sends a POST request to the Receiver endpoint. The Receiver then triggers reconciliation of the specified Flux resources, causing an immediate sync. This pattern works with any CI/CD system that can make HTTP requests.

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for authenticating webhook requests from your CI/CD pipeline.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic cicd-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Store the token securely for CI/CD configuration
echo "CI/CD Webhook Token: $TOKEN"
```

## Step 2: Create the Receiver

Define a generic Receiver that your CI/CD pipeline will call.

```yaml
# Receiver for CI/CD pipeline triggered reconciliation
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: cicd-receiver
  namespace: flux-system
spec:
  # Generic type works with any HTTP client
  type: generic
  # Secret for authentication
  secretRef:
    name: cicd-webhook-secret
  # Resources to reconcile when triggered
  resources:
    # Refresh the Git source
    - kind: GitRepository
      name: flux-system
    # Trigger deployment
    - kind: Kustomization
      name: apps
```

Apply the receiver.

```bash
# Apply the receiver
kubectl apply -f cicd-receiver.yaml

# Get the webhook URL path
kubectl get receiver cicd-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 3: Expose the Receiver Endpoint

Make the notification controller accessible from your CI/CD platform.

```yaml
# Ingress for CI/CD webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cicd-webhook-ingress
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

## Step 4: Integrate with GitHub Actions

Add a step at the end of your GitHub Actions workflow to trigger Flux reconciliation.

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          docker build -t myregistry/myapp:${{ github.sha }} .
          docker push myregistry/myapp:${{ github.sha }}

      # Trigger Flux reconciliation after successful build
      - name: Trigger Flux Reconciliation
        run: |
          curl -X POST \
            "https://flux-webhook.example.com${{ secrets.FLUX_WEBHOOK_PATH }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            --fail --silent --show-error
```

Store the webhook path as a GitHub Actions secret named `FLUX_WEBHOOK_PATH`.

## Step 5: Integrate with GitLab CI

Add a trigger step to your GitLab CI pipeline.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

# Trigger Flux after build completes
trigger-flux:
  stage: deploy
  script:
    # Trigger Flux reconciliation
    - |
      curl -X POST \
        "https://flux-webhook.example.com${FLUX_WEBHOOK_PATH}" \
        -H "Content-Type: application/json" \
        -d '{}' \
        --fail
  only:
    - main
```

Store `FLUX_WEBHOOK_PATH` as a GitLab CI/CD variable.

## Step 6: Integrate with Jenkins

Add a post-build step in your Jenkinsfile.

```bash
# Jenkinsfile post-build step to trigger Flux
# Add this as a post-success step in your Jenkins pipeline
curl -X POST \
  "https://flux-webhook.example.com${FLUX_WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --fail
```

## Step 7: Create Separate Receivers for Different Pipelines

If you have multiple CI/CD pipelines, create separate receivers for each one.

```yaml
# Receiver for frontend pipeline
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: frontend-cicd-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: frontend-cicd-secret
  resources:
    - kind: GitRepository
      name: frontend-source
    - kind: Kustomization
      name: frontend-app
---
# Receiver for backend pipeline
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: backend-cicd-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: backend-cicd-secret
  resources:
    - kind: GitRepository
      name: backend-source
    - kind: HelmRelease
      name: backend-api
---
# Receiver for infrastructure pipeline
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: infra-cicd-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: infra-cicd-secret
  resources:
    - kind: GitRepository
      name: infra-source
    - kind: Kustomization
      name: infra-controllers
```

## Step 8: Trigger Image-Related Resources

When your CI/CD pipeline pushes a new container image, trigger image scanning resources.

```yaml
# Receiver for image build pipelines
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: image-build-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: image-cicd-secret
  resources:
    # Trigger image repository scan
    - kind: ImageRepository
      name: my-app
    # Also refresh the Git source for any config changes
    - kind: GitRepository
      name: flux-system
```

## Step 9: Verify the Integration

Test the complete CI/CD to Flux pipeline.

```bash
# Check receiver status
kubectl get receivers -n flux-system

# Get the webhook path for each receiver
kubectl get receiver cicd-receiver -n flux-system -o jsonpath='{.status.webhookPath}'

# Manually test the webhook
WEBHOOK_PATH=$(kubectl get receiver cicd-receiver -n flux-system -o jsonpath='{.status.webhookPath}')
curl -X POST "https://flux-webhook.example.com${WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' -v

# Watch for reconciliation
kubectl get gitrepository flux-system -n flux-system -w

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=20
```

## Step 10: Add Reconciliation Status Check

After triggering Flux, you can wait for reconciliation to complete in your CI/CD pipeline.

```bash
# Trigger reconciliation and wait for completion
# Step 1: Send the webhook
curl -X POST "https://flux-webhook.example.com${FLUX_WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' --fail

# Step 2: Use flux CLI to wait for reconciliation (requires kubeconfig access)
flux reconcile kustomization apps --with-source --timeout=5m
```

## Troubleshooting

If CI/CD-triggered reconciliation is not working, check these areas.

```bash
# Verify the receiver exists and is ready
kubectl get receiver cicd-receiver -n flux-system -o yaml

# Check if the webhook path is generated
kubectl get receiver cicd-receiver -n flux-system -o jsonpath='{.status.webhookPath}'

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "receiver\|webhook"

# Verify the endpoint is reachable from outside the cluster
curl -I https://flux-webhook.example.com/

# Test from a different network to simulate CI/CD
curl -X POST "https://flux-webhook.example.com/<webhook-path>" -v
```

## Summary

Using Flux Receivers to trigger reconciliation from CI/CD pipelines creates a seamless build-to-deploy workflow. The generic receiver type works with any CI/CD platform that can make HTTP POST requests, including GitHub Actions, GitLab CI, Jenkins, and others. Create separate receivers for different pipelines, use distinct secrets for each, and target specific resources for reconciliation. This approach eliminates the polling delay and ensures your cluster is updated immediately after a successful build.

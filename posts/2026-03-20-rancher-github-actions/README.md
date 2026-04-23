# How to Integrate GitHub Actions with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GitHub Action, CI/CD

Description: Use GitHub Actions to build, test, and deploy applications to Rancher-managed Kubernetes clusters with secure credential management and multi-environment support.

## Introduction

GitHub Actions is the native CI/CD platform for GitHub repositories. Integrating it with Rancher lets you deploy containerized applications to any Rancher-managed cluster directly from your GitHub repository, with full pipeline visibility in both GitHub and Rancher. This guide covers setting up secrets, writing workflows, and deploying to multiple environments.

## Prerequisites

- GitHub repository with Actions enabled
- Rancher with at least one downstream cluster
- GitHub Container Registry (ghcr.io) or Docker Hub for image storage

## Step 1: Store Rancher Credentials in GitHub Secrets

```bash
# Generate a kubeconfig for the target cluster

curl -sS -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "https://rancher.example.com/v3/clusters/<cluster-id>?action=generateKubeconfig" \
  | jq -r .config | base64 | tr -d '\n'
# → Copy this base64 output
```

In GitHub repository:
1. **Settings → Secrets and Variables → Actions → New Repository Secret**.
2. Add:
   - `KUBECONFIG_STAGING` - base64 kubeconfig for staging cluster
   - `KUBECONFIG_PRODUCTION` - base64 kubeconfig for production cluster
   - `RANCHER_TOKEN` - Rancher API token for API calls

## Step 2: Basic Build and Deploy Workflow

```yaml
# .github/workflows/deploy.yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image-ref: ${{ steps.meta.outputs.tags }}
      image-tag: ${{ steps.meta.outputs.version }}
      image-digest: ${{ steps.build-push.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,format=short

      - name: Build and push Docker image
        id: build-push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v5
        with:
          version: 'v1.29.0'

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > /tmp/kubeconfig
          echo "KUBECONFIG=/tmp/kubeconfig" >> $GITHUB_ENV

      - name: Deploy to staging
        run: |
          kubectl set image deployment/myapp \
            myapp="${{ needs.build.outputs.image-ref }}" \
            -n staging
          kubectl rollout status deployment/myapp \
            -n staging \
            --timeout=5m

  deploy-production:
    needs:
      - build
      - deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v5
        with:
          version: 'v1.29.0'

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG_PRODUCTION }}" | base64 -d > /tmp/kubeconfig
          echo "KUBECONFIG=/tmp/kubeconfig" >> $GITHUB_ENV

      - name: Deploy to production
        run: |
          kubectl set image deployment/myapp \
            myapp="${{ needs.build.outputs.image-ref }}" \
            -n production
          kubectl rollout status deployment/myapp \
            -n production \
            --timeout=5m
```

## Step 3: Deploy with Helm

```yaml
# Helm deployment step
- name: Deploy with Helm
  run: |
    helm upgrade --install myapp ./charts/myapp \
      --namespace production \
      --create-namespace \
      --set image.repository=ghcr.io/${{ github.repository }} \
      --set image.tag=${{ needs.build.outputs.image-tag }} \
      --rollback-on-failure \
      --timeout 5m \
      --kubeconfig /tmp/kubeconfig
```

## Step 4: Use OIDC for Keyless Authentication (AWS/GCP/Azure)

For Rancher-managed clusters running on EKS, GKE, or AKS, use your cloud provider's OIDC federation to avoid storing static cloud credentials. In GitHub Actions, make sure the workflow or job has `permissions: id-token: write`.

```yaml
# For AWS EKS clusters - uses OIDC to assume an IAM role
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v6
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
    aws-region: us-east-1

- name: Update kubeconfig
  run: |
    aws eks update-kubeconfig \
      --name my-eks-cluster \
      --region us-east-1
```

## Step 5: Run Integration Tests on Kubernetes

```yaml
- name: Run integration tests on Kubernetes
  run: |
    # Deploy a test job
    kubectl create job integration-test-${{ github.run_id }} \
      --image=${{ needs.build.outputs.image-ref }} \
      -n test \
      -- ./run-tests.sh

    # Wait for test completion
    kubectl wait job/integration-test-${{ github.run_id }} \
      --for=condition=complete \
      --timeout=10m \
      -n test

    # Get test results
    kubectl logs job/integration-test-${{ github.run_id }} -n test

    # Clean up
    kubectl delete job integration-test-${{ github.run_id }} -n test
```

## Step 6: Slack Notifications

```yaml
- name: Notify Slack on success
  if: success()
  uses: slackapi/slack-github-action@v3
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: |
      text: "✅ Deployed ${{ github.repository }}@${{ github.sha }} to production"
```

## Conclusion

GitHub Actions with Rancher creates a developer-friendly CI/CD experience where code pushed to GitHub automatically propagates through build, test, and deploy stages to Rancher-managed Kubernetes clusters. GitHub Environments add approval gates and deployment tracking, OIDC federation eliminates static credentials, and Actions' marketplace provides ready-made integrations for every tool in your stack.

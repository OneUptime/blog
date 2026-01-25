# How to Deploy to Kubernetes with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Kubernetes, Deployment, CI/CD, DevOps, Container Orchestration

Description: Learn how to deploy applications to Kubernetes clusters using GitHub Actions. This guide covers kubectl setup, Helm deployments, rolling updates, environment management, and integration with cloud providers.

---

Deploying to Kubernetes from GitHub Actions gives you automated, reproducible deployments with full audit trails. Whether you run managed Kubernetes on AWS, GCP, or Azure, or operate your own clusters, GitHub Actions can handle the deployment. This guide walks you through setting up secure, reliable Kubernetes deployments.

## Basic kubectl Deployment

Start with a simple deployment using kubectl:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Set up kubectl
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.29.0'

      # Configure kubeconfig
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config

      # Deploy
      - name: Deploy to cluster
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/myapp -n production
```

Store your kubeconfig as a base64-encoded secret:

```bash
# Encode and copy to clipboard
cat ~/.kube/config | base64 | pbcopy
# Add to GitHub Secrets as KUBECONFIG
```

## Deploying with Helm

Helm provides templating and release management:

```yaml
name: Deploy with Helm

on:
  push:
    branches: [main]

env:
  RELEASE_NAME: myapp
  NAMESPACE: production

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Set up Helm
      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.14.0'

      # Configure kubectl
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      # Deploy with Helm
      - name: Deploy
        run: |
          helm upgrade --install ${{ env.RELEASE_NAME }} ./helm/myapp \
            --namespace ${{ env.NAMESPACE }} \
            --set image.tag=${{ github.sha }} \
            --set image.repository=ghcr.io/${{ github.repository }} \
            --wait \
            --timeout 5m

      # Verify deployment
      - name: Verify deployment
        run: |
          kubectl get pods -n ${{ env.NAMESPACE }} -l app=${{ env.RELEASE_NAME }}
          kubectl rollout status deployment/${{ env.RELEASE_NAME }} -n ${{ env.NAMESPACE }}
```

## AWS EKS Deployment

Deploy to Amazon EKS using OIDC authentication:

```yaml
name: Deploy to EKS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      # Configure AWS credentials via OIDC
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-eks
          aws-region: us-east-1

      # Update kubeconfig for EKS
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig \
            --region us-east-1 \
            --name my-cluster

      # Deploy
      - name: Deploy
        run: |
          kubectl set image deployment/myapp \
            myapp=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/myapp -n production
```

## GKE Deployment

Deploy to Google Kubernetes Engine:

```yaml
name: Deploy to GKE

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      # Authenticate to Google Cloud
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/github/providers/github
          service_account: deploy@project.iam.gserviceaccount.com

      # Set up gcloud CLI
      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2

      # Get GKE credentials
      - name: Get GKE credentials
        uses: google-github-actions/get-gke-credentials@v2
        with:
          cluster_name: my-cluster
          location: us-central1

      # Deploy
      - name: Deploy
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/myapp
```

## Azure AKS Deployment

Deploy to Azure Kubernetes Service:

```yaml
name: Deploy to AKS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Login to Azure
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Set up kubectl with AKS
      - name: Set up kubectl
        uses: azure/aks-set-context@v3
        with:
          resource-group: myResourceGroup
          cluster-name: myAKSCluster

      # Deploy
      - name: Deploy
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/myapp
```

## Multi-Environment Deployments

Deploy to staging and production with different configurations:

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.build.outputs.tag }}

    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        id: build
        run: |
          TAG="${{ github.sha }}"
          docker build -t ghcr.io/${{ github.repository }}:$TAG .
          docker push ghcr.io/${{ github.repository }}:$TAG
          echo "tag=$TAG" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Deploy to staging
        run: |
          helm upgrade --install myapp ./helm/myapp \
            --namespace staging \
            --values ./helm/myapp/values-staging.yaml \
            --set image.tag=${{ needs.build.outputs.image-tag }} \
            --wait

      - name: Run smoke tests
        run: |
          kubectl run smoke-test --rm -i --restart=Never \
            --image=curlimages/curl \
            -- curl -f http://myapp.staging.svc/health

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Deploy to production
        run: |
          helm upgrade --install myapp ./helm/myapp \
            --namespace production \
            --values ./helm/myapp/values-production.yaml \
            --set image.tag=${{ needs.build.outputs.image-tag }} \
            --wait
```

## Blue-Green Deployments

Implement blue-green deployments:

```yaml
name: Blue-Green Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Determine target slot
        id: slot
        run: |
          # Check which slot is currently active
          CURRENT=$(kubectl get service myapp -n production -o jsonpath='{.spec.selector.slot}')
          if [ "$CURRENT" == "blue" ]; then
            echo "target=green" >> $GITHUB_OUTPUT
          else
            echo "target=blue" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to inactive slot
        run: |
          kubectl set image deployment/myapp-${{ steps.slot.outputs.target }} \
            myapp=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/myapp-${{ steps.slot.outputs.target }} \
            -n production

      - name: Test new deployment
        run: |
          # Test the inactive slot directly
          kubectl run test --rm -i --restart=Never \
            --image=curlimages/curl \
            -- curl -f http://myapp-${{ steps.slot.outputs.target }}.production.svc/health

      - name: Switch traffic
        run: |
          # Update service selector to point to new slot
          kubectl patch service myapp -n production \
            -p '{"spec":{"selector":{"slot":"${{ steps.slot.outputs.target }}"}}}'

      - name: Verify switch
        run: |
          sleep 10
          kubectl run verify --rm -i --restart=Never \
            --image=curlimages/curl \
            -- curl -f http://myapp.production.svc/health
```

## Canary Deployments

Gradual rollout with traffic splitting:

```yaml
name: Canary Deploy

on:
  push:
    branches: [main]

jobs:
  canary:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      # Deploy canary (10% of pods)
      - name: Deploy canary
        run: |
          kubectl set image deployment/myapp-canary \
            myapp=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -n production
          kubectl scale deployment/myapp-canary --replicas=1 -n production
          kubectl rollout status deployment/myapp-canary -n production

      # Wait and monitor
      - name: Monitor canary
        run: |
          echo "Waiting 5 minutes to monitor canary..."
          sleep 300
          # Check error rate (integrate with your monitoring)
          ERROR_RATE=$(curl -s "https://monitoring.example.com/api/error-rate?service=myapp-canary")
          if [ "$ERROR_RATE" -gt "1" ]; then
            echo "Error rate too high, rolling back"
            kubectl scale deployment/myapp-canary --replicas=0 -n production
            exit 1
          fi

      # Promote canary to stable
      - name: Promote to stable
        run: |
          kubectl set image deployment/myapp \
            myapp=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/myapp -n production

      # Scale down canary
      - name: Scale down canary
        run: |
          kubectl scale deployment/myapp-canary --replicas=0 -n production
```

## Rollback on Failure

Automatic rollback when deployment fails:

```yaml
name: Deploy with Rollback

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Get current revision
        id: current
        run: |
          REVISION=$(kubectl rollout history deployment/myapp -n production | tail -2 | head -1 | awk '{print $1}')
          echo "revision=$REVISION" >> $GITHUB_OUTPUT

      - name: Deploy
        id: deploy
        continue-on-error: true
        run: |
          kubectl set image deployment/myapp \
            myapp=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/myapp -n production --timeout=5m

      - name: Rollback on failure
        if: steps.deploy.outcome == 'failure'
        run: |
          echo "Deployment failed, rolling back to revision ${{ steps.current.outputs.revision }}"
          kubectl rollout undo deployment/myapp \
            --to-revision=${{ steps.current.outputs.revision }} \
            -n production
          kubectl rollout status deployment/myapp -n production
          exit 1

      - name: Verify deployment
        if: steps.deploy.outcome == 'success'
        run: |
          kubectl get pods -n production -l app=myapp
```

## Kustomize Deployments

Use Kustomize for environment-specific configurations:

```yaml
name: Deploy with Kustomize

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]

    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Set image tag
        run: |
          cd k8s/overlays/${{ matrix.environment }}
          kustomize edit set image myapp=ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Deploy
        run: |
          kubectl apply -k k8s/overlays/${{ matrix.environment }}
          kubectl rollout status deployment/myapp -n ${{ matrix.environment }}
```

## Deployment Notifications

Notify your team about deployments:

```yaml
- name: Notify Slack on success
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    channel-id: 'deployments'
    slack-message: |
      :white_check_mark: Deployment successful
      *Environment:* production
      *Version:* ${{ github.sha }}
      *Deployed by:* ${{ github.actor }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    channel-id: 'deployments'
    slack-message: |
      :x: Deployment failed
      *Environment:* production
      *Version:* ${{ github.sha }}
      *Details:* ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

Deploying to Kubernetes from GitHub Actions creates a reliable, auditable deployment pipeline. Start with simple kubectl deployments, add Helm for template management, and implement progressive deployment strategies as your needs grow. The combination of GitHub Actions environments for approval gates and Kubernetes rolling updates provides both safety and speed.

# How to Use Selective Sync in CI/CD Pipelines with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CI/CD, Selective Sync

Description: Learn how to integrate ArgoCD selective sync into CI/CD pipelines for targeted deployments, canary rollouts, staged updates, and environment-specific sync operations.

---

While ArgoCD handles continuous delivery through Git reconciliation, CI/CD pipelines often need more control over what gets deployed and when. Selective sync in CI/CD pipelines lets you deploy specific resources, target specific environments, and implement staged rollout strategies. This guide covers practical patterns for integrating ArgoCD selective sync into your CI/CD workflows.

## Basic Pipeline Integration

The simplest CI/CD integration triggers a selective sync after pushing changes to Git.

```yaml
# GitHub Actions workflow
name: Deploy Specific Service
on:
  push:
    branches: [main]
    paths:
      - 'services/payment/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Login to ArgoCD
        run: |
          argocd login ${{ secrets.ARGOCD_SERVER }} \
            --username admin \
            --password ${{ secrets.ARGOCD_PASSWORD }} \
            --grpc-web

      - name: Sync payment service only
        run: |
          argocd app sync production-app \
            --resource apps:Deployment:payment-service \
            --resource :ConfigMap:payment-config \
            --resource :Service:payment-svc

      - name: Wait for health
        run: |
          argocd app wait production-app \
            --resource apps:Deployment:payment-service \
            --health \
            --timeout 300
```

This pipeline triggers only when files in the `services/payment/` directory change, and it syncs only the payment service resources.

## Token-Based Authentication for Pipelines

For production pipelines, use ArgoCD API tokens instead of username/password.

```bash
# Generate a token for CI/CD use (run this once manually)
argocd account generate-token --account ci-deployer

# Or use a project-scoped token
argocd proj role create-token my-project ci-role
```

```yaml
# Use the token in your pipeline
- name: Login to ArgoCD
  run: |
    argocd login ${{ secrets.ARGOCD_SERVER }} \
      --auth-token ${{ secrets.ARGOCD_TOKEN }} \
      --grpc-web
```

## Detecting Changed Resources Automatically

Instead of hardcoding which resources to sync, detect what changed in the Git commit and sync only those resources.

```yaml
# GitHub Actions - detect changed manifests and sync matching resources
name: Smart Selective Sync
on:
  push:
    branches: [main]
    paths:
      - 'manifests/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Install tools
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd && sudo mv argocd /usr/local/bin/

      - name: Login to ArgoCD
        run: |
          argocd login ${{ secrets.ARGOCD_SERVER }} \
            --auth-token ${{ secrets.ARGOCD_TOKEN }} \
            --grpc-web

      - name: Detect and sync changed resources
        run: |
          # Get changed files in the manifests directory
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD -- manifests/)

          if [ -z "$CHANGED_FILES" ]; then
            echo "No manifest changes detected"
            exit 0
          fi

          echo "Changed files:"
          echo "$CHANGED_FILES"

          # Get out-of-sync resources (the changes ArgoCD detected)
          OOS=$(argocd app resources production-app --output json | \
            jq -r '.[] | select(.status == "OutOfSync") | "\(.group):\(.kind):\(.name)"')

          if [ -z "$OOS" ]; then
            echo "No out-of-sync resources"
            exit 0
          fi

          echo "Out-of-sync resources:"
          echo "$OOS"

          # Build resource flags
          RESOURCE_FLAGS=""
          while IFS= read -r resource; do
            RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
          done <<< "$OOS"

          # Sync only out-of-sync resources
          eval argocd app sync production-app $RESOURCE_FLAGS

          # Wait for health
          argocd app wait production-app --health --timeout 300
```

## Staged Environment Rollout

A common pattern is deploying to staging first, running tests, then deploying to production.

```yaml
# GitLab CI staged deployment
stages:
  - deploy-staging
  - test
  - deploy-production

deploy-to-staging:
  stage: deploy-staging
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    # Sync only staging namespace resources
    - |
      STAGING_RESOURCES=$(argocd app resources platform-app --output json | \
        jq -r '.[] | select(.namespace == "staging" and .status == "OutOfSync") | "\(.group):\(.kind):\(.name)"')
      if [ -n "$STAGING_RESOURCES" ]; then
        RESOURCE_FLAGS=""
        while IFS= read -r resource; do
          RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
        done <<< "$STAGING_RESOURCES"
        eval argocd app sync platform-app $RESOURCE_FLAGS
        argocd app wait platform-app --health --timeout 300
      fi

integration-tests:
  stage: test
  script:
    - ./run-integration-tests.sh --env staging
  needs: [deploy-to-staging]

deploy-to-production:
  stage: deploy-production
  when: manual  # Require manual approval for production
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - |
      PROD_RESOURCES=$(argocd app resources platform-app --output json | \
        jq -r '.[] | select(.namespace == "production" and .status == "OutOfSync") | "\(.group):\(.kind):\(.name)"')
      if [ -n "$PROD_RESOURCES" ]; then
        RESOURCE_FLAGS=""
        while IFS= read -r resource; do
          RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
        done <<< "$PROD_RESOURCES"
        eval argocd app sync platform-app $RESOURCE_FLAGS
        argocd app wait platform-app --health --timeout 600
      fi
  needs: [integration-tests]
```

## Canary Deployment with Selective Sync

Use selective sync to implement a manual canary deployment by syncing the canary version of a Deployment before the main version.

```yaml
# Jenkins pipeline for canary deployment
pipeline {
    agent any

    stages {
        stage('Deploy Canary') {
            steps {
                sh '''
                    argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

                    # Sync only the canary Deployment
                    argocd app sync my-app \
                      --resource apps:Deployment:web-app-canary

                    # Wait for canary to be healthy
                    argocd app wait my-app \
                      --resource apps:Deployment:web-app-canary \
                      --health --timeout 180
                '''
            }
        }

        stage('Verify Canary') {
            steps {
                sh '''
                    # Run health checks against canary
                    ./scripts/canary-health-check.sh

                    # Check error rates
                    ./scripts/check-error-rate.sh --threshold 0.1
                '''
            }
        }

        stage('Full Rollout') {
            steps {
                sh '''
                    argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

                    # Sync the main Deployment
                    argocd app sync my-app \
                      --resource apps:Deployment:web-app

                    argocd app wait my-app \
                      --resource apps:Deployment:web-app \
                      --health --timeout 300
                '''
            }
        }
    }

    post {
        failure {
            sh '''
                # Rollback canary on failure
                argocd app sync my-app \
                  --resource apps:Deployment:web-app-canary \
                  --revision $PREVIOUS_REVISION
            '''
        }
    }
}
```

## Using the ArgoCD API Directly

For advanced CI/CD integrations, call the ArgoCD API directly instead of using the CLI.

```bash
# Trigger selective sync via API
curl -X POST "https://$ARGOCD_SERVER/api/v1/applications/my-app/sync" \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "group": "apps",
        "kind": "Deployment",
        "name": "web-app",
        "namespace": "production"
      }
    ],
    "dryRun": false,
    "prune": false
  }'
```

```python
# Python example using requests
import requests
import time

ARGOCD_SERVER = "https://argocd.example.com"
TOKEN = "your-api-token"
APP_NAME = "my-app"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Trigger selective sync
sync_payload = {
    "resources": [
        {
            "group": "apps",
            "kind": "Deployment",
            "name": "payment-service",
            "namespace": "production"
        }
    ]
}

response = requests.post(
    f"{ARGOCD_SERVER}/api/v1/applications/{APP_NAME}/sync",
    headers=headers,
    json=sync_payload
)

print(f"Sync triggered: {response.status_code}")

# Poll for completion
while True:
    status = requests.get(
        f"{ARGOCD_SERVER}/api/v1/applications/{APP_NAME}",
        headers=headers
    ).json()

    operation = status.get("status", {}).get("operationState", {})
    phase = operation.get("phase", "")

    if phase in ("Succeeded", "Failed", "Error"):
        print(f"Sync completed with phase: {phase}")
        break

    print(f"Sync in progress: {phase}")
    time.sleep(5)
```

## Pipeline Safety Checks

Add safety checks to your pipelines to prevent accidental deployments.

```bash
#!/bin/bash
# safe-sync.sh - Selective sync with safety checks

set -euo pipefail

APP_NAME="$1"
RESOURCE="$2"

# Check 1: Verify the application exists
if ! argocd app get "$APP_NAME" > /dev/null 2>&1; then
  echo "ERROR: Application $APP_NAME not found"
  exit 1
fi

# Check 2: Verify the resource exists in the application
RESOURCE_EXISTS=$(argocd app resources "$APP_NAME" --output json | \
  jq --arg r "$RESOURCE" '[.[] | "\(.group):\(.kind):\(.name)"] | any(. == $r)')
if [ "$RESOURCE_EXISTS" != "true" ]; then
  echo "ERROR: Resource $RESOURCE not found in $APP_NAME"
  exit 1
fi

# Check 3: Check if sync windows allow sync
SYNC_ALLOWED=$(argocd app get "$APP_NAME" --output json | \
  jq '.status.sync.status')
echo "Current sync status: $SYNC_ALLOWED"

# Check 4: Preview changes
echo "Changes to be applied:"
argocd app diff "$APP_NAME" --resource "$RESOURCE" || true

# Execute sync
echo "Proceeding with sync..."
argocd app sync "$APP_NAME" --resource "$RESOURCE"

# Verify
argocd app wait "$APP_NAME" --resource "$RESOURCE" --health --timeout 300
echo "Sync completed successfully"
```

## Handling Sync Failures in Pipelines

Always handle sync failures gracefully in your pipelines.

```yaml
# GitHub Actions with failure handling
- name: Sync with rollback on failure
  run: |
    # Record the current revision for rollback
    CURRENT_REV=$(argocd app get my-app --output json | \
      jq -r '.status.sync.revision')

    # Attempt the sync
    if ! argocd app sync my-app --resource apps:Deployment:web-app; then
      echo "Sync failed. Attempting rollback to $CURRENT_REV..."
      argocd app sync my-app --resource apps:Deployment:web-app --revision "$CURRENT_REV"
      exit 1
    fi

    # Wait for health with timeout
    if ! argocd app wait my-app --resource apps:Deployment:web-app --health --timeout 300; then
      echo "Health check failed. Rolling back..."
      argocd app sync my-app --resource apps:Deployment:web-app --revision "$CURRENT_REV"
      exit 1
    fi

    echo "Deployment successful"
```

For the ArgoCD CLI selective sync reference, see the [selective sync CLI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-cli/view). For the UI approach, check the [selective sync UI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-ui/view).

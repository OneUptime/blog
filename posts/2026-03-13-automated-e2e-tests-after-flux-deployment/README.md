# How to Set Up Automated E2E Tests After Flux Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, E2E Testing, GitOps, CI/CD, Kubernetes, Testing, Playwright, Cypress

Description: Learn how to automatically run end-to-end tests after Flux CD successfully deploys a new version, using Flux notifications and CI webhook triggers.

---

## Introduction

Flux CD's reconciliation model is pull-based, which means CI systems don't directly trigger deployments. This creates a challenge for post-deployment testing: how do you know when Flux has finished reconciling so you can start E2E tests? The answer is Flux's Notification Controller, which can emit webhook events when a Kustomization or HelmRelease reaches a Ready state.

By combining Flux notifications with a GitHub Actions workflow dispatch or webhook receiver, you can trigger E2E tests automatically once Flux confirms a deployment is healthy. This closes the feedback loop: code push → CI build → image push → Flux reconcile → E2E tests → notification.

This guide covers configuring Flux notifications to trigger a GitHub Actions E2E test workflow after a successful deployment reconciliation.

## Prerequisites

- A Kubernetes cluster with Flux CD deployed and an application reconciled
- Flux Notification Controller installed (part of default Flux installation)
- GitHub Actions for running E2E tests
- A GitHub personal access token for triggering workflow dispatches
- `flux` CLI installed

## Step 1: Configure Flux Alert to Trigger GitHub Actions

Flux can send a webhook to GitHub's workflow dispatch endpoint when a reconciliation succeeds:

```yaml
# clusters/staging/notifications/github-e2e-trigger.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: github-dispatch
  namespace: flux-system
spec:
  type: github
  address: https://github.com/your-org/your-repo
  secretRef:
    name: github-dispatch-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: e2e-trigger-on-deploy
  namespace: flux-system
spec:
  providerRef:
    name: github-dispatch
  # Only trigger on successful reconciliation of the myapp Kustomization
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp
      namespace: flux-system
  # Filter to only Ready events (not in-progress or failed)
  inclusionList:
    - ".*Reconciliation succeeded.*"
```

Create the GitHub PAT secret:

```bash
kubectl create secret generic github-dispatch-token \
  --from-literal=token=ghp_your_personal_access_token \
  --namespace=flux-system
```

## Step 2: Alternatively, Use a Generic Webhook Receiver

For CI systems without native GitHub dispatch support, use a generic webhook:

```yaml
# clusters/staging/notifications/generic-webhook-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: e2e-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://your-ci-webhook-endpoint.example.com/trigger-e2e
  secretRef:
    name: webhook-hmac-secret
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: trigger-e2e-on-success
  namespace: flux-system
spec:
  providerRef:
    name: e2e-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp
      namespace: flux-system
  inclusionList:
    - ".*succeeded.*"
```

## Step 3: Create the E2E Test Workflow in GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests (Post-Deployment)

on:
  # Triggered by Flux notification via workflow_dispatch
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
      image_tag:
        description: 'Image tag that was deployed'
        required: false

jobs:
  e2e:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Playwright
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Wait for deployment to be fully ready
        run: |
          # Poll the health endpoint before running tests
          MAX_RETRIES=30
          RETRY_INTERVAL=10
          URL="https://staging.your-app.com/health"

          for i in $(seq 1 $MAX_RETRIES); do
            if curl -sf "$URL" > /dev/null; then
              echo "Application is healthy, proceeding with E2E tests"
              break
            fi
            echo "Attempt $i/$MAX_RETRIES: Application not ready, waiting..."
            sleep $RETRY_INTERVAL
          done

      - name: Run Playwright E2E tests
        env:
          BASE_URL: https://staging.your-app.com
          TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
        run: |
          npx playwright test --project=chromium --reporter=html

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Notify on E2E failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "E2E tests failed after Flux deployment to ${{ github.event.inputs.environment }}",
              "attachments": [{"color": "danger", "text": "Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Step 4: Configure Flux to Include Deployment Metadata in Webhook

Use a custom webhook body template to pass deployment metadata to the E2E trigger:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: github-e2e
  namespace: flux-system
spec:
  type: generic
  address: https://api.github.com/repos/your-org/your-repo/actions/workflows/e2e-tests.yml/dispatches
  secretRef:
    name: github-dispatch-token
```

## Step 5: Handle Rollback on E2E Failure

If E2E tests fail, automate a rollback by reverting the fleet repository commit:

```yaml
      - name: Rollback fleet repo on E2E failure
        if: failure()
        env:
          GIT_TOKEN: ${{ secrets.FLEET_REPO_TOKEN }}
        run: |
          git clone https://x-access-token:$GIT_TOKEN@github.com/your-org/fleet-repo.git
          cd fleet-repo
          git config user.email "ci@your-org.com"
          git config user.name "CI Bot"
          git revert HEAD --no-edit
          git push origin main
```

## Best Practices

- Always poll a health endpoint before starting E2E tests; Flux marking a deployment Ready does not guarantee all pods have finished starting.
- Use Flux's `inclusionList` with a specific pattern to filter for successful reconciliations only, avoiding E2E runs on partial updates.
- Store E2E test credentials in environment-specific GitHub Actions secrets, not in the repository.
- Set a timeout on E2E test runs to prevent them from blocking indefinitely if the application is in a degraded state.
- Separate E2E tests from unit and integration tests; E2E runs are slower and should not block CI on every commit.
- Record the image tag and Flux reconciliation ID in the E2E run for traceability when investigating failures.

## Conclusion

Connecting Flux CD notifications to E2E test triggers creates a fully automated quality gate that runs after every successful deployment. This turns the GitOps loop from a delivery mechanism into a complete software quality system, where every deployment is automatically verified against real-world user flows.

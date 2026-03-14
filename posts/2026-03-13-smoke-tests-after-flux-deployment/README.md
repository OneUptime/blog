# How to Set Up Smoke Tests After Flux Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Smoke Tests, GitOps, CI/CD, Kubernetes, Testing, Health Checks

Description: Learn how to configure lightweight smoke tests that run automatically after Flux CD successfully reconciles a deployment to validate critical application functionality.

---

## Introduction

Smoke tests are lightweight, fast checks that verify the most critical paths of an application are functional after a deployment. Unlike full E2E test suites, smoke tests focus on "is the application alive and serving requests?" rather than comprehensive functional coverage. They should complete in under two minutes and provide immediate feedback.

With Flux CD, smoke tests fit naturally into the post-reconciliation phase. Flux's Notification Controller can trigger a smoke test job directly in the cluster using Kubernetes Jobs, or notify an external CI system. Running smoke tests as Kubernetes Jobs is particularly elegant because they run in the same network as the deployed application, can verify internal service connectivity, and produce results visible through standard Kubernetes tooling.

This guide covers two approaches: in-cluster smoke tests as Kubernetes Jobs triggered by Flux, and external smoke tests triggered via webhook.

## Prerequisites

- A Kubernetes cluster with Flux CD and Notification Controller deployed
- An application deployed via Flux CD
- Basic shell or scripting knowledge for writing smoke test scripts
- Optional: a CI system for external smoke test execution

## Step 1: Write an In-Cluster Smoke Test Job

```yaml
# apps/myapp/smoke-test-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: myapp-smoke-test
  namespace: myapp
  labels:
    app: myapp
    component: smoke-test
spec:
  ttlSecondsAfterFinished: 3600 # Clean up after 1 hour
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: smoke-test
          image: curlimages/curl:8.5.0
          command:
            - /bin/sh
            - -c
            - |
              set -e

              BASE_URL="http://myapp-service.myapp.svc.cluster.local:8080"

              echo "=== Smoke Test: Health Check ==="
              curl -sf "$BASE_URL/health" || { echo "FAIL: health check"; exit 1; }
              echo "PASS: health check"

              echo "=== Smoke Test: API Version ==="
              VERSION=$(curl -sf "$BASE_URL/api/version" | grep -o '"version":"[^"]*"' | head -1)
              echo "Deployed version: $VERSION"
              echo "PASS: API responded"

              echo "=== Smoke Test: Database Connectivity ==="
              curl -sf "$BASE_URL/api/db-ping" || { echo "FAIL: database not reachable"; exit 1; }
              echo "PASS: database connectivity"

              echo "=== All smoke tests passed ==="
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

## Step 2: Create a Flux Notification to Trigger the Smoke Test

Use a Flux Alert to apply the smoke test Job after reconciliation completes:

```yaml
# clusters/staging/notifications/smoke-test-trigger.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: smoke-test-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://your-webhook-handler.example.com/trigger-smoke-test
  secretRef:
    name: smoke-test-webhook-secret
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: smoke-test-on-deploy
  namespace: flux-system
spec:
  providerRef:
    name: smoke-test-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp
      namespace: flux-system
  inclusionList:
    - ".*succeeded.*"
```

## Step 3: Use a Post-Deploy Job Pattern with Kustomize Patches

A more GitOps-native approach is to define the smoke test as part of the application Kustomization and delete it after completion:

```yaml
# apps/myapp/smoke-test-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: smoke-test-script
  namespace: myapp
data:
  run.sh: |
    #!/bin/sh
    set -e

    BASE_URL="${APP_URL:-http://myapp-service:8080}"
    FAILED=0

    run_test() {
      local name="$1"
      local cmd="$2"
      echo -n "Testing: $name ... "
      if eval "$cmd" > /dev/null 2>&1; then
        echo "PASS"
      else
        echo "FAIL"
        FAILED=$((FAILED + 1))
      fi
    }

    run_test "Health endpoint" "curl -sf $BASE_URL/health"
    run_test "Metrics endpoint" "curl -sf $BASE_URL/metrics"
    run_test "API root" "curl -sf $BASE_URL/api/"
    run_test "Static assets" "curl -sf $BASE_URL/static/app.js"

    if [ $FAILED -gt 0 ]; then
      echo "SMOKE TESTS FAILED: $FAILED test(s) failed"
      exit 1
    fi

    echo "All smoke tests passed!"
```

## Step 4: Run Smoke Tests as a GitHub Actions Job via Flux Alert

```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        default: staging
      app_url:
        required: true
        description: 'The application URL to smoke test'

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run smoke tests
        env:
          APP_URL: ${{ github.event.inputs.app_url }}
        run: |
          chmod +x scripts/smoke-test.sh
          ./scripts/smoke-test.sh

      - name: Report results to Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Smoke tests ${{ job.status }} for ${{ github.event.inputs.environment }}",
              "color": "${{ job.status == 'success' && 'good' || 'danger' }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Step 5: Write a Comprehensive Smoke Test Script

```bash
#!/bin/bash
# scripts/smoke-test.sh
set -euo pipefail

APP_URL="${APP_URL:-https://staging.your-app.com}"
TIMEOUT=30
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  actual_status=$(curl -so /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url")

  if [ "$actual_status" == "$expected_status" ]; then
    echo "PASS [$actual_status]: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL [$actual_status != $expected_status]: $name ($url)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Running smoke tests against: $APP_URL"
echo "---"

check "Health check" "$APP_URL/health"
check "API version" "$APP_URL/api/version"
check "Login page" "$APP_URL/login"
check "Metrics endpoint" "$APP_URL/metrics"
check "404 handling" "$APP_URL/nonexistent-page-12345" "404"

echo "---"
echo "Results: $PASS passed, $FAIL failed"

[ $FAIL -eq 0 ] || exit 1
```

## Step 6: Monitor Smoke Test Job Outcomes in the Cluster

```bash
# Watch smoke test job completion
kubectl get jobs -n myapp -l component=smoke-test --watch

# Check logs from the most recent smoke test
kubectl logs -n myapp -l component=smoke-test --tail=50

# Get exit status
kubectl get job myapp-smoke-test -n myapp -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'
```

## Best Practices

- Keep smoke tests under 2 minutes; if they take longer, split them into smoke (fast) and E2E (thorough) suites.
- Test the service mesh or internal DNS resolution in smoke tests to catch networking issues that health checks alone miss.
- Include a version check in smoke tests that verifies the expected image tag is running, not just that the app responds.
- Use `ttlSecondsAfterFinished` on smoke test Jobs to automatically clean up and avoid namespace clutter.
- Integrate smoke test results with your incident management system so failures auto-create incidents.
- Run smoke tests against the Kubernetes Service ClusterIP endpoint, not the external load balancer, to isolate application health from ingress issues.

## Conclusion

Smoke tests after Flux CD deployments provide immediate confidence that a deployment is functional without the overhead of a full E2E suite. By triggering them through Flux notifications and running them as in-cluster Jobs, you keep the feedback loop tight and the entire process within the GitOps framework.

# How to Set Up Automated Testing for Rancher Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Testing, Automation, CI/CD, Helm, Kubernetes, Quality Assurance

Description: Set up automated testing pipelines for Rancher deployments using Helm tests, smoke tests, integration tests, and chaos testing to validate deployments before they reach production.

## Introduction

Automated testing for Kubernetes deployments in Rancher ensures that each deployment is validated before reaching production. Testing runs at multiple gates: Helm chart tests validate the deployed release in-cluster, smoke tests validate the deployed application, integration tests validate service interactions, and chaos tests validate resilience. This guide covers implementing all testing layers.

## Step 1: Helm Chart Tests

Helm tests run in-cluster after deployment to validate the release:

```yaml
# templates/tests/connectivity-test.yaml

apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "myapp.fullname" . }}-test"
  labels:
    "helm.sh/chart": "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  containers:
    - name: test
      image: curlimages/curl:latest
      command: ['/bin/sh', '-c']
      args:
        - |
          # Test API is responding
          curl -sf http://{{ include "myapp.fullname" . }}/health || exit 1
          # Test database connectivity
          curl -sf http://{{ include "myapp.fullname" . }}/api/ping || exit 1
          echo "All tests passed!"
  restartPolicy: Never
```

```bash
# Run Helm tests after deployment and include test pod logs
helm test myapp --namespace production --timeout 5m --logs
```

## Step 2: Smoke Test Suite

```yaml
# Smoke test Job (runs after each deployment)
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test-{{ .Release.Revision }}
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: smoke-test
          image: myregistry/smoke-tests:latest
          env:
            - name: TARGET_URL
              value: "http://{{ include "myapp.fullname" . }}"
            - name: EXPECTED_VERSION
              value: "{{ .Values.image.tag }}"
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "Running smoke tests..."

              # 1. Health check
              STATUS=$(curl -sf -o /dev/null -w "%{http_code}" $TARGET_URL/health)
              [ "$STATUS" = "200" ] || (echo "Health check failed: $STATUS" && exit 1)

              # 2. Version verification
              VERSION=$(curl -sf $TARGET_URL/version | jq -r '.version')
              [ "$VERSION" = "$EXPECTED_VERSION" ] || (echo "Version mismatch: $VERSION != $EXPECTED_VERSION" && exit 1)

              # 3. Critical API endpoint
              curl -sf -X POST $TARGET_URL/api/test \
                -H "Content-Type: application/json" \
                -d '{"test": true}' || (echo "API test failed" && exit 1)

              echo "All smoke tests passed!"
      restartPolicy: Never
```

## Step 3: Integration Test Pipeline

```yaml
# GitHub Actions workflow for Rancher deployment + testing
name: Deploy and Test
on:
  push:
    branches: [main]

jobs:
  deploy-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          helm upgrade --install myapp ./charts/myapp \
            --namespace staging \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 10m \
            --kubeconfig <(echo "${{ secrets.STAGING_KUBECONFIG }}" | base64 -d)

      - name: Run Helm tests
        run: |
          helm test myapp --namespace staging --timeout 5m \
            --kubeconfig <(echo "${{ secrets.STAGING_KUBECONFIG }}" | base64 -d)

      - name: Run integration tests
        run: |
          kubectl run integration-tests \
            --image=myregistry/integration-tests:latest \
            --namespace=staging \
            --env="TARGET=http://myapp.staging.svc" \
            --restart=Never \
            --attach \
            --rm \
            --kubeconfig <(echo "${{ secrets.STAGING_KUBECONFIG }}" | base64 -d)

      - name: Deploy to production (if tests pass)
        if: success()
        run: |
          helm upgrade --install myapp ./charts/myapp \
            --namespace production \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 10m \
            --kubeconfig <(echo "${{ secrets.PROD_KUBECONFIG }}" | base64 -d)
```

## Step 4: Chaos Testing with Litmus

```yaml
# ChaosEngine for pod delete test
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill-test
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: "app=myapp"
    appkind: deployment
  engineState: active
  chaosServiceAccount: pod-delete-sa
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"    # 30 second chaos
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
```

## Step 5: Post-Deployment Validation

```bash
#!/bin/bash
# post_deploy_validate.sh

set -e

NAMESPACE=$1
APP_NAME=$2
EXPECTED_REPLICAS=$3

echo "Validating deployment: $APP_NAME in $NAMESPACE"

# 1. All pods ready
READY=$(kubectl get deployment $APP_NAME -n $NAMESPACE \
  -o jsonpath='{.status.readyReplicas}')
READY=${READY:-0}
if [ "$READY" -ne "$EXPECTED_REPLICAS" ]; then
  echo "ERROR: Expected $EXPECTED_REPLICAS ready pods, got $READY"
  kubectl describe deployment $APP_NAME -n $NAMESPACE
  exit 1
fi

# 2. No recent crash loops
CRASHES=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME \
  -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}')
for count in $CRASHES; do
  if [ "$count" -gt 3 ]; then
    echo "ERROR: Pod crash loop detected (restarts: $count)"
    kubectl logs -n $NAMESPACE -l app=$APP_NAME --tail=50
    exit 1
  fi
done

# 3. Report current CPU usage
CPU_USAGE=$(kubectl top pod -n $NAMESPACE -l app=$APP_NAME \
  --no-headers | awk '{sum+=$2} END {print sum}')
echo "Current CPU usage: ${CPU_USAGE}m"

echo "Validation PASSED: $APP_NAME is healthy"
```

## Conclusion

Automated testing for Rancher deployments creates confidence that every deployment is validated before it impacts users. Helm tests run immediately after deployment in the same cluster, smoke tests validate critical user-facing functionality, integration tests catch cross-service regressions, and chaos tests validate resilience. Integrate all testing layers into CI/CD pipelines with deployment gates-production deploys only after staging tests pass. Track test history to identify flaky tests and regressions early.

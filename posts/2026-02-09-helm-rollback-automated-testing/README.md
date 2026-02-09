# How to Implement Helm Chart Rollback Strategies with Automated Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Testing

Description: Implement robust Helm rollback strategies with automated testing to recover from failed deployments and ensure application reliability in production environments.

---

Helm rollbacks restore previous release versions when upgrades fail or introduce problems. Automated testing combined with rollback strategies creates a safety net for deployments. This approach catches issues quickly and automatically reverts to known-good states without manual intervention.

## Understanding Helm Rollback Mechanics

Every Helm release creates a revision number that increments with each upgrade. Helm stores these revisions as Kubernetes secrets or configmaps in the release namespace. When you rollback, Helm reinstalls the resources from a previous revision.

View release history to see available rollback targets.

```bash
# Show release history
helm history myapp -n production

# Output shows revisions
REVISION  UPDATED                   STATUS      CHART           APP VERSION  DESCRIPTION
1         Mon Feb 5 10:00:00 2026   superseded  myapp-1.0.0     1.0.0        Install complete
2         Tue Feb 6 14:30:00 2026   superseded  myapp-1.1.0     1.1.0        Upgrade complete
3         Wed Feb 7 09:15:00 2026   deployed    myapp-1.2.0     1.2.0        Upgrade complete
```

Rollback to a specific revision.

```bash
# Rollback to previous version
helm rollback myapp -n production

# Rollback to specific revision
helm rollback myapp 2 -n production

# Rollback with wait and timeout
helm rollback myapp -n production --wait --timeout 5m
```

## Implementing Health Checks for Automatic Rollback

Health checks determine whether a deployment succeeds. Use Kubernetes liveness and readiness probes to signal application health.

```yaml
# values.yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

# Rollback configuration
rollback:
  enabled: true
  healthCheckTimeout: 300  # seconds
  failureThreshold: 5
```

Include probes in your deployment template.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        ports:
        - name: http
          containerPort: 8080
        {{- if .Values.livenessProbe }}
        livenessProbe:
          {{- toYaml .Values.livenessProbe | nindent 10 }}
        {{- end }}
        {{- if .Values.readinessProbe }}
        readinessProbe:
          {{- toYaml .Values.readinessProbe | nindent 10 }}
        {{- end }}
```

## Building Automated Health Check Scripts

Create scripts that verify deployment health and trigger rollbacks on failure.

```bash
#!/bin/bash
# scripts/deploy-with-health-check.sh

set -e

RELEASE_NAME=$1
NAMESPACE=$2
CHART_PATH=$3
VALUES_FILE=$4
HEALTH_CHECK_TIMEOUT=${5:-300}

echo "Deploying $RELEASE_NAME in namespace $NAMESPACE..."

# Store current revision before upgrade
CURRENT_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE -o json | jq -r 'last | .revision')
echo "Current revision: $CURRENT_REVISION"

# Perform upgrade
helm upgrade --install $RELEASE_NAME $CHART_PATH \
  --namespace $NAMESPACE \
  --create-namespace \
  --values $VALUES_FILE \
  --wait \
  --timeout 10m

# Get new revision
NEW_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE -o json | jq -r 'last | .revision')
echo "New revision: $NEW_REVISION"

# Function to check deployment health
check_health() {
  local timeout=$1
  local elapsed=0
  local interval=5

  echo "Starting health checks (timeout: ${timeout}s)..."

  while [ $elapsed -lt $timeout ]; do
    # Check if all pods are ready
    NOT_READY=$(kubectl get deployment -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME \
      -o jsonpath='{.items[*].status.conditions[?(@.type=="Available")].status}' | grep -c "False" || true)

    if [ "$NOT_READY" -eq 0 ]; then
      # All deployments available, check pod status
      PODS_READY=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME \
        -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o "True" | wc -l)
      TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME --no-headers | wc -l)

      if [ "$PODS_READY" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
        echo "Health check passed: All $TOTAL_PODS pods are ready"
        return 0
      fi
    fi

    echo "Waiting for pods to be ready... ($elapsed/$timeout seconds)"
    sleep $interval
    elapsed=$((elapsed + interval))
  done

  echo "Health check failed: Timeout after ${timeout}s"
  return 1
}

# Run health checks
if check_health $HEALTH_CHECK_TIMEOUT; then
  echo "Deployment successful!"
  exit 0
else
  echo "Deployment health check failed. Rolling back to revision $CURRENT_REVISION..."

  # Perform rollback
  helm rollback $RELEASE_NAME $CURRENT_REVISION -n $NAMESPACE --wait

  echo "Rollback completed"
  exit 1
fi
```

Use this script in your deployment pipeline.

```bash
# Deploy with automatic rollback on failure
./scripts/deploy-with-health-check.sh myapp production ./mychart values-prod.yaml 300
```

## Integrating Smoke Tests

Run smoke tests after deployment to verify functionality beyond basic health checks.

```bash
#!/bin/bash
# scripts/smoke-test.sh

RELEASE_NAME=$1
NAMESPACE=$2

echo "Running smoke tests for $RELEASE_NAME..."

# Get service endpoint
SERVICE_IP=$(kubectl get svc -n $NAMESPACE ${RELEASE_NAME} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
SERVICE_PORT=$(kubectl get svc -n $NAMESPACE ${RELEASE_NAME} -o jsonpath='{.spec.ports[0].port}')

if [ -z "$SERVICE_IP" ]; then
  # Try ClusterIP if LoadBalancer not available
  SERVICE_IP=$(kubectl get svc -n $NAMESPACE ${RELEASE_NAME} -o jsonpath='{.spec.clusterIP}')
fi

BASE_URL="http://${SERVICE_IP}:${SERVICE_PORT}"

# Test 1: Check health endpoint
echo "Test 1: Health endpoint..."
if curl -f -s "${BASE_URL}/health" > /dev/null; then
  echo "  PASS: Health endpoint responsive"
else
  echo "  FAIL: Health endpoint not responding"
  exit 1
fi

# Test 2: Check API endpoint
echo "Test 2: API endpoint..."
RESPONSE=$(curl -s "${BASE_URL}/api/version")
if echo "$RESPONSE" | jq -e '.version' > /dev/null 2>&1; then
  VERSION=$(echo "$RESPONSE" | jq -r '.version')
  echo "  PASS: API returned version $VERSION"
else
  echo "  FAIL: API did not return valid response"
  exit 1
fi

# Test 3: Check database connectivity
echo "Test 3: Database connectivity..."
DB_STATUS=$(curl -s "${BASE_URL}/health/db" | jq -r '.status')
if [ "$DB_STATUS" = "healthy" ]; then
  echo "  PASS: Database connection healthy"
else
  echo "  FAIL: Database connection failed"
  exit 1
fi

# Test 4: Performance check
echo "Test 4: Response time check..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "${BASE_URL}/api/ping")
THRESHOLD=1.0

if (( $(echo "$RESPONSE_TIME < $THRESHOLD" | bc -l) )); then
  echo "  PASS: Response time ${RESPONSE_TIME}s (threshold: ${THRESHOLD}s)"
else
  echo "  FAIL: Response time ${RESPONSE_TIME}s exceeds threshold ${THRESHOLD}s"
  exit 1
fi

echo "All smoke tests passed!"
exit 0
```

Integrate smoke tests into the deployment script.

```bash
# Enhanced deployment script with smoke tests
#!/bin/bash
set -e

RELEASE_NAME=$1
NAMESPACE=$2

# Deploy with health checks
./scripts/deploy-with-health-check.sh $RELEASE_NAME $NAMESPACE ./mychart values.yaml

# Run smoke tests
if ./scripts/smoke-test.sh $RELEASE_NAME $NAMESPACE; then
  echo "Deployment and smoke tests successful!"
else
  echo "Smoke tests failed, rolling back..."
  PREVIOUS_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE -o json | jq -r '.[-2].revision')
  helm rollback $RELEASE_NAME $PREVIOUS_REVISION -n $NAMESPACE --wait
  exit 1
fi
```

## CI/CD Integration with GitLab

Implement automated rollback in GitLab CI/CD pipelines.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy
  - test
  - rollback

variables:
  RELEASE_NAME: myapp
  NAMESPACE: production
  CHART_PATH: ./charts/myapp

deploy:
  stage: deploy
  image: alpine/helm:latest
  script:
    - helm upgrade --install $RELEASE_NAME $CHART_PATH
        --namespace $NAMESPACE
        --create-namespace
        --values values-prod.yaml
        --wait
        --timeout 10m
    - echo $CI_PIPELINE_ID > deployment_id.txt
  artifacts:
    paths:
      - deployment_id.txt
  only:
    - main

smoke_test:
  stage: test
  image: curlimages/curl:latest
  dependencies:
    - deploy
  script:
    - apk add --no-cache bash jq bc
    - ./scripts/smoke-test.sh $RELEASE_NAME $NAMESPACE
  retry: 2
  only:
    - main

rollback_on_failure:
  stage: rollback
  image: alpine/helm:latest
  script:
    - echo "Tests failed, initiating rollback..."
    - PREVIOUS_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE -o json | jq -r '.[-2].revision')
    - helm rollback $RELEASE_NAME $PREVIOUS_REVISION -n $NAMESPACE --wait
    - echo "Rollback to revision $PREVIOUS_REVISION completed"
  when: on_failure
  only:
    - main
```

## GitHub Actions Implementation

Implement similar logic in GitHub Actions.

```yaml
# .github/workflows/deploy.yaml
name: Deploy with Rollback

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      previous_revision: ${{ steps.get_revision.outputs.previous }}

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Get current revision
        id: get_revision
        run: |
          CURRENT=$(helm history myapp -n production -o json | jq -r 'last | .revision')
          echo "previous=$CURRENT" >> $GITHUB_OUTPUT

      - name: Deploy chart
        run: |
          helm upgrade --install myapp ./charts/myapp \
            --namespace production \
            --create-namespace \
            --values values-prod.yaml \
            --wait \
            --timeout 10m

  test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Run smoke tests
        run: |
          chmod +x ./scripts/smoke-test.sh
          ./scripts/smoke-test.sh myapp production

  rollback:
    needs: [deploy, test]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Rollback release
        run: |
          PREVIOUS_REV="${{ needs.deploy.outputs.previous_revision }}"
          helm rollback myapp $PREVIOUS_REV -n production --wait
          echo "Rolled back to revision $PREVIOUS_REV"
```

## Monitoring Rollback Events

Track rollback events in your monitoring system.

```bash
#!/bin/bash
# scripts/notify-rollback.sh

RELEASE_NAME=$1
NAMESPACE=$2
OLD_REVISION=$3
NEW_REVISION=$4
REASON=$5

# Send notification to Slack
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d @- << EOF
{
  "text": "Helm Rollback Executed",
  "attachments": [
    {
      "color": "danger",
      "fields": [
        {
          "title": "Release",
          "value": "$RELEASE_NAME",
          "short": true
        },
        {
          "title": "Namespace",
          "value": "$NAMESPACE",
          "short": true
        },
        {
          "title": "Reverted From",
          "value": "$NEW_REVISION",
          "short": true
        },
        {
          "title": "Reverted To",
          "value": "$OLD_REVISION",
          "short": true
        },
        {
          "title": "Reason",
          "value": "$REASON",
          "short": false
        }
      ]
    }
  ]
}
EOF

# Create incident in PagerDuty
curl -X POST https://api.pagerduty.com/incidents \
  -H 'Authorization: Token token='$PAGERDUTY_TOKEN \
  -H 'Content-Type: application/json' \
  -d @- << EOF
{
  "incident": {
    "type": "incident",
    "title": "Helm Rollback: $RELEASE_NAME in $NAMESPACE",
    "service": {
      "id": "$PAGERDUTY_SERVICE_ID",
      "type": "service_reference"
    },
    "body": {
      "type": "incident_body",
      "details": "Automatic rollback from revision $NEW_REVISION to $OLD_REVISION. Reason: $REASON"
    }
  }
}
EOF
```

Automated rollback strategies with comprehensive testing protect production environments from failed deployments. Combine Kubernetes health checks, custom smoke tests, and CI/CD integration to detect problems quickly and revert to stable versions automatically. Monitor rollback events and continuously improve your tests to catch issues earlier in the development cycle.

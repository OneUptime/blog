# How to Automate Traffic Shifting with Istio in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Shifting, CI/CD, Kubernetes, Automation

Description: How to automate gradual traffic shifting between service versions using Istio VirtualServices in CI/CD pipelines with scripted weight updates and monitoring.

---

Traffic shifting is the process of gradually moving traffic from one version of a service to another. While canary deployments are a specific use case, traffic shifting is a broader pattern that applies to migrations, A/B testing, blue-green deployments, and feature rollouts. Automating this in CI/CD gives you repeatable, safe deployments.

This post focuses on the automation mechanics - the scripts, pipeline configurations, and monitoring hooks you need to shift traffic reliably.

## The Traffic Shift Controller Script

Instead of hardcoding weight progressions in your CI pipeline, use a reusable script that handles the shifting logic:

```bash
#!/bin/bash
# traffic-shift.sh
# Usage: ./traffic-shift.sh <namespace> <virtualservice> <target-subset> <step-size> <interval> <max-error-rate>

NAMESPACE=$1
VS_NAME=$2
TARGET_SUBSET=$3
STEP_SIZE=${4:-10}
INTERVAL=${5:-120}
MAX_ERROR_RATE=${6:-1.0}

CURRENT_WEIGHT=0
SOURCE_SUBSET="stable"

echo "Starting traffic shift to $TARGET_SUBSET"
echo "Step size: $STEP_SIZE%, Interval: ${INTERVAL}s, Max error rate: ${MAX_ERROR_RATE}%"

while [ $CURRENT_WEIGHT -lt 100 ]; do
  CURRENT_WEIGHT=$((CURRENT_WEIGHT + STEP_SIZE))
  if [ $CURRENT_WEIGHT -gt 100 ]; then
    CURRENT_WEIGHT=100
  fi

  SOURCE_WEIGHT=$((100 - CURRENT_WEIGHT))

  echo "Shifting traffic: $SOURCE_SUBSET=$SOURCE_WEIGHT%, $TARGET_SUBSET=$CURRENT_WEIGHT%"

  kubectl patch virtualservice "$VS_NAME" -n "$NAMESPACE" --type=merge -p "
    {\"spec\":{\"http\":[{\"route\":[
      {\"destination\":{\"host\":\"my-app.${NAMESPACE}.svc.cluster.local\",\"subset\":\"$SOURCE_SUBSET\"},\"weight\":$SOURCE_WEIGHT},
      {\"destination\":{\"host\":\"my-app.${NAMESPACE}.svc.cluster.local\",\"subset\":\"$TARGET_SUBSET\"},\"weight\":$CURRENT_WEIGHT}
    ]}]}}"

  echo "Waiting ${INTERVAL}s before checking metrics..."
  sleep "$INTERVAL"

  # Check error rate
  ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"my-app-${TARGET_SUBSET}\",response_code=~\"5..\"}[2m])) / sum(rate(istio_requests_total{destination_workload=\"my-app-${TARGET_SUBSET}\"}[2m])) * 100" \
    | jq -r '.data.result[0].value[1] // "0"')

  echo "Current error rate: ${ERROR_RATE}%"

  if (( $(echo "$ERROR_RATE > $MAX_ERROR_RATE" | bc -l) )); then
    echo "Error rate exceeded threshold. Rolling back."
    kubectl patch virtualservice "$VS_NAME" -n "$NAMESPACE" --type=merge -p "
      {\"spec\":{\"http\":[{\"route\":[
        {\"destination\":{\"host\":\"my-app.${NAMESPACE}.svc.cluster.local\",\"subset\":\"$SOURCE_SUBSET\"},\"weight\":100},
        {\"destination\":{\"host\":\"my-app.${NAMESPACE}.svc.cluster.local\",\"subset\":\"$TARGET_SUBSET\"},\"weight\":0}
      ]}]}}"
    exit 1
  fi
done

echo "Traffic shift complete. All traffic now goes to $TARGET_SUBSET"
```

## Using the Script in GitHub Actions

```yaml
name: Traffic Shift
on:
  workflow_dispatch:
    inputs:
      target_version:
        description: 'Target version tag'
        required: true
      step_size:
        description: 'Weight increment per step'
        required: false
        default: '10'
      interval:
        description: 'Seconds between steps'
        required: false
        default: '120'

jobs:
  shift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy target version
        run: |
          kubectl set image deployment/my-app-canary \
            my-app=my-app:${{ github.event.inputs.target_version }} -n app
          kubectl rollout status deployment/my-app-canary -n app --timeout=300s

      - name: Execute traffic shift
        run: |
          chmod +x scripts/traffic-shift.sh
          ./scripts/traffic-shift.sh app my-app canary \
            ${{ github.event.inputs.step_size }} \
            ${{ github.event.inputs.interval }} \
            1.0

      - name: Promote and clean up
        run: |
          kubectl set image deployment/my-app-stable \
            my-app=my-app:${{ github.event.inputs.target_version }} -n app
          kubectl rollout status deployment/my-app-stable -n app

          kubectl patch virtualservice my-app -n app --type=merge -p '
            {"spec":{"http":[{"route":[
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"stable"},"weight":100},
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"canary"},"weight":0}
            ]}]}}'
```

## GitLab CI Integration

```yaml
traffic_shift:
  stage: deploy
  script:
    - kubectl set image deployment/my-app-canary my-app=my-app:${CI_COMMIT_SHA} -n app
    - kubectl rollout status deployment/my-app-canary -n app --timeout=300s
    - ./scripts/traffic-shift.sh app my-app canary 10 120 1.0
    - kubectl set image deployment/my-app-stable my-app=my-app:${CI_COMMIT_SHA} -n app
  environment:
    name: production
  when: manual
```

## Jenkins Pipeline

```groovy
pipeline {
    agent any

    parameters {
        string(name: 'TARGET_VERSION', description: 'Target version to deploy')
        string(name: 'STEP_SIZE', defaultValue: '10', description: 'Weight increment')
        string(name: 'INTERVAL', defaultValue: '120', description: 'Seconds between steps')
    }

    stages {
        stage('Deploy Canary') {
            steps {
                sh """
                    kubectl set image deployment/my-app-canary \
                        my-app=my-app:${params.TARGET_VERSION} -n app
                    kubectl rollout status deployment/my-app-canary -n app --timeout=300s
                """
            }
        }

        stage('Traffic Shift') {
            steps {
                sh """
                    ./scripts/traffic-shift.sh app my-app canary \
                        ${params.STEP_SIZE} ${params.INTERVAL} 1.0
                """
            }
        }

        stage('Promote') {
            steps {
                sh """
                    kubectl set image deployment/my-app-stable \
                        my-app=my-app:${params.TARGET_VERSION} -n app
                    kubectl rollout status deployment/my-app-stable -n app
                """
            }
        }
    }

    post {
        failure {
            sh '''
                kubectl patch virtualservice my-app -n app --type=merge -p '
                    {"spec":{"http":[{"route":[
                        {"destination":{"host":"my-app.app.svc.cluster.local","subset":"stable"},"weight":100},
                        {"destination":{"host":"my-app.app.svc.cluster.local","subset":"canary"},"weight":0}
                    ]}]}}'
            '''
        }
    }
}
```

## Multiple Metric Checks

A production-grade traffic shift should check more than just error rates. Here is an enhanced metrics check function:

```bash
check_metrics() {
  local workload=$1
  local namespace=$2
  local prometheus_url="http://prometheus.monitoring:9090"

  # Error rate
  local error_rate=$(curl -s "$prometheus_url/api/v1/query" \
    --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"${workload}\",response_code=~\"5..\",namespace=\"${namespace}\"}[2m])) / sum(rate(istio_requests_total{destination_workload=\"${workload}\",namespace=\"${namespace}\"}[2m])) * 100" \
    | jq -r '.data.result[0].value[1] // "0"')

  # P99 latency
  local p99=$(curl -s "$prometheus_url/api/v1/query" \
    --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"${workload}\",namespace=\"${namespace}\"}[2m])) by (le))" \
    | jq -r '.data.result[0].value[1] // "0"')

  # Request rate (to ensure we have enough traffic for meaningful metrics)
  local rps=$(curl -s "$prometheus_url/api/v1/query" \
    --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"${workload}\",namespace=\"${namespace}\"}[2m]))" \
    | jq -r '.data.result[0].value[1] // "0"')

  echo "Error rate: ${error_rate}%, P99: ${p99}ms, RPS: ${rps}"

  # Minimum traffic threshold
  if (( $(echo "$rps < 0.1" | bc -l) )); then
    echo "Warning: not enough traffic for meaningful metrics"
    return 0
  fi

  # Check thresholds
  if (( $(echo "$error_rate > 1.0" | bc -l) )); then
    echo "FAIL: Error rate too high"
    return 1
  fi

  if (( $(echo "$p99 > 1000" | bc -l) )); then
    echo "FAIL: P99 latency too high"
    return 1
  fi

  return 0
}
```

## Tracking Shift Progress

Store the current traffic state in a ConfigMap so other tools and dashboards can see it:

```bash
update_shift_status() {
  local namespace=$1
  local stable_weight=$2
  local canary_weight=$3
  local version=$4

  kubectl create configmap traffic-shift-status -n "$namespace" \
    --from-literal=stable-weight="$stable_weight" \
    --from-literal=canary-weight="$canary_weight" \
    --from-literal=canary-version="$version" \
    --from-literal=last-updated="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --dry-run=client -o yaml | kubectl apply -f -
}
```

## Handling Multiple Services

When shifting traffic for microservices that need to be updated together, coordinate the shifts:

```bash
SERVICES=("api-gateway" "order-service" "payment-service")

for service in "${SERVICES[@]}"; do
  echo "Deploying canary for $service"
  kubectl set image "deployment/${service}-canary" \
    "${service}=my-registry/${service}:${NEW_VERSION}" -n app
  kubectl rollout status "deployment/${service}-canary" -n app --timeout=120s
done

# Shift all services simultaneously
for weight in 10 25 50 75 100; do
  stable_weight=$((100 - weight))
  for service in "${SERVICES[@]}"; do
    kubectl patch virtualservice "$service" -n app --type=merge -p "
      {\"spec\":{\"http\":[{\"route\":[
        {\"destination\":{\"host\":\"${service}.app.svc.cluster.local\",\"subset\":\"stable\"},\"weight\":$stable_weight},
        {\"destination\":{\"host\":\"${service}.app.svc.cluster.local\",\"subset\":\"canary\"},\"weight\":$weight}
      ]}]}}"
  done

  sleep 120

  # Check all services
  for service in "${SERVICES[@]}"; do
    check_metrics "${service}-canary" "app" || exit 1
  done
done
```

## Notifications

Integrate Slack or other notifications to keep the team informed:

```bash
notify_slack() {
  local message=$1
  local color=${2:-"good"}

  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}"
}

# In the shift loop:
notify_slack "Traffic shifted to ${CURRENT_WEIGHT}% canary. Error rate: ${ERROR_RATE}%"

# On failure:
notify_slack "Canary rollback triggered at ${CURRENT_WEIGHT}%. Error rate: ${ERROR_RATE}%" "danger"
```

Automating traffic shifting with Istio turns a risky manual process into a repeatable, observable operation. The reusable shift script handles the progression logic, metric checks provide automated safety gates, and CI/CD integration makes it part of your normal deployment workflow. The key is building in monitoring at every step and having clear rollback behavior when things go wrong.

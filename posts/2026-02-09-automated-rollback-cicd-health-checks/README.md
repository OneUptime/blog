# How to Implement Automated Rollback in CI/CD When Kubernetes Health Checks Fail Post-Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CI/CD, Rollback, Health Checks, Reliability

Description: Implement automated rollback mechanisms in CI/CD pipelines that monitor Kubernetes health checks and application metrics after deployment, automatically reverting to previous versions when issues are detected.

---

Automated rollback prevents failed deployments from impacting users by detecting problems and reverting to stable versions without manual intervention. By monitoring health checks, metrics, and application behavior immediately after deployment, you can catch issues early and roll back automatically. This guide demonstrates building comprehensive automated rollback systems for Kubernetes CI/CD pipelines.

## Understanding Health-Based Rollback

Kubernetes provides readiness and liveness probes that indicate pod health. Automated rollback monitors these probes plus additional metrics after deployment, triggering rollback when health degrades. This approach catches issues that pass pre-deployment validation but fail under real traffic.

## Configuring Kubernetes Health Checks

Define comprehensive health checks:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:v1.0.0
          ports:
            - containerPort: 8080

          # Startup probe for slow-starting apps
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            failureThreshold: 30
            periodSeconds: 10

          # Readiness probe
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3

          # Liveness probe
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
```

## GitHub Actions with Automated Rollback

Implement rollback in GitHub Actions:

```yaml
name: Deploy with Automated Rollback
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push image
        run: |
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/myapp \
            myapp=registry.example.com/myapp:${{ github.sha }} \
            -n production \
            --record

      - name: Monitor rollout
        id: rollout
        timeout-minutes: 10
        continue-on-error: true
        run: |
          kubectl rollout status deployment/myapp \
            -n production \
            --timeout=10m

      - name: Wait for health checks
        if: steps.rollout.outcome == 'success'
        id: health
        timeout-minutes: 5
        continue-on-error: true
        run: |
          #!/bin/bash
          set -e

          echo "Waiting for pods to become ready..."
          sleep 30

          # Check pod readiness
          READY_PODS=$(kubectl get deployment myapp -n production \
            -o jsonpath='{.status.readyReplicas}')
          DESIRED_PODS=$(kubectl get deployment myapp -n production \
            -o jsonpath='{.spec.replicas}')

          if [ "$READY_PODS" != "$DESIRED_PODS" ]; then
            echo "Not all pods are ready: $READY_PODS/$DESIRED_PODS"
            exit 1
          fi

          # Check pod status
          FAILING_PODS=$(kubectl get pods -n production \
            -l app=myapp \
            --field-selector=status.phase!=Running \
            -o name | wc -l)

          if [ "$FAILING_PODS" -gt 0 ]; then
            echo "Found $FAILING_PODS failing pods"
            exit 1
          fi

          echo "All health checks passed"

      - name: Validate application metrics
        if: steps.health.outcome == 'success'
        id: metrics
        timeout-minutes: 3
        continue-on-error: true
        run: |
          #!/bin/bash

          # Wait for metrics collection
          sleep 60

          # Check error rate
          ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query' \
            --data-urlencode 'query=sum(rate(http_requests_total{app="myapp",status=~"5.."}[2m]))/sum(rate(http_requests_total{app="myapp"}[2m]))' | \
            jq -r '.data.result[0].value[1]')

          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "Error rate too high: $ERROR_RATE"
            exit 1
          fi

          # Check response time
          P95_LATENCY=$(curl -s 'http://prometheus:9090/api/v1/query' \
            --data-urlencode 'query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{app="myapp"}[2m]))*1000' | \
            jq -r '.data.result[0].value[1]')

          if (( $(echo "$P95_LATENCY > 1000" | bc -l) )); then
            echo "Latency too high: ${P95_LATENCY}ms"
            exit 1
          fi

          echo "Metrics validation passed"

      - name: Rollback on failure
        if: |
          steps.rollout.outcome == 'failure' ||
          steps.health.outcome == 'failure' ||
          steps.metrics.outcome == 'failure'
        run: |
          echo "Deployment failed health checks, rolling back..."

          # Get previous revision
          PREVIOUS_REVISION=$(kubectl rollout history deployment/myapp -n production | \
            tail -2 | head -1 | awk '{print $1}')

          echo "Rolling back to revision: $PREVIOUS_REVISION"

          # Rollback
          kubectl rollout undo deployment/myapp -n production

          # Wait for rollback
          kubectl rollout status deployment/myapp -n production --timeout=5m

          # Verify rollback success
          READY_PODS=$(kubectl get deployment myapp -n production \
            -o jsonpath='{.status.readyReplicas}')
          DESIRED_PODS=$(kubectl get deployment myapp -n production \
            -o jsonpath='{.spec.replicas}')

          if [ "$READY_PODS" == "$DESIRED_PODS" ]; then
            echo "✓ Rollback completed successfully"
          else
            echo "✗ Rollback may have issues"
            exit 1
          fi

      - name: Send notification
        if: always()
        run: |
          if [ "${{ steps.metrics.outcome }}" == "success" ]; then
            STATUS="✓ SUCCESS"
            COLOR="good"
          else
            STATUS="✗ FAILED - Rolled back"
            COLOR="danger"
          fi

          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d "{
              \"text\": \"Deployment ${STATUS}\",
              \"attachments\": [{
                \"color\": \"${COLOR}\",
                \"fields\": [
                  {\"title\": \"Application\", \"value\": \"myapp\", \"short\": true},
                  {\"title\": \"Commit\", \"value\": \"${{ github.sha }}\", \"short\": true}
                ]
              }]
            }"

      - name: Fail pipeline on rollback
        if: |
          steps.rollout.outcome == 'failure' ||
          steps.health.outcome == 'failure' ||
          steps.metrics.outcome == 'failure'
        run: exit 1
```

## Tekton Pipeline with Rollback

Create Tekton rollback task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: deploy-with-rollback
spec:
  params:
    - name: namespace
    - name: deployment
    - name: image
    - name: health-check-timeout
      default: "5m"
    - name: metrics-check-duration
      default: "120s"

  results:
    - name: deployment-status
    - name: rollback-triggered

  steps:
    - name: deploy
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        kubectl set image deployment/$(params.deployment) \
          $(params.deployment)=$(params.image) \
          -n $(params.namespace) \
          --record

    - name: wait-rollout
      image: bitnami/kubectl:latest
      timeout: 10m
      onError: continue
      script: |
        #!/bin/bash

        kubectl rollout status deployment/$(params.deployment) \
          -n $(params.namespace) \
          --timeout=$(params.health-check-timeout)

        if [ $? -ne 0 ]; then
          echo "Rollout failed"
          echo -n "failed" > /tekton/steps/step-wait-rollout/exitCode
        fi

    - name: health-check
      image: curlimages/curl:latest
      timeout: 5m
      onError: continue
      script: |
        #!/bin/sh

        sleep 30

        # Get service endpoint
        SERVICE_IP=$(kubectl get svc $(params.deployment) \
          -n $(params.namespace) \
          -o jsonpath='{.spec.clusterIP}')

        # Health check
        for i in $(seq 1 10); do
          if curl -f http://$SERVICE_IP:8080/health; then
            echo "Health check passed"
            exit 0
          fi
          sleep 5
        done

        echo "Health check failed"
        exit 1

    - name: metrics-check
      image: curlimages/curl:latest
      timeout: 3m
      onError: continue
      script: |
        #!/bin/sh

        sleep $(params.metrics-check-duration)

        # Query Prometheus
        ERROR_RATE=$(curl -s 'http://prometheus.monitoring:9090/api/v1/query' \
          --data-urlencode 'query=rate(http_requests_total{app="$(params.deployment)",status=~"5.."}[2m])' | \
          jq -r '.data.result[0].value[1]')

        if [ "$(echo "$ERROR_RATE > 0.01" | bc)" -eq 1 ]; then
          echo "Error rate too high: $ERROR_RATE"
          exit 1
        fi

        echo "Metrics check passed"

    - name: rollback-on-failure
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash

        # Check if any previous step failed
        if [ -f /tekton/steps/step-wait-rollout/exitCode ] || \
           [ -f /tekton/steps/step-health-check/exitCode ] || \
           [ -f /tekton/steps/step-metrics-check/exitCode ]; then

          echo "Deployment failed checks, initiating rollback..."
          echo -n "true" > $(results.rollback-triggered.path)

          kubectl rollout undo deployment/$(params.deployment) \
            -n $(params.namespace)

          kubectl rollout status deployment/$(params.deployment) \
            -n $(params.namespace) \
            --timeout=5m

          echo -n "rolled-back" > $(results.deployment-status.path)

          # Fail the task
          exit 1
        else
          echo "Deployment successful"
          echo -n "false" > $(results.rollback-triggered.path)
          echo -n "success" > $(results.deployment-status.path)
        fi
```

## Progressive Rollout with Canary Analysis

Implement canary-based rollback:

```yaml
- name: Deploy canary
  run: |
    # Deploy canary with 10% traffic
    kubectl apply -f - <<EOF
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: myapp-canary
      namespace: production
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: myapp
          version: canary
      template:
        metadata:
          labels:
            app: myapp
            version: canary
        spec:
          containers:
          - name: myapp
            image: registry.example.com/myapp:${{ github.sha }}
    EOF

- name: Monitor canary
  timeout-minutes: 10
  run: |
    sleep 300  # 5 minute monitoring

    # Compare canary vs stable metrics
    CANARY_ERROR_RATE=$(curl -s prometheus/query?query=rate(errors{version="canary"}[5m]))
    STABLE_ERROR_RATE=$(curl -s prometheus/query?query=rate(errors{version="stable"}[5m]))

    if [ "$CANARY_ERROR_RATE" > "$((STABLE_ERROR_RATE * 2))" ]; then
      echo "Canary showing elevated errors, aborting..."
      kubectl delete deployment myapp-canary -n production
      exit 1
    fi

- name: Promote canary
  run: |
    # Update main deployment
    kubectl set image deployment/myapp \
      myapp=registry.example.com/myapp:${{ github.sha }} \
      -n production

    # Remove canary
    kubectl delete deployment myapp-canary -n production
```

## Conclusion

Automated rollback based on health checks and metrics prevents failed deployments from impacting users. By continuously monitoring pod health, application metrics, and business indicators immediately after deployment, your CI/CD pipeline can detect issues early and automatically revert to stable versions. This approach reduces meantime to recovery, prevents manual intervention delays, and maintains service reliability. Combined with proper monitoring, alerting, and progressive delivery strategies, automated rollback becomes a critical safety mechanism for production deployments.

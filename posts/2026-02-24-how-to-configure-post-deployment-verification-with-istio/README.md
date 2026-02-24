# How to Configure Post-Deployment Verification with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Post-Deployment Verification, Monitoring, Kubernetes, SRE

Description: How to set up automated post-deployment verification using Istio metrics to validate releases and trigger rollbacks when issues are detected.

---

Deploying a new version is only half the battle. The other half is making sure it actually works in production. Post-deployment verification uses real traffic metrics to confirm that a new release is behaving correctly. With Istio, you have access to rich telemetry data that makes this verification both thorough and automated.

The idea is simple: after you deploy, watch the metrics for a defined period. If error rates spike, latency increases, or any other signal crosses a threshold, automatically roll back. If everything looks good after the verification window, mark the deployment as successful.

## What Metrics to Verify

Istio gives you several metrics that are useful for post-deployment checks:

**Request success rate** - The percentage of non-5xx responses:
```
sum(rate(istio_requests_total{destination_workload="my-app",response_code!~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_workload="my-app"}[5m]))
```

**P99 latency** - The worst-case response time:
```
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload="my-app"}[5m])) by (le))
```

**Request throughput** - Make sure traffic is actually flowing:
```
sum(rate(istio_requests_total{destination_workload="my-app"}[5m]))
```

**TCP connection errors** - For non-HTTP services:
```
sum(rate(istio_tcp_connections_closed_total{destination_workload="my-app",response_flags!=""}[5m]))
```

## Building a Verification Script

Here's a bash script that checks Istio metrics after deployment:

```bash
#!/bin/bash
set -e

PROM_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
APP_NAME="${1:?Usage: verify.sh <app-name> <namespace>}"
NAMESPACE="${2:?Usage: verify.sh <app-name> <namespace>}"
DURATION="${3:-300}"  # Verification window in seconds
CHECK_INTERVAL="${4:-30}"  # Seconds between checks
SUCCESS_THRESHOLD="${5:-0.99}"  # 99% success rate
LATENCY_THRESHOLD="${6:-500}"  # 500ms P99

echo "Starting post-deployment verification for ${APP_NAME} in ${NAMESPACE}"
echo "Duration: ${DURATION}s, Check interval: ${CHECK_INTERVAL}s"
echo "Success threshold: ${SUCCESS_THRESHOLD}, Latency threshold: ${LATENCY_THRESHOLD}ms"

END_TIME=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $END_TIME ]; do
    # Check success rate
    SUCCESS_RATE=$(curl -s "${PROM_URL}/api/v1/query" \
        --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}\",namespace=\"${NAMESPACE}\",response_code!~\"5.*\"}[2m]))/sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}\",namespace=\"${NAMESPACE}\"}[2m]))" \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1] if d['data']['result'] else '1')")

    # Check P99 latency
    LATENCY=$(curl -s "${PROM_URL}/api/v1/query" \
        --data-urlencode "query=histogram_quantile(0.99,sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"${APP_NAME}\",namespace=\"${NAMESPACE}\"}[2m])) by (le))" \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1] if d['data']['result'] else '0')")

    echo "[$(date)] Success rate: ${SUCCESS_RATE} | P99 latency: ${LATENCY}ms"

    # Check thresholds
    FAIL=0
    if (( $(echo "${SUCCESS_RATE} < ${SUCCESS_THRESHOLD}" | bc -l) )); then
        echo "FAILURE: Success rate ${SUCCESS_RATE} below threshold ${SUCCESS_THRESHOLD}"
        FAIL=1
    fi

    if (( $(echo "${LATENCY} > ${LATENCY_THRESHOLD}" | bc -l) )); then
        echo "FAILURE: P99 latency ${LATENCY}ms above threshold ${LATENCY_THRESHOLD}ms"
        FAIL=1
    fi

    if [ $FAIL -eq 1 ]; then
        echo "Post-deployment verification FAILED. Triggering rollback."
        exit 1
    fi

    sleep $CHECK_INTERVAL
done

echo "Post-deployment verification PASSED. All metrics within thresholds."
exit 0
```

## Automating Verification with a Kubernetes Job

Wrap the verification in a Kubernetes Job that runs after deployment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: post-deploy-verify
  namespace: default
spec:
  backoffLimit: 0
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      restartPolicy: Never
      containers:
      - name: verifier
        image: curlimages/curl:latest
        command: ["/bin/sh"]
        args:
        - -c
        - |
          PROM_URL="http://prometheus.monitoring.svc.cluster.local:9090"
          APP_NAME="my-app"
          NAMESPACE="default"

          echo "Waiting 60s for metrics to accumulate..."
          sleep 60

          for i in $(seq 1 10); do
            SUCCESS_RATE=$(curl -s "${PROM_URL}/api/v1/query" \
              --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}\",namespace=\"${NAMESPACE}\",response_code!~\"5.*\"}[2m]))/sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}\",namespace=\"${NAMESPACE}\"}[2m]))" \
              | grep -o '"value":\[.*\]' | grep -o '[0-9.]*"' | head -1 | tr -d '"')

            echo "Check ${i}/10: Success rate = ${SUCCESS_RATE}"

            if [ "$(echo "${SUCCESS_RATE} < 0.99" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
              echo "FAILED: Success rate below 99%"
              exit 1
            fi

            sleep 30
          done

          echo "All checks passed"
```

## Using Flagger for Automated Verification

For a more robust solution, Flagger automates the entire post-deployment verification process. It watches Istio metrics and automatically promotes or rolls back:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 8080
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.default/
      type: rollout
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://my-app.default.svc.cluster.local:8080/"
```

Flagger's analysis section defines the post-deployment verification logic:
- Check every 30 seconds
- Fail if more than 5 consecutive checks fail
- Require 99% success rate
- Require P99 latency under 500ms

## Custom Metrics for Verification

Beyond the standard Istio metrics, you can verify business-specific metrics. Define custom metrics in Flagger:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate-by-path
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  query: |
    sum(rate(istio_requests_total{
      destination_workload="{{ target }}",
      namespace="{{ namespace }}",
      request_path=~"/api/v1/.*",
      response_code=~"5.*"
    }[{{ interval }}]))
    /
    sum(rate(istio_requests_total{
      destination_workload="{{ target }}",
      namespace="{{ namespace }}",
      request_path=~"/api/v1/.*"
    }[{{ interval }}]))
```

Reference this in your Canary analysis:

```yaml
spec:
  analysis:
    metrics:
    - name: api-error-rate
      templateRef:
        name: error-rate-by-path
        namespace: default
      thresholdRange:
        max: 0.01
      interval: 1m
```

## Setting Up Prometheus Alerts as a Backup

Even with automated verification, set up Prometheus alerts as a safety net:

```yaml
groups:
- name: post-deployment
  rules:
  - alert: HighErrorRateAfterDeploy
    expr: |
      (
        sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_workload, namespace)
        /
        sum(rate(istio_requests_total{}[5m])) by (destination_workload, namespace)
      ) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected for {{ $labels.destination_workload }}"
      description: "Error rate is {{ $value }} which exceeds 5% threshold"

  - alert: HighLatencyAfterDeploy
    expr: |
      histogram_quantile(0.99,
        sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_workload, namespace, le)
      ) > 1000
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High P99 latency for {{ $labels.destination_workload }}"
      description: "P99 latency is {{ $value }}ms"
```

## Integration with CI/CD Pipelines

Most CI/CD tools support running a verification step after deployment. Here's how to hook it up:

```yaml
# In your CI/CD pipeline (example: GitHub Actions)
steps:
  - name: Deploy
    run: kubectl apply -f manifests/

  - name: Wait for rollout
    run: kubectl rollout status deployment/my-app -n default --timeout=300s

  - name: Post-deployment verification
    run: |
      ./verify.sh my-app default 300 30 0.99 500
    timeout-minutes: 10

  - name: Rollback on failure
    if: failure()
    run: kubectl rollout undo deployment/my-app -n default
```

Post-deployment verification transforms deployments from a "deploy and hope" process into a "deploy and confirm" process. By leveraging the metrics that Istio already collects, you can build automated verification without instrumenting your application code. Start with success rate and latency checks, and add more specific metrics as you understand your service's behavior patterns.

# How to Configure Kubernetes Deployment Gates Using Prometheus Metrics in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, CI/CD, Monitoring, Deployment

Description: Implement intelligent deployment gates that query Prometheus metrics to validate application health and performance before promoting deployments through CI/CD stages with automated rollback on failures.

---

Deployment gates that check real metrics prevent unhealthy releases from progressing. By querying Prometheus during CI/CD workflows, you validate that applications meet performance and reliability thresholds before proceeding. This guide demonstrates building metric-based deployment gates that automatically block or roll back problematic releases.

## Understanding Metric-Based Gates

Traditional deployment gates check basic health endpoints. Metric-based gates evaluate actual application behavior through Prometheus queries, checking error rates, latency percentiles, resource usage, and business metrics before allowing deployments to progress. This provides deeper validation based on real observed behavior.

## Setting Up Prometheus

Ensure Prometheus is collecting metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
```

## Creating a Metrics Validation Script

Build a reusable validation script:

```python
# validate_metrics.py
import requests
import sys
import time
from datetime import datetime, timedelta

class PrometheusGate:
    def __init__(self, prometheus_url):
        self.url = prometheus_url

    def query(self, query):
        response = requests.get(
            f"{self.url}/api/v1/query",
            params={"query": query}
        )
        response.raise_for_status()
        result = response.json()

        if result["status"] != "success":
            raise Exception(f"Query failed: {result}")

        return result["data"]["result"]

    def check_error_rate(self, app, namespace, threshold=0.01, duration="5m"):
        query = f'''
          sum(rate(http_requests_total{{
            app="{app}",
            namespace="{namespace}",
            status=~"5.."
          }}[{duration}]))
          /
          sum(rate(http_requests_total{{
            app="{app}",
            namespace="{namespace}"
          }}[{duration}]))
        '''

        results = self.query(query)

        if not results:
            print(f"No data found for {app} in {namespace}")
            return False

        error_rate = float(results[0]["value"][1])
        print(f"Error rate: {error_rate:.4f} (threshold: {threshold})")

        return error_rate < threshold

    def check_latency(self, app, namespace, percentile=95, threshold_ms=1000, duration="5m"):
        query = f'''
          histogram_quantile(0.{percentile},
            sum(rate(http_request_duration_seconds_bucket{{
              app="{app}",
              namespace="{namespace}"
            }}[{duration}])) by (le)
          ) * 1000
        '''

        results = self.query(query)

        if not results:
            print(f"No latency data found for {app}")
            return False

        latency_ms = float(results[0]["value"][1])
        print(f"P{percentile} latency: {latency_ms:.2f}ms (threshold: {threshold_ms}ms)")

        return latency_ms < threshold_ms

    def check_cpu_usage(self, app, namespace, threshold=80, duration="5m"):
        query = f'''
          avg(rate(container_cpu_usage_seconds_total{{
            pod=~"{app}-.*",
            namespace="{namespace}"
          }}[{duration}])) * 100
        '''

        results = self.query(query)

        if not results:
            print(f"No CPU data found for {app}")
            return False

        cpu_percent = float(results[0]["value"][1])
        print(f"CPU usage: {cpu_percent:.2f}% (threshold: {threshold}%)")

        return cpu_percent < threshold

def main():
    prometheus_url = sys.argv[1]
    app = sys.argv[2]
    namespace = sys.argv[3]

    gate = PrometheusGate(prometheus_url)

    checks = [
        ("Error Rate", gate.check_error_rate(app, namespace, threshold=0.01)),
        ("P95 Latency", gate.check_latency(app, namespace, percentile=95, threshold_ms=1000)),
        ("CPU Usage", gate.check_cpu_usage(app, namespace, threshold=80)),
    ]

    print("\nDeployment Gate Results:")
    print("-" * 40)

    all_passed = True
    for name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False

    print("-" * 40)

    if all_passed:
        print("All checks passed. Deployment may proceed.")
        sys.exit(0)
    else:
        print("One or more checks failed. Deployment blocked.")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## GitHub Actions Integration

Use metrics gates in GitHub Actions:

```yaml
name: Deploy with Metrics Gates
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          kubectl set image deployment/myapp \
            myapp=registry.example.com/myapp:${{ github.sha }} \
            -n staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/myapp -n staging --timeout=5m

      - name: Wait for metrics collection
        run: sleep 60

      - name: Validate staging metrics
        run: |
          python validate_metrics.py \
            http://prometheus.monitoring.svc.cluster.local:9090 \
            myapp \
            staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          kubectl set image deployment/myapp \
            myapp=registry.example.com/myapp:${{ github.sha }} \
            -n production

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/myapp -n production --timeout=10m

      - name: Monitor production metrics
        run: |
          # Wait for metrics
          sleep 120

          # Validate metrics
          if ! python validate_metrics.py \
            http://prometheus.monitoring.svc.cluster.local:9090 \
            myapp \
            production; then
            echo "Production metrics validation failed. Rolling back..."
            kubectl rollout undo deployment/myapp -n production
            exit 1
          fi
```

## Tekton Pipeline with Gates

Create a Tekton task for metrics validation:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: validate-prometheus-metrics
spec:
  params:
    - name: prometheus-url
    - name: app-name
    - name: namespace
    - name: error-rate-threshold
      default: "0.01"
    - name: latency-threshold-ms
      default: "1000"
    - name: wait-time
      default: "60"

  steps:
    - name: wait-for-metrics
      image: alpine:latest
      script: |
        #!/bin/sh
        echo "Waiting $(params.wait-time) seconds for metrics collection..."
        sleep $(params.wait-time)

    - name: check-error-rate
      image: curlimages/curl:latest
      script: |
        #!/bin/sh
        QUERY='sum(rate(http_requests_total{app="$(params.app-name)",namespace="$(params.namespace)",status=~"5.."}[5m]))/sum(rate(http_requests_total{app="$(params.app-name)",namespace="$(params.namespace)"}[5m]))'

        RESULT=$(curl -s '$(params.prometheus-url)/api/v1/query' \
          --data-urlencode "query=$QUERY" | \
          jq -r '.data.result[0].value[1]')

        echo "Error rate: $RESULT"

        if [ "$(echo "$RESULT < $(params.error-rate-threshold)" | bc)" -eq 1 ]; then
          echo "✓ Error rate check passed"
        else
          echo "✗ Error rate too high"
          exit 1
        fi

    - name: check-latency
      image: curlimages/curl:latest
      script: |
        #!/bin/sh
        QUERY='histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{app="$(params.app-name)",namespace="$(params.namespace)"}[5m]))by(le))*1000'

        RESULT=$(curl -s '$(params.prometheus-url)/api/v1/query' \
          --data-urlencode "query=$QUERY" | \
          jq -r '.data.result[0].value[1]')

        echo "P95 latency: ${RESULT}ms"

        if [ "$(echo "$RESULT < $(params.latency-threshold-ms)" | bc)" -eq 1 ]; then
          echo "✓ Latency check passed"
        else
          echo "✗ Latency too high"
          exit 1
        fi
```

Use in pipeline:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: deploy-with-gates
spec:
  params:
    - name: image
    - name: app-name

  tasks:
    - name: deploy-staging
      taskRef:
        name: kubectl-deploy
      params:
        - name: image
          value: $(params.image)
        - name: namespace
          value: staging

    - name: validate-staging
      runAfter: [deploy-staging]
      taskRef:
        name: validate-prometheus-metrics
      params:
        - name: prometheus-url
          value: http://prometheus.monitoring.svc:9090
        - name: app-name
          value: $(params.app-name)
        - name: namespace
          value: staging

    - name: deploy-production
      runAfter: [validate-staging]
      taskRef:
        name: kubectl-deploy
      params:
        - name: image
          value: $(params.image)
        - name: namespace
          value: production

    - name: validate-production
      runAfter: [deploy-production]
      taskRef:
        name: validate-prometheus-metrics
      params:
        - name: prometheus-url
          value: http://prometheus.monitoring.svc:9090
        - name: app-name
          value: $(params.app-name)
        - name: namespace
          value: production

  finally:
    - name: rollback-on-failure
      when:
        - input: "$(tasks.validate-production.status)"
          operator: in
          values: ["Failed"]
      taskRef:
        name: kubectl-rollback
      params:
        - name: namespace
          value: production
        - name: deployment
          value: $(params.app-name)
```

## Progressive Canary with Metrics

Implement canary deployment with metric validation:

```yaml
- name: Deploy canary
  run: |
    # Deploy 10% canary
    kubectl patch deployment myapp -n production -p '{
      "spec": {
        "template": {
          "metadata": {
            "labels": {"version": "canary"}
          },
          "spec": {
            "containers": [{
              "name": "myapp",
              "image": "registry.example.com/myapp:${{ github.sha }}"
            }]
          }
        },
        "replicas": 1
      }
    }'

- name: Validate canary metrics
  run: |
    sleep 300  # 5 minutes

    # Check canary-specific metrics
    CANARY_ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query' \
      --data-urlencode 'query=sum(rate(http_requests_total{version="canary",status=~"5.."}[5m]))/sum(rate(http_requests_total{version="canary"}[5m]))' | \
      jq -r '.data.result[0].value[1]')

    if (( $(echo "$CANARY_ERROR_RATE > 0.01" | bc -l) )); then
      echo "Canary error rate too high: $CANARY_ERROR_RATE"
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

## Alerting on Gate Failures

Send notifications when gates fail:

```yaml
- name: Notify on gate failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "🚨 Deployment gate failed",
        "attachments": [{
          "color": "danger",
          "fields": [
            {"title": "Application", "value": "myapp", "short": true},
            {"title": "Environment", "value": "production", "short": true},
            {"title": "Commit", "value": "${{ github.sha }}", "short": true},
            {"title": "Workflow", "value": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}", "short": false}
          ]
        }]
      }'
```

## Conclusion

Prometheus-based deployment gates add intelligent validation to CI/CD pipelines, ensuring applications meet performance and reliability standards before progressing. By querying actual metrics rather than just checking basic health, you catch issues that simple probes miss. This metric-driven approach enables confident deployments, automatic rollbacks on anomalies, and progressive delivery strategies. Combined with proper thresholds and alerting, metrics gates significantly reduce production incidents while maintaining deployment velocity.

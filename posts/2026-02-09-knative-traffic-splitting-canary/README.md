# How to Configure Knative Serving Traffic Splitting for Serverless Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Canary-Deployment, Serverless, Traffic-Management

Description: Master Knative Serving traffic splitting to implement safe canary deployments, blue-green releases, and A/B testing for serverless applications on Kubernetes.

---

Knative Serving provides sophisticated traffic management capabilities that enable safe deployments through gradual rollouts. By splitting traffic between multiple revisions of a service, you can test new versions with minimal risk while maintaining the ability to quickly roll back if issues arise. This guide explores traffic splitting strategies for production serverless deployments.

## Understanding Knative Revisions and Traffic

Every time you update a Knative Service, the platform creates a new immutable Revision. Each revision represents a specific version of your code and configuration. Knative maintains multiple revisions simultaneously, allowing you to route traffic between them with fine-grained control.

Traffic splitting operates at the Route level. Routes define how incoming requests are distributed across revisions. You can specify percentages for each revision, tag specific revisions for direct access, and dynamically adjust traffic allocation without downtime.

This model enables multiple deployment strategies. Canary deployments gradually shift traffic to new versions. Blue-green deployments switch all traffic at once after validation. A/B testing sends specific user segments to different versions for comparison.

## Setting Up Your First Canary Deployment

Start with a baseline service deployment:

```yaml
# service-v1.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: user-api
  namespace: default
spec:
  template:
    metadata:
      name: user-api-v1
    spec:
      containers:
      - image: your-registry/user-api:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "1.0.0"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Deploy the initial version:

```bash
kubectl apply -f service-v1.yaml

# Get the service URL
kubectl get ksvc user-api -o jsonpath='{.status.url}'

# Test the service
curl $(kubectl get ksvc user-api -o jsonpath='{.status.url}')/health
```

Now deploy a new version with a canary rollout:

```yaml
# service-v2-canary.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: user-api
  namespace: default
spec:
  template:
    metadata:
      name: user-api-v2
    spec:
      containers:
      - image: your-registry/user-api:v2.0.0
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "2.0.0"
        - name: FEATURE_FLAG_NEW_ALGORITHM
          value: "true"

  traffic:
  # Route 90% to stable version
  - revisionName: user-api-v1
    percent: 90
    tag: stable

  # Route 10% to canary version
  - revisionName: user-api-v2
    percent: 10
    tag: canary
```

Apply the canary deployment:

```bash
kubectl apply -f service-v2-canary.yaml

# Check traffic distribution
kubectl get ksvc user-api -o jsonpath='{.status.traffic[*].percent}'

# Get tagged URLs for direct access
kubectl get ksvc user-api -o yaml | grep url:
```

## Implementing Gradual Traffic Shifting

Progressively increase canary traffic as confidence grows:

```bash
# Helper function to update traffic split
function shift_traffic() {
  local canary_percent=$1

  kubectl patch ksvc user-api --type merge -p "{
    \"spec\": {
      \"traffic\": [
        {
          \"revisionName\": \"user-api-v1\",
          \"percent\": $((100 - canary_percent)),
          \"tag\": \"stable\"
        },
        {
          \"revisionName\": \"user-api-v2\",
          \"percent\": ${canary_percent},
          \"tag\": \"canary\"
        }
      ]
    }
  }"
}

# Gradual rollout
shift_traffic 10  # Start with 10%
sleep 300         # Monitor for 5 minutes

shift_traffic 25  # Increase to 25%
sleep 300

shift_traffic 50  # 50/50 split
sleep 300

shift_traffic 75  # Mostly new version
sleep 300

shift_traffic 100 # Full rollout
```

Automate the progressive rollout with a script:

```python
#!/usr/bin/env python3
# progressive-rollout.py

import subprocess
import time
import json
import sys

def get_error_rate(revision):
    """Query Prometheus for error rate"""
    query = f'rate(http_requests_total{{revision="{revision}",status=~"5.."}}[5m])'
    # Execute Prometheus query and return result
    # Implementation depends on your monitoring setup
    return 0.01  # Example: 1% error rate

def shift_traffic(canary_percent):
    """Update Knative traffic split"""
    stable_percent = 100 - canary_percent

    patch = {
        "spec": {
            "traffic": [
                {
                    "revisionName": "user-api-v1",
                    "percent": stable_percent,
                    "tag": "stable"
                },
                {
                    "revisionName": "user-api-v2",
                    "percent": canary_percent,
                    "tag": "canary"
                }
            ]
        }
    }

    cmd = [
        "kubectl", "patch", "ksvc", "user-api",
        "--type", "merge",
        "-p", json.dumps(patch)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error updating traffic: {result.stderr}")
        return False
    return True

def main():
    stages = [10, 25, 50, 75, 100]
    error_threshold = 0.05  # 5% error rate threshold

    for stage in stages:
        print(f"Shifting traffic to {stage}% canary...")

        if not shift_traffic(stage):
            print("Failed to shift traffic, aborting rollout")
            sys.exit(1)

        # Monitor for 5 minutes
        print("Monitoring metrics...")
        time.sleep(60)  # Wait for metrics to stabilize

        error_rate = get_error_rate("user-api-v2")
        print(f"Canary error rate: {error_rate:.2%}")

        if error_rate > error_threshold:
            print(f"Error rate {error_rate:.2%} exceeds threshold {error_threshold:.2%}")
            print("Rolling back to stable version...")
            shift_traffic(0)
            sys.exit(1)

        if stage < 100:
            print(f"Waiting before next stage...")
            time.sleep(240)  # Additional wait between stages

    print("Rollout completed successfully!")

if __name__ == "__main__":
    main()
```

## Blue-Green Deployments

Implement zero-downtime blue-green deployments:

```yaml
# blue-green-deployment.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: payment-service
spec:
  template:
    metadata:
      name: payment-service-green
    spec:
      containers:
      - image: your-registry/payment-service:v2.0.0

  traffic:
  # Blue environment (current production)
  - revisionName: payment-service-blue
    percent: 100
    tag: blue

  # Green environment (new version, no traffic yet)
  - revisionName: payment-service-green
    percent: 0
    tag: green
```

The green environment receives no production traffic but remains deployed for testing:

```bash
# Test the green environment directly
GREEN_URL=$(kubectl get ksvc payment-service -o jsonpath='{.status.traffic[?(@.tag=="green")].url}')
curl $GREEN_URL/api/process-payment

# Run integration tests against green
./run-tests.sh $GREEN_URL

# If tests pass, switch traffic
kubectl patch ksvc payment-service --type merge -p '{
  "spec": {
    "traffic": [
      {
        "revisionName": "payment-service-blue",
        "percent": 0,
        "tag": "blue"
      },
      {
        "revisionName": "payment-service-green",
        "percent": 100,
        "tag": "green"
      }
    ]
  }
}'
```

## A/B Testing with Header-Based Routing

Route specific users to different versions based on headers:

```yaml
# ab-testing-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: recommendation-engine
spec:
  template:
    metadata:
      name: recommendation-engine-variant-b
    spec:
      containers:
      - image: your-registry/recommendation-engine:variant-b
        env:
        - name: ALGORITHM
          value: "collaborative-filtering"

  traffic:
  # Control group - 50%
  - revisionName: recommendation-engine-variant-a
    percent: 50
    tag: variant-a

  # Treatment group - 50%
  - revisionName: recommendation-engine-variant-b
    percent: 50
    tag: variant-b
```

Implement sticky sessions using custom routing logic:

```javascript
// ab-test-proxy.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

const VARIANT_A_URL = process.env.VARIANT_A_URL;
const VARIANT_B_URL = process.env.VARIANT_B_URL;

// Consistent user assignment
function getUserVariant(userId) {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashValue = parseInt(hash.substring(0, 8), 16);
  return hashValue % 2 === 0 ? 'a' : 'b';
}

app.use(async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  const variant = getUserVariant(userId);
  const targetUrl = variant === 'a' ? VARIANT_A_URL : VARIANT_B_URL;

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl + req.url,
      headers: {
        ...req.headers,
        'X-AB-Variant': variant
      },
      data: req.body
    });

    res.set('X-AB-Variant', variant);
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(error.response?.status || 500)
       .json({ error: error.message });
  }
});

app.listen(8080, () => console.log('AB test proxy running'));
```

## Monitoring Canary Deployments

Track key metrics during rollouts:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: user-api-monitor
spec:
  selector:
    matchLabels:
      serving.knative.dev/service: user-api
  endpoints:
  - port: metrics
    interval: 15s
```

Create alerts for canary issues:

```yaml
# canary-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-alerts
spec:
  groups:
  - name: canary
    interval: 30s
    rules:
    - alert: CanaryHighErrorRate
      expr: |
        (
          sum(rate(http_requests_total{revision=~".*-v2",status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total{revision=~".*-v2"}[5m]))
        ) > 0.05
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Canary version has high error rate"
        description: "Revision {{ $labels.revision }} error rate is {{ $value | humanizePercentage }}"

    - alert: CanaryHighLatency
      expr: |
        histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket{revision=~".*-v2"}[5m])
        ) > 1.0
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Canary version has high latency"
        description: "P95 latency for {{ $labels.revision }} is {{ $value }}s"
```

## Automated Rollback on Failure

Implement automatic rollback based on metrics:

```bash
#!/bin/bash
# canary-monitor.sh

SERVICE_NAME="user-api"
CANARY_REVISION="user-api-v2"
STABLE_REVISION="user-api-v1"
ERROR_THRESHOLD=0.05
CHECK_INTERVAL=60
MAX_CHECKS=10

for i in $(seq 1 $MAX_CHECKS); do
  echo "Check $i of $MAX_CHECKS..."

  # Query error rate from Prometheus
  ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode "query=sum(rate(http_requests_total{revision=\"${CANARY_REVISION}\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{revision=\"${CANARY_REVISION}\"}[5m]))" \
    | jq -r '.data.result[0].value[1]')

  if (( $(echo "$ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
    echo "ERROR: Error rate $ERROR_RATE exceeds threshold $ERROR_THRESHOLD"
    echo "Rolling back to stable revision..."

    kubectl patch ksvc $SERVICE_NAME --type merge -p "{
      \"spec\": {
        \"traffic\": [
          {
            \"revisionName\": \"$STABLE_REVISION\",
            \"percent\": 100
          }
        ]
      }
    }"

    echo "Rollback completed"
    exit 1
  fi

  echo "Error rate $ERROR_RATE is acceptable"
  sleep $CHECK_INTERVAL
done

echo "Canary monitoring completed successfully"
```

## Best Practices

Start with small traffic percentages. Begin canary deployments at 5-10% to minimize blast radius. Only increase after confirming stability through metrics.

Use revision tags for testing. Tags provide stable URLs for direct access to specific revisions, enabling thorough testing before exposing them to production traffic.

Monitor golden signals. Track request rate, error rate, latency, and saturation for both stable and canary revisions. Set up automated alerts for anomalies.

Implement gradual rollouts. Don't jump directly from 10% to 100%. Use intermediate stages like 25%, 50%, and 75% with monitoring periods between each stage.

Keep multiple revisions ready. Maintain at least the current and previous stable revisions with traffic routing configured. This enables instant rollback without redeployment.

Document rollback procedures. Ensure your team knows how to quickly revert traffic in case of issues. Automate rollback where possible based on metric thresholds.

## Conclusion

Knative Serving's traffic management capabilities provide powerful tools for safe deployments. By splitting traffic between revisions, you can validate new versions gradually while maintaining the ability to quickly roll back if problems arise. Whether implementing canary deployments, blue-green releases, or A/B testing, the combination of immutable revisions and flexible routing enables deployment strategies that minimize risk and maximize confidence in your serverless applications.

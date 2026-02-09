# How to Implement A/B Model Testing with KServe Traffic Routing on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KServe, Machine Learning, A/B Testing, Model Serving

Description: Implement A/B model testing with KServe traffic routing on Kubernetes to compare model performance and gradually roll out new model versions in production.

---

When deploying new machine learning models to production, you need to validate that the new model actually performs better than the current one before fully replacing it. A/B testing lets you route a percentage of traffic to different model versions, collect real-world performance metrics, and make data-driven decisions about which model to promote. KServe provides built-in traffic routing capabilities that make implementing A/B tests straightforward on Kubernetes.

This guide shows you how to set up A/B model testing with KServe, monitor the results, and make informed deployment decisions.

## Understanding KServe Traffic Management

KServe uses Knative Serving under the hood to manage traffic routing between different model revisions. When you update an InferenceService, KServe can:

- Create a new revision without removing the old one
- Split traffic between revisions based on percentage
- Route traffic based on headers or other criteria
- Support canary deployments with gradual rollout

This makes it perfect for A/B testing where you want to compare two models side-by-side with real production traffic.

## Setting Up the Initial Model Version

Start by deploying your baseline model (version A):

```yaml
# model-v1.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model
  namespace: ml-serving
  annotations:
    # Tag this revision as 'v1' for traffic routing
    serving.kserve.io/revisionTag: "v1"
spec:
  predictor:
    sklearn:
      # Using SKLearn predictor as example
      storageUri: "gs://my-bucket/models/recommendation-v1"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
    # Enable detailed logging for A/B comparison
    logger:
      mode: all
      url: http://message-dumper.default.svc.cluster.local
```

Deploy the initial model:

```bash
# Create namespace
kubectl create namespace ml-serving

# Deploy model v1
kubectl apply -f model-v1.yaml

# Wait for it to be ready
kubectl wait --for=condition=Ready inferenceservice/recommendation-model -n ml-serving --timeout=5m

# Get the service URL
MODEL_URL=$(kubectl get inferenceservice recommendation-model -n ml-serving -o jsonpath='{.status.url}')
echo "Model URL: $MODEL_URL"

# Test the initial deployment
curl -X POST $MODEL_URL/v1/models/recommendation-model:predict \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      {"user_id": 123, "context": "homepage"}
    ]
  }'
```

## Deploying the New Model Version

Now deploy your new model (version B) alongside the existing one:

```yaml
# model-v2.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model
  namespace: ml-serving
  annotations:
    # Tag this revision as 'v2'
    serving.kserve.io/revisionTag: "v2"
spec:
  predictor:
    sklearn:
      # New model with improved algorithm
      storageUri: "gs://my-bucket/models/recommendation-v2"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
    logger:
      mode: all
      url: http://message-dumper.default.svc.cluster.local
```

Apply the updated configuration:

```bash
# Deploy model v2 (this creates a new revision)
kubectl apply -f model-v2.yaml

# Check both revisions exist
kubectl get revisions -n ml-serving -l serving.kserve.io/inferenceservice=recommendation-model

# By default, all traffic goes to the latest revision
# Next step is to configure traffic splitting
```

## Configuring A/B Traffic Split

Create a traffic configuration to split traffic between v1 and v2:

```yaml
# ab-traffic-split.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model
  namespace: ml-serving
spec:
  predictor:
    sklearn:
      storageUri: "gs://my-bucket/models/recommendation-v2"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
    logger:
      mode: all
      url: http://message-dumper.default.svc.cluster.local

  # Traffic configuration for A/B testing
  traffic:
    # 80% traffic to v1 (current production model)
    - revisionName: recommendation-model-v1
      percent: 80
      tag: v1

    # 20% traffic to v2 (new model being tested)
    - revisionName: recommendation-model-v2
      percent: 20
      tag: v2

    # Latest revision tag (for testing latest without affecting production)
    - latestRevision: true
      percent: 0
      tag: latest
```

Apply the traffic split:

```bash
# Apply the A/B traffic configuration
kubectl apply -f ab-traffic-split.yaml

# Verify the traffic split
kubectl get inferenceservice recommendation-model -n ml-serving -o jsonpath='{.status.traffic[*]}'

# You should see output like:
# {"percent":80,"revisionName":"recommendation-model-v1","tag":"v1"}
# {"percent":20,"revisionName":"recommendation-model-v2","tag":"v2"}
```

## Testing Traffic Routing

Verify that traffic is being split correctly:

```bash
# Make multiple requests and observe routing
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST $MODEL_URL/v1/models/recommendation-model:predict \
    -H "Content-Type: application/json" \
    -d '{
      "instances": [
        {"user_id": '$i', "context": "homepage"}
      ]
    }' | jq '.model_version'
  sleep 1
done

# You should see roughly 80% v1 responses and 20% v2 responses
```

Access specific versions directly using tags:

```bash
# Get tagged URLs
V1_URL=$(kubectl get inferenceservice recommendation-model -n ml-serving -o jsonpath='{.status.address.url}' | sed 's/https:\/\//https:\/\/v1./')
V2_URL=$(kubectl get inferenceservice recommendation-model -n ml-serving -o jsonpath='{.status.address.url}' | sed 's/https:\/\//https:\/\/v2./')

# Test v1 specifically
curl -X POST $V1_URL/v1/models/recommendation-model:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"user_id": 123, "context": "homepage"}]}'

# Test v2 specifically
curl -X POST $V2_URL/v1/models/recommendation-model:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"user_id": 123, "context": "homepage"}]}'
```

## Collecting A/B Test Metrics

Deploy Prometheus to collect metrics from both model versions:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: recommendation-model-metrics
  namespace: ml-serving
  labels:
    app: recommendation-model
spec:
  selector:
    matchLabels:
      serving.kserve.io/inferenceservice: recommendation-model
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Create a custom metrics exporter for model-specific metrics:

```python
# metrics_exporter.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import json
import time
from typing import Dict

# Define metrics for A/B comparison
PREDICTION_COUNT = Counter(
    'model_predictions_total',
    'Total predictions made',
    ['model_version', 'status']
)

PREDICTION_LATENCY = Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency',
    ['model_version']
)

PREDICTION_CONFIDENCE = Histogram(
    'model_prediction_confidence',
    'Model confidence scores',
    ['model_version']
)

CTR_RATE = Gauge(
    'model_ctr_rate',
    'Click-through rate for recommendations',
    ['model_version']
)

def record_prediction(model_version: str, latency: float, confidence: float, clicked: bool):
    """Record metrics for a single prediction"""
    PREDICTION_COUNT.labels(model_version=model_version, status='success').inc()
    PREDICTION_LATENCY.labels(model_version=model_version).observe(latency)
    PREDICTION_CONFIDENCE.labels(model_version=model_version).observe(confidence)

    # Update CTR (this would be calculated from a sliding window in production)
    if clicked:
        # Increment CTR counter for this version
        pass

if __name__ == '__main__':
    # Start metrics server on port 8000
    start_http_server(8000)
    print("Metrics server started on port 8000")

    # Keep the server running
    while True:
        time.sleep(1)
```

Query Prometheus to compare model versions:

```promql
# Compare prediction counts
sum(rate(model_predictions_total[5m])) by (model_version)

# Compare average latency
avg(model_prediction_latency_seconds) by (model_version)

# Compare confidence distributions
histogram_quantile(0.95, rate(model_prediction_confidence_bucket[5m])) by (model_version)

# Compare error rates
sum(rate(model_predictions_total{status="error"}[5m])) by (model_version)
/ sum(rate(model_predictions_total[5m])) by (model_version)
```

## Creating a Grafana Dashboard for A/B Analysis

Deploy a Grafana dashboard to visualize the comparison:

```json
{
  "dashboard": {
    "title": "Model A/B Test Dashboard",
    "panels": [
      {
        "title": "Requests Per Second by Version",
        "targets": [{
          "expr": "sum(rate(model_predictions_total[1m])) by (model_version)"
        }],
        "type": "graph"
      },
      {
        "title": "P95 Latency by Version",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(model_prediction_latency_seconds_bucket[5m])) by (model_version)"
        }],
        "type": "graph"
      },
      {
        "title": "Average Confidence Score",
        "targets": [{
          "expr": "avg(model_prediction_confidence) by (model_version)"
        }],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "sum(rate(model_predictions_total{status=\"error\"}[5m])) by (model_version) / sum(rate(model_predictions_total[5m])) by (model_version)"
        }],
        "type": "graph"
      }
    ]
  }
}
```

## Gradual Rollout Based on Metrics

Based on your A/B test results, gradually shift more traffic to the winning model:

```bash
# If v2 is performing well, increase its traffic to 50%
cat <<EOF | kubectl apply -f -
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model
  namespace: ml-serving
spec:
  predictor:
    sklearn:
      storageUri: "gs://my-bucket/models/recommendation-v2"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
  traffic:
    - revisionName: recommendation-model-v1
      percent: 50
      tag: v1
    - revisionName: recommendation-model-v2
      percent: 50
      tag: v2
EOF

# Monitor for issues, then continue increasing v2 traffic
# Eventually move to 100% v2 if all metrics look good
```

Automate the rollout with a script:

```bash
#!/bin/bash
# gradual-rollout.sh

MODEL_NAME="recommendation-model"
NAMESPACE="ml-serving"

# Define rollout stages
STAGES=(20 40 60 80 100)
WAIT_TIME=3600  # Wait 1 hour between stages

for v2_percent in "${STAGES[@]}"; do
    v1_percent=$((100 - v2_percent))

    echo "Rolling out to v2: ${v2_percent}%, v1: ${v1_percent}%"

    # Update traffic split
    kubectl patch inferenceservice $MODEL_NAME -n $NAMESPACE --type='json' \
      -p="[{
        'op': 'replace',
        'path': '/spec/traffic',
        'value': [
          {'revisionName': '${MODEL_NAME}-v1', 'percent': ${v1_percent}, 'tag': 'v1'},
          {'revisionName': '${MODEL_NAME}-v2', 'percent': ${v2_percent}, 'tag': 'v2'}
        ]
      }]"

    # Wait and monitor
    echo "Waiting ${WAIT_TIME} seconds before next stage..."
    sleep $WAIT_TIME

    # Check error rate (simplified - add proper checks in production)
    # If error rate is too high, rollback
done

echo "Rollout complete!"
```

## Rollback Strategy

If the new model performs poorly, quickly rollback to v1:

```bash
# Immediately route all traffic back to v1
kubectl patch inferenceservice recommendation-model -n ml-serving --type='json' \
  -p='[{
    "op": "replace",
    "path": "/spec/traffic",
    "value": [
      {"revisionName": "recommendation-model-v1", "percent": 100, "tag": "v1"},
      {"revisionName": "recommendation-model-v2", "percent": 0, "tag": "v2"}
    ]
  }]'

# Verify rollback
kubectl get inferenceservice recommendation-model -n ml-serving -o jsonpath='{.status.traffic[*]}'
```

## Conclusion

A/B testing with KServe traffic routing provides a safe way to validate new models in production before fully committing to them. By gradually shifting traffic and monitoring key metrics, you can make confident decisions about model deployments while minimizing risk to your users. The combination of tagged revisions, percentage-based routing, and built-in observability makes KServe an excellent platform for production ML model management.

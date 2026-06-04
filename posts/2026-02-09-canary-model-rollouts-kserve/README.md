# How to Implement Canary Model Rollouts with KServe and Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KServe, Canary Deployment, Prometheus, Model Serving

Description: Implement canary model rollouts with KServe and Prometheus metrics to safely deploy new model versions with automated rollback based on performance monitoring.

---

Deploying a new model version to production carries risk. Even with thorough testing, production data can reveal issues that weren't caught earlier. Canary deployments let you gradually roll out a new model to a small percentage of traffic, monitor its performance compared to the current version, and automatically roll back if problems arise. This guide shows you how to implement automated canary rollouts for KServe models using Prometheus metrics.

## Setting Up Prometheus and Grafana

Install the monitoring stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=5m
```

## Creating a Metrics-Enabled Predictor

Build a predictor that exports detailed metrics:

```python
# metrics_predictor.py

import kserve
import logging
from typing import Dict
import os
import time
import numpy as np
from prometheus_client import Counter, Histogram

logging.basicConfig(level=logging.INFO)

# Metrics
PREDICTION_COUNTER = Counter(
    'model_predictions_total',
    'Total predictions',
    ['model_name', 'model_version', 'status']
)

PREDICTION_LATENCY = Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency',
    ['model_name', 'model_version'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

PREDICTION_CONFIDENCE = Histogram(
    'model_prediction_confidence',
    'Prediction confidence scores',
    ['model_name', 'model_version'],
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

ERROR_RATE = Counter(
    'model_errors_total',
    'Total errors',
    ['model_name', 'model_version', 'error_type']
)

class MetricsPredictor(kserve.Model):
    def __init__(self, name: str, model_version: str):
        super().__init__(name)
        self.name = name
        self.model_version = model_version
        self.ready = False

    def load(self):
        # Load model. Replace this demo training data with your model artifact.
        from sklearn.ensemble import RandomForestClassifier
        self.model = RandomForestClassifier()
        X_train = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
        y_train = np.array([0, 0, 1, 1])
        self.model.fit(X_train, y_train)
        self.ready = True
        logging.info(f"Model {self.model_version} loaded")

    def predict(self, request: Dict) -> Dict:
        start_time = time.time()

        try:
            instances = request.get("instances", [])
            X = np.array(instances)

            # Make predictions
            predictions = self.model.predict_proba(X)
            results = predictions[:, 1].tolist()

            # Log confidence
            for conf in results:
                PREDICTION_CONFIDENCE.labels(
                    model_name=self.name,
                    model_version=self.model_version
                ).observe(conf)

            # Success counter
            PREDICTION_COUNTER.labels(
                model_name=self.name,
                model_version=self.model_version,
                status='success'
            ).inc(len(instances))

            return {"predictions": results}

        except Exception as e:
            ERROR_RATE.labels(
                model_name=self.name,
                model_version=self.model_version,
                error_type=type(e).__name__
            ).inc()

            PREDICTION_COUNTER.labels(
                model_name=self.name,
                model_version=self.model_version,
                status='error'
            ).inc()

            raise

        finally:
            latency = time.time() - start_time
            PREDICTION_LATENCY.labels(
                model_name=self.name,
                model_version=self.model_version
            ).observe(latency)

if __name__ == "__main__":
    model_version = os.getenv("MODEL_VERSION", "v1")

    predictor = MetricsPredictor("canary-model", model_version)
    predictor.load()
    kserve.ModelServer().start([predictor])
```

Build images for both versions:

```bash
# Build v1
docker build -t your-registry/canary-model:v1 \
  --build-arg MODEL_VERSION=v1 \
  -f Dockerfile.metrics .

# Build v2
docker build -t your-registry/canary-model:v2 \
  --build-arg MODEL_VERSION=v2 \
  -f Dockerfile.metrics .

docker push your-registry/canary-model:v1
docker push your-registry/canary-model:v2
```

## Deploying the Baseline Model

Deploy the stable version (v1):

```yaml
# model-v1.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: canary-model
  namespace: ml-serving
  annotations:
    serving.kserve.io/enable-prometheus-scraping: "true"
    prometheus.kserve.io/port: "8080"
    prometheus.kserve.io/path: "/metrics"
spec:
  predictor:
    containers:
    - name: kserve-container
      image: your-registry/canary-model:v1
      env:
      - name: MODEL_VERSION
        value: "v1"
      ports:
      - containerPort: 8080
        name: http1
        protocol: TCP
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: canary-model-metrics
  namespace: ml-serving
spec:
  selector:
    matchLabels:
      serving.kserve.io/inferenceservice: canary-model
  endpoints:
  - targetPort: 8080
    path: /metrics
    interval: 15s
```

Deploy and verify:

```bash
kubectl create namespace ml-serving
kubectl apply -f model-v1.yaml

kubectl wait --for=condition=Ready inferenceservice/canary-model -n ml-serving --timeout=5m
```

## Implementing Canary Deployment

Deploy the canary version with traffic split:

```yaml
# canary-deployment.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: canary-model
  namespace: ml-serving
  annotations:
    serving.kserve.io/enable-prometheus-scraping: "true"
    prometheus.kserve.io/port: "8080"
    prometheus.kserve.io/path: "/metrics"
spec:
  predictor:
    canaryTrafficPercent: 5
    containers:
    - name: kserve-container
      image: your-registry/canary-model:v2
      env:
      - name: MODEL_VERSION
        value: "v2"
      ports:
      - containerPort: 8080
        name: http1
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"

    # KServe sends 5% of traffic to the latest ready revision and 95% to the last rolled-out revision.
```

Apply the canary deployment:

```bash
kubectl apply -f canary-deployment.yaml

# Verify traffic split
kubectl get inferenceservice canary-model -n ml-serving
```

## Creating Prometheus Alert Rules

Define alert rules for canary monitoring:

```yaml
# canary-alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-alerts
  namespace: monitoring
spec:
  groups:
  - name: canary-deployment
    interval: 15s
    rules:
    # High error rate in canary
    - alert: CanaryHighErrorRate
      expr: |
        (
          sum(rate(model_predictions_total{status="error",model_version="v2"}[2m]))
          /
          sum(rate(model_predictions_total{model_version="v2"}[2m]))
        ) > 0.05
      for: 2m
      labels:
        severity: critical
        canary: "true"
      annotations:
        summary: "Canary version has high error rate"
        description: "Error rate is {{ $value | humanizePercentage }}"

    # Canary latency higher than stable
    - alert: CanaryHighLatency
      expr: |
        (
          histogram_quantile(0.95,
            sum by (le) (rate(model_prediction_latency_seconds_bucket{model_version="v2"}[2m]))
          )
          /
          histogram_quantile(0.95,
            sum by (le) (rate(model_prediction_latency_seconds_bucket{model_version="v1"}[2m]))
          )
        ) > 1.5
      for: 3m
      labels:
        severity: warning
        canary: "true"
      annotations:
        summary: "Canary version has high latency"
        description: "P95 latency is {{ $value }}x higher than stable"

    # Low confidence predictions in canary
    - alert: CanaryLowConfidence
      expr: |
        (
          sum(rate(model_prediction_confidence_sum{model_version="v2"}[2m]))
          /
          sum(rate(model_prediction_confidence_count{model_version="v2"}[2m]))
        )
        <
        (
          sum(rate(model_prediction_confidence_sum{model_version="v1"}[2m]))
          /
          sum(rate(model_prediction_confidence_count{model_version="v1"}[2m]))
        ) * 0.8
      for: 5m
      labels:
        severity: warning
        canary: "true"
      annotations:
        summary: "Canary predictions have low confidence"
        description: "Average confidence is {{ $value }}"
```

Apply the rules:

```bash
kubectl apply -f canary-alert-rules.yaml
```

## Building an Automated Canary Controller

Create a controller that monitors metrics and manages rollout:

```python
# canary_controller.py
import time
import logging
import os
from prometheus_api_client import PrometheusConnect
import kubernetes.client
from kubernetes import config

logging.basicConfig(level=logging.INFO)

class CanaryController:
    def __init__(self, prometheus_url: str, namespace: str, model_name: str):
        self.prom = PrometheusConnect(url=prometheus_url, disable_ssl=True)
        self.namespace = namespace
        self.model_name = model_name

        config.load_incluster_config()
        self.custom_api = kubernetes.client.CustomObjectsApi()

        # Canary configuration
        self.stages = [5, 10, 25, 50, 75, 100]
        self.current_stage = 0
        self.wait_time = 300  # 5 minutes between stages

    def get_error_rate(self, version: str) -> float:
        """Get error rate for a version"""
        query = f'''
        sum(rate(model_predictions_total{{status="error",model_version="{version}"}}[2m]))
        /
        sum(rate(model_predictions_total{{model_version="{version}"}}[2m]))
        '''

        result = self.prom.custom_query(query=query)
        if result and len(result) > 0:
            return float(result[0]['value'][1])
        return 0.0

    def get_latency_ratio(self) -> float:
        """Get latency ratio between canary and stable"""
        query = '''
        histogram_quantile(0.95,
          sum by (le) (rate(model_prediction_latency_seconds_bucket{model_version="v2"}[2m]))
        )
        /
        histogram_quantile(0.95,
          sum by (le) (rate(model_prediction_latency_seconds_bucket{model_version="v1"}[2m]))
        )
        '''

        result = self.prom.custom_query(query=query)
        if result and len(result) > 0:
            return float(result[0]['value'][1])
        return 1.0

    def check_canary_health(self) -> bool:
        """Check if canary is healthy"""
        # Check error rate
        error_rate = self.get_error_rate("v2")
        if error_rate > 0.05:  # 5% error threshold
            logging.error(f"Canary error rate too high: {error_rate:.2%}")
            return False

        # Check latency
        latency_ratio = self.get_latency_ratio()
        if latency_ratio > 1.5:  # 50% slower threshold
            logging.error(f"Canary latency too high: {latency_ratio:.2f}x")
            return False

        logging.info(f"Canary health OK: error_rate={error_rate:.2%}, latency_ratio={latency_ratio:.2f}")
        return True

    def update_traffic_split(self, canary_percent: int):
        """Update traffic split"""
        body = {
            "spec": {
                "predictor": {
                    "canaryTrafficPercent": canary_percent
                }
            }
        }

        self.custom_api.patch_namespaced_custom_object(
            group="serving.kserve.io",
            version="v1beta1",
            namespace=self.namespace,
            plural="inferenceservices",
            name=self.model_name,
            body=body
        )

        stable_percent = 100 - canary_percent
        logging.info(f"Updated traffic: stable={stable_percent}%, canary={canary_percent}%")

    def rollback(self):
        """Rollback to stable version"""
        logging.error("ROLLING BACK to stable version!")

        self.update_traffic_split(0)
        self.current_stage = 0

    def promote(self):
        """Promote canary to stable"""
        logging.info("Canary successful! Promoting to stable.")

        # Update traffic to 100% latest revision
        self.update_traffic_split(100)

        # KServe records the latest ready revision as the rolled-out revision when it receives 100% traffic.

    def run_canary_rollout(self):
        """Execute canary rollout"""
        logging.info(f"Starting canary rollout for {self.model_name}")

        for stage_idx, canary_percent in enumerate(self.stages):
            self.current_stage = stage_idx

            logging.info(f"\n=== Stage {stage_idx + 1}/{len(self.stages)}: {canary_percent}% canary ===")

            # Update traffic split
            self.update_traffic_split(canary_percent)

            # Wait for metrics to stabilize
            logging.info(f"Waiting {self.wait_time}s for metrics...")
            time.sleep(self.wait_time)

            # Check canary health
            if not self.check_canary_health():
                self.rollback()
                return False

            logging.info(f"Stage {stage_idx + 1} successful!")

        # All stages passed, promote canary
        self.promote()
        return True

if __name__ == "__main__":
    controller = CanaryController(
        prometheus_url=os.getenv("PROMETHEUS_URL", "http://monitoring-kube-prometheus-prometheus.monitoring.svc:9090"),
        namespace=os.getenv("NAMESPACE", "ml-serving"),
        model_name=os.getenv("MODEL_NAME", "canary-model")
    )

    success = controller.run_canary_rollout()

    if success:
        logging.info("Canary rollout completed successfully!")
    else:
        logging.error("Canary rollout failed and was rolled back")
```

Deploy the controller:

```yaml
# canary-controller.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: canary-rollout
  namespace: ml-serving
spec:
  template:
    spec:
      serviceAccountName: canary-controller
      restartPolicy: Never
      containers:
      - name: controller
        image: your-registry/canary-controller:v1
        env:
        - name: PROMETHEUS_URL
          value: "http://monitoring-kube-prometheus-prometheus.monitoring.svc:9090"
        - name: NAMESPACE
          value: "ml-serving"
        - name: MODEL_NAME
          value: "canary-model"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: canary-controller
  namespace: ml-serving
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: canary-controller
  namespace: ml-serving
rules:
- apiGroups: ["serving.kserve.io"]
  resources: ["inferenceservices"]
  verbs: ["get", "list", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: canary-controller
  namespace: ml-serving
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: canary-controller
subjects:
- kind: ServiceAccount
  name: canary-controller
  namespace: ml-serving
```

Run the canary rollout:

```bash
kubectl apply -f canary-controller.yaml

# Watch the rollout
kubectl logs -n ml-serving job/canary-rollout -f
```

## Creating a Grafana Dashboard

Visualize the canary metrics:

```json
{
  "dashboard": {
    "title": "Canary Deployment Dashboard",
    "panels": [
      {
        "title": "Traffic Split",
        "targets": [{
          "expr": "sum(rate(model_predictions_total[1m])) by (model_version)"
        }]
      },
      {
        "title": "Error Rate Comparison",
        "targets": [
          {
            "expr": "sum(rate(model_predictions_total{status=\"error\"}[2m])) by (model_version) / sum(rate(model_predictions_total[2m])) by (model_version)",
            "legendFormat": "{{model_version}}"
          }
        ]
      },
      {
        "title": "P95 Latency Comparison",
        "targets": [{
          "expr": "histogram_quantile(0.95, sum by (model_version, le) (rate(model_prediction_latency_seconds_bucket[2m])))"
        }]
      },
      {
        "title": "Prediction Confidence",
        "targets": [{
          "expr": "sum by (model_version) (rate(model_prediction_confidence_sum[2m])) / sum by (model_version) (rate(model_prediction_confidence_count[2m]))"
        }]
      }
    ]
  }
}
```

## Conclusion

Automated canary deployments with KServe and Prometheus provide a safe way to roll out new model versions. By monitoring key metrics like error rates, latency, and prediction confidence, you can catch issues early and automatically roll back if the canary performs poorly. This approach minimizes risk while still allowing you to deploy updates frequently. The gradual traffic shifting ensures that any problems affect only a small percentage of users before being detected and reverted.

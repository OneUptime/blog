# How to Configure Model Monitoring and Data Drift Detection for KServe on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KServe, Model Monitoring, Data Drift, MLOps

Description: Implement comprehensive model monitoring and data drift detection for KServe deployments on Kubernetes to maintain model performance and catch issues early.

---

Deploying a machine learning model is just the beginning. Models degrade over time as real-world data distribution shifts away from the training data, a phenomenon called data drift. Without proper monitoring, you might not notice when your model starts making poor predictions. This guide shows you how to implement monitoring and drift detection for models served with KServe on Kubernetes.

## Understanding Model Monitoring Requirements

Effective model monitoring tracks several key aspects:

- **Data drift**: Changes in input feature distributions
- **Prediction drift**: Changes in model output distributions
- **Model performance**: Accuracy, latency, error rates
- **Concept drift**: Changes in the relationship between features and targets

We'll implement monitoring using Prometheus for metrics, Evidently AI for drift detection, and Grafana for visualization.

## Setting Up the Monitoring Stack

First, install Prometheus and Grafana:

```bash
# Add Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack (includes Prometheus, Grafana, and Alertmanager)
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=5m

# Port forward Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Default credentials: admin/prom-operator
```

## Creating a Model Serving Wrapper with Logging

Build a custom predictor that logs predictions for monitoring:

```python
# monitored_predictor.py
import kserve
import logging
import json
import time
from typing import Dict
from prometheus_client import Counter, Histogram, Gauge
import numpy as np

logging.basicConfig(level=logging.INFO)

# Define Prometheus metrics
PREDICTION_COUNTER = Counter(
    'model_predictions_total',
    'Total number of predictions',
    ['model_name', 'model_version']
)

PREDICTION_LATENCY = Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency in seconds',
    ['model_name', 'model_version']
)

FEATURE_STATS = Gauge(
    'model_feature_mean',
    'Mean value of input features',
    ['model_name', 'feature_name']
)

PREDICTION_DISTRIBUTION = Histogram(
    'model_prediction_distribution',
    'Distribution of model predictions',
    ['model_name'],
    buckets=[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

class MonitoredPredictor(kserve.Model):
    def __init__(self, name: str, model_version: str = "v1"):
        super().__init__(name)
        self.name = name
        self.model_version = model_version
        self.model = None
        self.ready = False
        self.feature_names = []

    def load(self):
        """Load the model"""
        import pickle

        # Load your model here
        # with open('/mnt/models/model.pkl', 'rb') as f:
        #     self.model = pickle.load(f)

        # For demo, create a simple model
        from sklearn.ensemble import RandomForestClassifier
        self.model = RandomForestClassifier()

        self.feature_names = [f'feature_{i}' for i in range(10)]
        self.ready = True
        logging.info(f"Model {self.name} v{self.model_version} loaded")

    def predict(self, request: Dict) -> Dict:
        """Make predictions with monitoring"""
        start_time = time.time()

        try:
            instances = request.get("instances", [])

            # Convert to numpy array
            X = np.array(instances)

            # Log feature statistics
            for i, feature_name in enumerate(self.feature_names):
                if i < X.shape[1]:
                    feature_mean = X[:, i].mean()
                    FEATURE_STATS.labels(
                        model_name=self.name,
                        feature_name=feature_name
                    ).set(feature_mean)

            # Make predictions
            predictions = self.model.predict_proba(X)[:, 1].tolist()

            # Log prediction statistics
            for pred in predictions:
                PREDICTION_DISTRIBUTION.labels(
                    model_name=self.name
                ).observe(pred)

            # Increment counter
            PREDICTION_COUNTER.labels(
                model_name=self.name,
                model_version=self.model_version
            ).inc(len(instances))

            return {"predictions": predictions}

        finally:
            # Record latency
            latency = time.time() - start_time
            PREDICTION_LATENCY.labels(
                model_name=self.name,
                model_version=self.model_version
            ).observe(latency)

    def log_prediction_data(self, request: Dict, response: Dict):
        """Log prediction data for drift analysis"""
        # In production, send to a data store for batch analysis
        log_entry = {
            "timestamp": time.time(),
            "model_name": self.name,
            "model_version": self.model_version,
            "request": request,
            "response": response
        }

        # Could send to Kafka, S3, etc.
        logging.info(f"Prediction log: {json.dumps(log_entry)}")

if __name__ == "__main__":
    predictor = MonitoredPredictor("monitored-model")
    predictor.load()
    kserve.ModelServer().start([predictor])
```

Build and deploy the monitored predictor:

```dockerfile
# Dockerfile.monitored
FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    kserve==0.11.0 \
    scikit-learn==1.3.0 \
    prometheus-client==0.19.0 \
    numpy==1.24.0

COPY monitored_predictor.py /app/

EXPOSE 8080 8000

CMD ["python", "monitored_predictor.py"]
```

Deploy as an InferenceService:

```yaml
# monitored-inference-service.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: monitored-model
  namespace: ml-serving
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  predictor:
    containers:
    - name: kserve-container
      image: your-registry/monitored-predictor:v1
      ports:
      - containerPort: 8080
        name: http
        protocol: TCP
      - containerPort: 8000
        name: metrics
        protocol: TCP
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
```

Create a ServiceMonitor for Prometheus:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kserve-model-monitor
  namespace: ml-serving
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      serving.kserve.io/inferenceservice: monitored-model
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Implementing Drift Detection

Create a drift detection service using Evidently AI:

```python
# drift_detector.py
import pandas as pd
import numpy as np
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset
from evidently.metrics import DatasetDriftMetric, ColumnDriftMetric
import logging
import time
from prometheus_client import Gauge, start_http_server
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)

# Prometheus metrics for drift
DRIFT_SCORE = Gauge(
    'model_drift_score',
    'Data drift score (0-1, higher means more drift)',
    ['model_name']
)

DRIFT_DETECTED = Gauge(
    'model_drift_detected',
    'Whether drift is detected (0 or 1)',
    ['model_name']
)

FEATURE_DRIFT = Gauge(
    'model_feature_drift_score',
    'Drift score per feature',
    ['model_name', 'feature_name']
)

class DriftDetector:
    def __init__(self, model_name: str, reference_data_path: str):
        self.model_name = model_name
        self.reference_data = pd.read_parquet(reference_data_path)
        self.current_window = []
        self.window_size = 1000
        self.feature_names = self.reference_data.columns.tolist()

        logging.info(f"Drift detector initialized with {len(self.reference_data)} reference samples")

    def add_prediction(self, features: np.ndarray):
        """Add a prediction to the current window"""
        self.current_window.append(features)

        if len(self.current_window) >= self.window_size:
            self.check_drift()
            self.current_window = []

    def check_drift(self):
        """Check for data drift"""
        if len(self.current_window) < 100:
            logging.warning("Not enough samples for drift detection")
            return

        # Convert current window to DataFrame
        current_data = pd.DataFrame(
            self.current_window,
            columns=self.feature_names
        )

        logging.info(f"Checking drift with {len(current_data)} samples")

        # Create Evidently report
        report = Report(metrics=[
            DataDriftPreset(),
        ])

        report.run(
            reference_data=self.reference_data,
            current_data=current_data
        )

        # Extract metrics
        results = report.as_dict()

        # Overall drift score
        drift_detected = results['metrics'][0]['result']['dataset_drift']
        drift_score = results['metrics'][0]['result']['drift_share']

        # Update Prometheus metrics
        DRIFT_SCORE.labels(model_name=self.model_name).set(drift_score)
        DRIFT_DETECTED.labels(model_name=self.model_name).set(1 if drift_detected else 0)

        logging.info(f"Drift check complete: drift_detected={drift_detected}, drift_score={drift_score:.3f}")

        # Per-feature drift
        for feature_name in self.feature_names:
            feature_drift_score = 0.0  # Extract from results

            FEATURE_DRIFT.labels(
                model_name=self.model_name,
                feature_name=feature_name
            ).set(feature_drift_score)

        # Generate HTML report
        report_path = f"/reports/drift_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        report.save_html(report_path)
        logging.info(f"Drift report saved to {report_path}")

        # Alert if drift detected
        if drift_detected:
            logging.warning(f"⚠️  DRIFT DETECTED for model {self.model_name}!")
            self.send_alert(drift_score, report_path)

    def send_alert(self, drift_score: float, report_path: str):
        """Send alert when drift is detected"""
        # In production, send to Slack, PagerDuty, etc.
        alert_message = f"""
        Data Drift Alert!

        Model: {self.model_name}
        Drift Score: {drift_score:.3f}
        Report: {report_path}

        Action Required: Review model performance and consider retraining.
        """
        logging.error(alert_message)

if __name__ == "__main__":
    # Start Prometheus metrics server
    start_http_server(8001)

    # Initialize drift detector
    detector = DriftDetector(
        model_name="monitored-model",
        reference_data_path="/data/reference_data.parquet"
    )

    logging.info("Drift detector started on port 8001")

    # Keep running
    while True:
        time.sleep(60)
```

Deploy the drift detector:

```yaml
# drift-detector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: drift-detector
  namespace: ml-serving
spec:
  replicas: 1
  selector:
    matchLabels:
      app: drift-detector
  template:
    metadata:
      labels:
        app: drift-detector
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: detector
        image: your-registry/drift-detector:v1
        ports:
        - containerPort: 8001
          name: metrics
        env:
        - name: MODEL_NAME
          value: "monitored-model"
        - name: REFERENCE_DATA_PATH
          value: "/data/reference_data.parquet"
        resources:
          requests:
            cpu: "500m"
            memory: "2Gi"
          limits:
            cpu: "1"
            memory: "4Gi"
        volumeMounts:
        - name: reference-data
          mountPath: /data
        - name: reports
          mountPath: /reports
      volumes:
      - name: reference-data
        persistentVolumeClaim:
          claimName: reference-data-pvc
      - name: reports
        persistentVolumeClaim:
          claimName: drift-reports-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: drift-detector
  namespace: ml-serving
spec:
  selector:
    app: drift-detector
  ports:
  - port: 8001
    targetPort: 8001
    name: metrics
```

## Creating Grafana Dashboards

Create a comprehensive monitoring dashboard:

```json
{
  "dashboard": {
    "title": "ML Model Monitoring Dashboard",
    "panels": [
      {
        "title": "Predictions Per Minute",
        "targets": [{
          "expr": "rate(model_predictions_total[1m])"
        }],
        "type": "graph"
      },
      {
        "title": "P95 Prediction Latency",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(model_prediction_latency_seconds_bucket[5m]))"
        }],
        "type": "graph"
      },
      {
        "title": "Data Drift Score",
        "targets": [{
          "expr": "model_drift_score"
        }],
        "type": "graph",
        "alert": {
          "conditions": [{
            "evaluator": {
              "params": [0.5],
              "type": "gt"
            }
          }]
        }
      },
      {
        "title": "Drift Detection Status",
        "targets": [{
          "expr": "model_drift_detected"
        }],
        "type": "stat"
      },
      {
        "title": "Feature Distribution - Mean Values",
        "targets": [{
          "expr": "model_feature_mean"
        }],
        "type": "graph"
      },
      {
        "title": "Prediction Distribution",
        "targets": [{
          "expr": "rate(model_prediction_distribution_bucket[5m])"
        }],
        "type": "heatmap"
      }
    ]
  }
}
```

Import the dashboard:

```bash
# Save dashboard JSON to file
cat > dashboard.json << 'EOF'
{dashboard JSON here}
EOF

# Import via Grafana UI or API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @dashboard.json
```

## Setting Up Alerts

Create Prometheus alerting rules:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: model-monitoring-alerts
  namespace: monitoring
spec:
  groups:
  - name: model-drift
    interval: 1m
    rules:
    - alert: DataDriftDetected
      expr: model_drift_detected == 1
      for: 5m
      labels:
        severity: warning
        team: ml-ops
      annotations:
        summary: "Data drift detected for {{ $labels.model_name }}"
        description: "Model {{ $labels.model_name }} is experiencing data drift. Consider retraining."

    - alert: HighDriftScore
      expr: model_drift_score > 0.7
      for: 10m
      labels:
        severity: critical
        team: ml-ops
      annotations:
        summary: "Critical drift score for {{ $labels.model_name }}"
        description: "Drift score is {{ $value }}. Immediate action required."

  - name: model-performance
    interval: 1m
    rules:
    - alert: HighPredictionLatency
      expr: histogram_quantile(0.95, rate(model_prediction_latency_seconds_bucket[5m])) > 1.0
      for: 5m
      labels:
        severity: warning
        team: ml-ops
      annotations:
        summary: "High prediction latency for {{ $labels.model_name }}"
        description: "P95 latency is {{ $value }}s"

    - alert: LowPredictionRate
      expr: rate(model_predictions_total[5m]) < 1
      for: 10m
      labels:
        severity: warning
        team: ml-ops
      annotations:
        summary: "Low prediction rate for {{ $labels.model_name }}"
        description: "Prediction rate is {{ $value }} req/s"
```

Apply the alerting rules:

```bash
kubectl apply -f prometheus-rules.yaml

# Verify rules are loaded
kubectl get prometheusrules -n monitoring
```

## Automated Model Retraining Trigger

Create a controller that triggers retraining when drift is detected:

```python
# retrain_controller.py
import time
import logging
from prometheus_api_client import PrometheusConnect
import kubernetes.client
from kubernetes import config

logging.basicConfig(level=logging.INFO)

class RetrainingController:
    def __init__(self, prometheus_url: str, drift_threshold: float = 0.6):
        self.prom = PrometheusConnect(url=prometheus_url, disable_ssl=True)
        self.drift_threshold = drift_threshold

        # Load Kubernetes config
        config.load_incluster_config()
        self.batch_client = kubernetes.client.BatchV1Api()

    def check_drift_and_trigger(self):
        """Check drift metrics and trigger retraining if needed"""

        # Query current drift score
        query = f'model_drift_score'
        result = self.prom.custom_query(query=query)

        for metric in result:
            model_name = metric['metric'].get('model_name')
            drift_score = float(metric['value'][1])

            logging.info(f"Model {model_name}: drift_score={drift_score:.3f}")

            if drift_score > self.drift_threshold:
                logging.warning(f"Drift threshold exceeded for {model_name}, triggering retraining")
                self.trigger_retraining(model_name)

    def trigger_retraining(self, model_name: str):
        """Trigger a retraining job"""

        job_manifest = {
            "apiVersion": "batch/v1",
            "kind": "Job",
            "metadata": {
                "name": f"retrain-{model_name}-{int(time.time())}",
                "namespace": "ml-training"
            },
            "spec": {
                "template": {
                    "spec": {
                        "restartPolicy": "OnFailure",
                        "containers": [{
                            "name": "trainer",
                            "image": "your-registry/model-trainer:v1",
                            "env": [{
                                "name": "MODEL_NAME",
                                "value": model_name
                            }]
                        }]
                    }
                }
            }
        }

        self.batch_client.create_namespaced_job(
            namespace="ml-training",
            body=job_manifest
        )

        logging.info(f"Retraining job created for {model_name}")

if __name__ == "__main__":
    controller = RetrainingController(
        prometheus_url="http://monitoring-prometheus.monitoring.svc:9090",
        drift_threshold=0.6
    )

    while True:
        try:
            controller.check_drift_and_trigger()
        except Exception as e:
            logging.error(f"Error in controller: {e}")

        time.sleep(300)  # Check every 5 minutes
```

## Conclusion

Implementing comprehensive monitoring and drift detection for KServe models ensures you catch performance degradation before it impacts users. By combining real-time metrics with batch drift analysis, you can maintain model quality over time and automate the retraining process when needed. The integration with Prometheus and Grafana provides visibility into both model performance and data quality, making it easier to diagnose issues and maintain reliable ML systems in production.

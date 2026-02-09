# How to Implement Predictive Autoscaling with Kubernetes and ML Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, Autoscaling

Description: Learn how to implement predictive autoscaling using machine learning models to forecast resource needs and scale proactively before traffic spikes occur.

---

Traditional reactive autoscaling responds to current metrics. Pods scale up after CPU or memory crosses a threshold, meaning your application experiences degraded performance during the ramp-up period. Predictive autoscaling uses machine learning to forecast future resource needs and scales proactively, preventing performance degradation before it happens.

## Why Predictive Autoscaling Matters

Reactive autoscaling has inherent delays:

- Metric collection lag (15-30 seconds)
- HPA evaluation interval (15 seconds default)
- Pod startup time (30 seconds to several minutes)
- Application warmup (cache loading, connection pools, etc.)

For workloads with predictable patterns like daily traffic cycles, scheduled batch jobs, or recurring events, predictive models can anticipate load changes and pre-scale resources.

## Building a Time Series Forecasting Model

We'll use Prophet, a forecasting library from Facebook, to predict CPU usage based on historical patterns.

Install dependencies:

```python
# requirements.txt
prophet==1.1.5
pandas==2.2.0
prometheus-api-client==0.5.3
kubernetes==29.0.0
```

Create the forecasting service:

```python
# predictive_scaler.py
import pandas as pd
from prophet import Prophet
from prometheus_api_client import PrometheusConnect
from kubernetes import client, config
import datetime
import time

class PredictiveScaler:
    def __init__(self, prometheus_url, namespace, deployment_name):
        self.prom = PrometheusConnect(url=prometheus_url)
        self.namespace = namespace
        self.deployment_name = deployment_name
        config.load_incluster_config()
        self.apps_v1 = client.AppsV1Api()

    def fetch_historical_data(self, days=14):
        """Fetch CPU usage history from Prometheus"""
        end_time = datetime.datetime.now()
        start_time = end_time - datetime.timedelta(days=days)

        query = f'''
            avg(rate(container_cpu_usage_seconds_total{{
                namespace="{self.namespace}",
                pod=~"{self.deployment_name}-.*"
            }}[5m]))
        '''

        result = self.prom.custom_query_range(
            query=query,
            start_time=start_time,
            end_time=end_time,
            step="5m"
        )

        # Convert to DataFrame
        timestamps = []
        values = []
        for item in result[0]['values']:
            timestamps.append(datetime.datetime.fromtimestamp(item[0]))
            values.append(float(item[1]))

        df = pd.DataFrame({
            'ds': timestamps,  # Prophet requires 'ds' column
            'y': values        # Prophet requires 'y' column
        })

        return df

    def train_forecast_model(self, df):
        """Train Prophet model on historical data"""
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05  # Lower value = less flexible
        )
        model.fit(df)
        return model

    def predict_next_hour(self, model):
        """Forecast CPU usage for next hour"""
        future = model.make_future_dataframe(periods=12, freq='5min')
        forecast = model.predict(future)

        # Get predictions for next hour
        next_hour = forecast.tail(12)
        return next_hour[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]

    def calculate_required_replicas(self, predicted_cpu, current_replicas):
        """Calculate replicas needed for predicted load"""
        # Assume each pod can handle 0.7 CPU cores comfortably
        target_cpu_per_pod = 0.7

        # Add 20% buffer for safety
        required_replicas = int((predicted_cpu / target_cpu_per_pod) * 1.2)

        # Respect min/max bounds
        min_replicas = 2
        max_replicas = 50

        return max(min_replicas, min(required_replicas, max_replicas))

    def scale_deployment(self, replicas):
        """Scale the deployment to target replicas"""
        try:
            # Get current deployment
            deployment = self.apps_v1.read_namespaced_deployment(
                name=self.deployment_name,
                namespace=self.namespace
            )

            # Update replica count
            deployment.spec.replicas = replicas

            # Apply update
            self.apps_v1.patch_namespaced_deployment(
                name=self.deployment_name,
                namespace=self.namespace,
                body=deployment
            )

            print(f"Scaled {self.deployment_name} to {replicas} replicas")
            return True
        except Exception as e:
            print(f"Failed to scale: {e}")
            return False

    def run_scaling_loop(self):
        """Main prediction and scaling loop"""
        while True:
            try:
                # Fetch historical data
                print("Fetching historical metrics...")
                df = self.fetch_historical_data(days=14)

                # Train model
                print("Training forecast model...")
                model = self.train_forecast_model(df)

                # Predict next hour
                print("Generating predictions...")
                predictions = self.predict_next_hour(model)

                # Get peak predicted CPU in next hour
                peak_cpu = predictions['yhat_upper'].max()
                print(f"Predicted peak CPU: {peak_cpu:.2f}")

                # Get current replicas
                deployment = self.apps_v1.read_namespaced_deployment(
                    name=self.deployment_name,
                    namespace=self.namespace
                )
                current_replicas = deployment.spec.replicas

                # Calculate required replicas
                required_replicas = self.calculate_required_replicas(
                    peak_cpu,
                    current_replicas
                )

                print(f"Current: {current_replicas}, Required: {required_replicas}")

                # Scale if needed
                if required_replicas != current_replicas:
                    self.scale_deployment(required_replicas)

                # Sleep for 5 minutes before next prediction
                time.sleep(300)

            except Exception as e:
                print(f"Error in scaling loop: {e}")
                time.sleep(60)

# Run the scaler
if __name__ == "__main__":
    scaler = PredictiveScaler(
        prometheus_url="http://prometheus.monitoring:9090",
        namespace="production",
        deployment_name="webapp-deployment"
    )
    scaler.run_scaling_loop()
```

## Deploying the Predictive Scaler

Package the scaler as a Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-scaler
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: predictive-scaler
  template:
    metadata:
      labels:
        app: predictive-scaler
    spec:
      serviceAccountName: predictive-scaler
      containers:
      - name: scaler
        image: your-registry/predictive-scaler:v1.0
        env:
        - name: PROMETHEUS_URL
          value: "http://prometheus.monitoring:9090"
        - name: NAMESPACE
          value: "production"
        - name: DEPLOYMENT
          value: "webapp-deployment"
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: predictive-scaler
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: predictive-scaler
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "list", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: predictive-scaler
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: predictive-scaler
subjects:
- kind: ServiceAccount
  name: predictive-scaler
  namespace: production
```

## Using LSTM for Complex Patterns

For workloads with complex seasonality, use LSTM neural networks:

```python
# lstm_predictor.py
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.preprocessing import MinMaxScaler

class LSTMPredictor:
    def __init__(self, lookback_periods=24):
        self.lookback_periods = lookback_periods
        self.scaler = MinMaxScaler()
        self.model = None

    def prepare_data(self, df):
        """Prepare time series for LSTM"""
        # Normalize data
        scaled_data = self.scaler.fit_transform(df[['y']])

        # Create sequences
        X, y = [], []
        for i in range(self.lookback_periods, len(scaled_data)):
            X.append(scaled_data[i-self.lookback_periods:i, 0])
            y.append(scaled_data[i, 0])

        return np.array(X), np.array(y)

    def build_model(self):
        """Build LSTM model"""
        model = keras.Sequential([
            keras.layers.LSTM(50, return_sequences=True, input_shape=(self.lookback_periods, 1)),
            keras.layers.Dropout(0.2),
            keras.layers.LSTM(50, return_sequences=False),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(25),
            keras.layers.Dense(1)
        ])

        model.compile(optimizer='adam', loss='mean_squared_error')
        return model

    def train(self, X, y):
        """Train the model"""
        X = X.reshape((X.shape[0], X.shape[1], 1))

        self.model = self.build_model()
        self.model.fit(X, y, epochs=50, batch_size=32, verbose=0)

    def predict_next_steps(self, recent_data, steps=12):
        """Predict next N time steps"""
        predictions = []
        current_sequence = recent_data[-self.lookback_periods:].reshape(1, -1, 1)

        for _ in range(steps):
            # Predict next value
            next_pred = self.model.predict(current_sequence, verbose=0)
            predictions.append(next_pred[0, 0])

            # Update sequence
            current_sequence = np.append(current_sequence[0, 1:], next_pred).reshape(1, -1, 1)

        # Inverse transform to get actual values
        predictions = self.scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
        return predictions.flatten()
```

## Integrating with KEDA for Event-Driven Scaling

Combine predictive scaling with KEDA for hybrid approach:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: hybrid-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: webapp-deployment
  minReplicaCount: 3  # Updated by predictive scaler
  maxReplicaCount: 50
  triggers:
  # Reactive trigger for sudden spikes
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      query: |
        rate(http_requests_total{namespace="production"}[1m])
      threshold: "2000"
  # Reactive trigger for CPU
  - type: cpu
    metricType: Utilization
    metadata:
      value: "80"
```

The predictive scaler adjusts `minReplicaCount` based on forecasts, while KEDA handles reactive scaling for unexpected spikes.

## Monitoring Prediction Accuracy

Track how well predictions match reality:

```python
def calculate_prediction_error(predicted, actual):
    """Calculate Mean Absolute Percentage Error"""
    mape = np.mean(np.abs((actual - predicted) / actual)) * 100
    return mape

# Store predictions and compare with actual values
predictions_log = []

# After each prediction
predictions_log.append({
    'timestamp': datetime.datetime.now(),
    'predicted': peak_cpu,
    'actual': None  # Fill in later
})

# After the predicted period
actual_cpu = fetch_actual_cpu_for_period()
predictions_log[-1]['actual'] = actual_cpu

error = calculate_prediction_error(predicted, actual_cpu)
print(f"Prediction error: {error:.2f}%")
```

Export metrics for Prometheus:

```python
from prometheus_client import Gauge, start_http_server

prediction_error_gauge = Gauge('predictive_scaler_error_percent', 'Prediction error percentage')
current_replicas_gauge = Gauge('predictive_scaler_current_replicas', 'Current replica count')
predicted_replicas_gauge = Gauge('predictive_scaler_predicted_replicas', 'Predicted replica requirement')

# Update metrics
prediction_error_gauge.set(error)
current_replicas_gauge.set(current_replicas)
predicted_replicas_gauge.set(required_replicas)

# Start metrics server
start_http_server(8000)
```

## Best Practices

**Use sufficient historical data**: Train on at least 2-4 weeks of data to capture weekly patterns. More data helps for monthly or seasonal patterns.

**Validate predictions**: Run predictions in shadow mode first, logging what scaling decisions would have been made without actually scaling. Compare with actual needs.

**Combine with reactive scaling**: Predictive models handle expected patterns. Keep reactive autoscaling as a safety net for unexpected spikes.

**Retrain regularly**: Retrain models weekly or when deployment characteristics change significantly. Application behavior evolves over time.

**Add safety margins**: Always predict slightly higher than expected and scale proactively. The cost of over-provisioning for a few minutes is lower than performance degradation.

**Monitor model drift**: Track prediction accuracy over time. If error rates increase, investigate whether workload patterns have changed.

Predictive autoscaling transforms Kubernetes from reactive to proactive, ensuring resources are ready before demand arrives. For workloads with predictable patterns, this eliminates the performance impact of scaling delays.

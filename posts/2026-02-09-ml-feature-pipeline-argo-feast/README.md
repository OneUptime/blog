# How to Build a Kubernetes-Native ML Feature Pipeline with Argo Workflows and Feast

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, Data Engineering

Description: Learn how to build a production-grade ML feature engineering pipeline on Kubernetes using Argo Workflows for orchestration and Feast for feature storage, enabling consistent features across training and inference.

---

Machine learning models are only as good as the features they're trained on. In production ML systems, the challenge isn't just computing features once, but maintaining consistency between training features and serving features while handling the operational complexity of data pipelines.

This is where a proper feature store becomes essential. In this guide, you'll build a complete feature pipeline using Argo Workflows for orchestration and Feast for feature storage and serving, all running on Kubernetes.

## The Feature Engineering Challenge

Consider a fraud detection model that uses features like "transaction count in last hour" and "average transaction amount last 30 days". During training, you compute these from historical data. During inference, you need the same calculations on real-time data.

Without a feature store, teams end up with:

- Duplicate feature logic in training and serving code
- Training-serving skew where features don't match
- No feature versioning or lineage tracking
- Difficult feature reuse across models

Feast solves this by providing a centralized feature store with both offline (training) and online (serving) capabilities.

## Architecture Overview

Our pipeline has three main components:

1. **Data Sources**: Raw data from databases, data warehouses, or streams
2. **Argo Workflows**: Orchestrates feature computation jobs on schedules
3. **Feast**: Stores features for both training (offline) and inference (online)

Features are computed periodically, written to Feast's offline store (like Parquet files), and optionally materialized to the online store (like Redis) for low-latency serving.

## Installing Feast on Kubernetes

First, install Feast. We'll deploy the Feast feature server that provides HTTP/gRPC APIs for feature retrieval:

```yaml
# feast-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: feast
```

Create a feature repository structure that Feast will use:

```bash
# Initialize a Feast repository locally first
pip install feast
feast init feature_repo
cd feature_repo
```

Edit `feature_store.yaml` to configure offline and online stores:

```yaml
# feature_store.yaml
project: fraud_detection
registry: gs://your-bucket/feast-registry.db
provider: gcp

offline_store:
  type: bigquery
  project_id: your-project
  dataset: feast_offline

online_store:
  type: redis
  connection_string: redis://redis-feast.feast.svc.cluster.local:6379
```

Deploy Redis for the online store:

```yaml
# redis-feast.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-feast
  namespace: feast
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-feast
  template:
    metadata:
      labels:
        app: redis-feast
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: redis-feast-data
---
apiVersion: v1
kind: Service
metadata:
  name: redis-feast
  namespace: feast
spec:
  selector:
    app: redis-feast
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-feast-data
  namespace: feast
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

Apply the Redis setup:

```bash
kubectl apply -f feast-namespace.yaml
kubectl apply -f redis-feast.yaml
```

## Defining Feature Views in Feast

Create feature definitions in Python. These define how raw data maps to features:

```python
# features.py
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource, ValueType
from feast.types import Float32, Int64

# Define the entity (what features are keyed by)
user = Entity(
    name="user_id",
    description="User identifier",
    value_type=ValueType.INT64
)

# Define the data source
transactions_source = FileSource(
    path="gs://your-bucket/feature-data/transactions.parquet",
    timestamp_field="event_timestamp",
)

# Define feature views
user_transaction_features = FeatureView(
    name="user_transaction_features",
    entities=[user],
    ttl=timedelta(days=30),
    schema=[
        Field(name="transaction_count_1h", dtype=Int64),
        Field(name="transaction_count_24h", dtype=Int64),
        Field(name="avg_transaction_amount_7d", dtype=Float32),
        Field(name="avg_transaction_amount_30d", dtype=Float32),
        Field(name="max_transaction_amount_7d", dtype=Float32),
        Field(name="distinct_merchant_count_7d", dtype=Int64),
    ],
    source=transactions_source,
    online=True,  # Enable online serving
)
```

Apply feature definitions to Feast:

```bash
feast apply
```

This registers your features in Feast's registry.

## Building Feature Computation Jobs

Create a Python script that computes features from raw data:

```python
# compute_features.py
import pandas as pd
from datetime import datetime, timedelta
from google.cloud import bigquery

def compute_transaction_features(start_date, end_date):
    """
    Compute transaction features from raw data.
    """
    client = bigquery.Client()

    # Query raw transaction data
    query = f"""
    SELECT
        user_id,
        timestamp as event_timestamp,
        amount,
        merchant_id
    FROM
        `project.dataset.transactions`
    WHERE
        timestamp BETWEEN '{start_date}' AND '{end_date}'
    """

    transactions = client.query(query).to_dataframe()

    # Compute time-window features
    features = []

    for user_id in transactions['user_id'].unique():
        user_txns = transactions[transactions['user_id'] == user_id]

        for idx, row in user_txns.iterrows():
            event_time = row['event_timestamp']

            # Window-based aggregations
            window_1h = user_txns[
                (user_txns['event_timestamp'] >= event_time - timedelta(hours=1)) &
                (user_txns['event_timestamp'] < event_time)
            ]

            window_24h = user_txns[
                (user_txns['event_timestamp'] >= event_time - timedelta(hours=24)) &
                (user_txns['event_timestamp'] < event_time)
            ]

            window_7d = user_txns[
                (user_txns['event_timestamp'] >= event_time - timedelta(days=7)) &
                (user_txns['event_timestamp'] < event_time)
            ]

            window_30d = user_txns[
                (user_txns['event_timestamp'] >= event_time - timedelta(days=30)) &
                (user_txns['event_timestamp'] < event_time)
            ]

            features.append({
                'user_id': user_id,
                'event_timestamp': event_time,
                'transaction_count_1h': len(window_1h),
                'transaction_count_24h': len(window_24h),
                'avg_transaction_amount_7d': window_7d['amount'].mean() if len(window_7d) > 0 else 0.0,
                'avg_transaction_amount_30d': window_30d['amount'].mean() if len(window_30d) > 0 else 0.0,
                'max_transaction_amount_7d': window_7d['amount'].max() if len(window_7d) > 0 else 0.0,
                'distinct_merchant_count_7d': window_7d['merchant_id'].nunique() if len(window_7d) > 0 else 0,
            })

    features_df = pd.DataFrame(features)

    # Write to parquet for Feast offline store
    output_path = f"gs://your-bucket/feature-data/transactions.parquet"
    features_df.to_parquet(output_path)

    print(f"Computed {len(features_df)} feature rows")
    return output_path

if __name__ == "__main__":
    import sys
    start_date = sys.argv[1]
    end_date = sys.argv[2]
    compute_transaction_features(start_date, end_date)
```

Build this into a Docker image:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install pandas google-cloud-bigquery pyarrow feast

COPY compute_features.py .

ENTRYPOINT ["python", "compute_features.py"]
```

Build and push:

```bash
docker build -t your-registry/feature-compute:latest .
docker push your-registry/feature-compute:latest
```

## Orchestrating with Argo Workflows

Install Argo Workflows if not already installed:

```bash
kubectl create namespace argo
kubectl apply -n argo -f https://raw.githubusercontent.com/argoproj/argo-workflows/stable/manifests/quick-start-postgres.yaml
```

Create an Argo Workflow that runs feature computation and materializes to online store:

```yaml
# feature-pipeline-workflow.yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: feature-pipeline-
  namespace: argo
spec:
  entrypoint: feature-pipeline
  arguments:
    parameters:
      - name: start-date
        value: "2026-02-08"
      - name: end-date
        value: "2026-02-09"

  templates:
    - name: feature-pipeline
      steps:
        # Step 1: Compute features from raw data
        - - name: compute-features
            template: compute-features-template
            arguments:
              parameters:
                - name: start-date
                  value: "{{workflow.parameters.start-date}}"
                - name: end-date
                  value: "{{workflow.parameters.end-date}}"

        # Step 2: Materialize features to online store
        - - name: materialize-online
            template: materialize-template

    - name: compute-features-template
      inputs:
        parameters:
          - name: start-date
          - name: end-date
      container:
        image: your-registry/feature-compute:latest
        args:
          - "{{inputs.parameters.start-date}}"
          - "{{inputs.parameters.end-date}}"
        resources:
          requests:
            memory: 4Gi
            cpu: "2"
          limits:
            memory: 8Gi
            cpu: "4"
        env:
          - name: GOOGLE_APPLICATION_CREDENTIALS
            value: /var/secrets/google/key.json
        volumeMounts:
          - name: gcp-credentials
            mountPath: /var/secrets/google

    - name: materialize-template
      container:
        image: your-registry/feast-client:latest
        command: ["/bin/bash", "-c"]
        args:
          - |
            # Materialize features to online store
            cd /feast-repo
            feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")
        resources:
          requests:
            memory: 2Gi
            cpu: "1"
        volumeMounts:
          - name: feast-repo
            mountPath: /feast-repo
          - name: gcp-credentials
            mountPath: /var/secrets/google

  volumes:
    - name: gcp-credentials
      secret:
        secretName: gcp-credentials
    - name: feast-repo
      configMap:
        name: feast-feature-repo
```

Create a CronWorkflow to run this daily:

```yaml
# feature-pipeline-cron.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: daily-feature-pipeline
  namespace: argo
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  timezone: "America/Los_Angeles"
  startingDeadlineSeconds: 0
  concurrencyPolicy: "Replace"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  workflowSpec:
    entrypoint: feature-pipeline
    arguments:
      parameters:
        - name: start-date
          value: "{{workflow.creationTimestamp.Y}}-{{workflow.creationTimestamp.m}}-{{workflow.creationTimestamp.d}}"
        - name: end-date
          value: "{{workflow.creationTimestamp.Y}}-{{workflow.creationTimestamp.m}}-{{workflow.creationTimestamp.d}}"
    templates:
      - name: feature-pipeline
        steps:
          - - name: compute-features
              templateRef:
                name: feature-pipeline
                template: compute-features-template
```

Apply the workflows:

```bash
kubectl apply -f feature-pipeline-workflow.yaml
kubectl apply -f feature-pipeline-cron.yaml
```

## Deploying Feast Feature Server

Deploy a feature server for online feature retrieval:

```yaml
# feast-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feast-server
  namespace: feast
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feast-server
  template:
    metadata:
      labels:
        app: feast-server
    spec:
      containers:
        - name: server
          image: feastdev/feature-server:latest
          command:
            - feast
            - serve
          ports:
            - containerPort: 6566
              name: grpc
            - containerPort: 6567
              name: http
          env:
            - name: FEAST_FEATURE_STORE_YAML_BASE64
              valueFrom:
                configMapKeyRef:
                  name: feast-config
                  key: feature_store_yaml_base64
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: feast-server
  namespace: feast
spec:
  selector:
    app: feast-server
  ports:
    - name: grpc
      port: 6566
      targetPort: 6566
    - name: http
      port: 6567
      targetPort: 6567
  type: ClusterIP
```

Apply the server:

```bash
kubectl apply -f feast-server.yaml
```

## Using Features for Training

Retrieve features for training from the offline store:

```python
# training.py
from feast import FeatureStore
import pandas as pd

# Initialize Feast client
store = FeatureStore(repo_path=".")

# Get training data with features
entity_df = pd.DataFrame({
    'user_id': [1001, 1002, 1003, 1004],
    'event_timestamp': [
        '2026-02-09 10:00:00',
        '2026-02-09 11:00:00',
        '2026-02-09 12:00:00',
        '2026-02-09 13:00:00',
    ]
})

# Retrieve features
training_data = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_transaction_features:transaction_count_1h",
        "user_transaction_features:transaction_count_24h",
        "user_transaction_features:avg_transaction_amount_7d",
        "user_transaction_features:avg_transaction_amount_30d",
    ]
).to_df()

print(training_data.head())

# Train model with features
# X = training_data.drop(['user_id', 'event_timestamp', 'label'], axis=1)
# y = training_data['label']
# model.fit(X, y)
```

## Using Features for Inference

Retrieve features for real-time inference from the online store:

```python
# inference.py
from feast import FeatureStore

store = FeatureStore(repo_path=".")

# Get latest features for a user
features = store.get_online_features(
    features=[
        "user_transaction_features:transaction_count_1h",
        "user_transaction_features:transaction_count_24h",
        "user_transaction_features:avg_transaction_amount_7d",
        "user_transaction_features:avg_transaction_amount_30d",
    ],
    entity_rows=[{"user_id": 1001}]
).to_dict()

print(features)
# {'user_id': [1001], 'transaction_count_1h': [5], ...}

# Use features for prediction
# prediction = model.predict([features])
```

Or use the feature server HTTP API:

```bash
curl -X POST http://feast-server.feast.svc.cluster.local:6567/get-online-features \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      "user_transaction_features:transaction_count_1h",
      "user_transaction_features:avg_transaction_amount_7d"
    ],
    "entities": {
      "user_id": [1001, 1002]
    }
  }'
```

## Monitoring the Feature Pipeline

Add monitoring for feature pipelines:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: feature-pipeline-alerts
  namespace: argo
spec:
  groups:
    - name: feature-pipeline
      interval: 30s
      rules:
        - alert: FeaturePipelineFailures
          expr: |
            sum(argo_workflow_status_phase{phase="Failed"}) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Feature pipeline workflows are failing"

        - alert: StaleFeatures
          expr: |
            time() - feast_last_materialization_timestamp > 7200
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Features haven't been materialized in 2 hours"
```

## Conclusion

Building a feature pipeline with Argo Workflows and Feast creates a production-grade system for ML feature management. This architecture ensures consistency between training and serving, enables feature reuse, and provides the operational tooling needed for reliable ML systems.

Start with a few key features, validate the training-serving consistency, then expand your feature catalog. The investment in proper feature infrastructure pays dividends as your ML platform scales to multiple models and teams.

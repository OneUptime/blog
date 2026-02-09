# How to Run a Feature Store with Feast on Kubernetes for ML Feature Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Feast, Feature Store, Machine Learning, MLOps

Description: Set up Feast feature store on Kubernetes to manage, version, and serve machine learning features for training and real-time inference workflows.

---

Machine learning models depend on features extracted from raw data, and managing these features consistently across training and serving is challenging. A feature store solves this by providing a centralized repository for feature definitions, historical data for training, and low-latency serving for inference. Feast (Feature Store) is an open-source solution that runs well on Kubernetes and integrates with popular ML frameworks.

This guide walks through deploying Feast on Kubernetes and using it for both offline training and online serving.

## Understanding Feast Architecture

Feast consists of several components:

- **Feature Registry**: Stores feature definitions and metadata
- **Offline Store**: Historical feature data for training (BigQuery, Snowflake, etc.)
- **Online Store**: Low-latency feature serving for inference (Redis, DynamoDB, etc.)
- **Feature Server**: REST/gRPC API for retrieving features
- **Python SDK**: For defining and retrieving features

For Kubernetes deployment, we'll use Redis as the online store and PostgreSQL for the registry.

## Deploying Redis for Online Feature Storage

Start by deploying Redis for low-latency feature serving:

```yaml
# redis-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: feast
data:
  redis.conf: |
    maxmemory 4gb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    save 60 10000
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: feast
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        command: ["redis-server"]
        args: ["/etc/redis/redis.conf"]
        ports:
        - containerPort: 6379
          name: redis
        resources:
          requests:
            cpu: "500m"
            memory: "4Gi"
          limits:
            cpu: "1"
            memory: "4Gi"
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: feast
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

Deploy Redis:

```bash
# Create namespace
kubectl create namespace feast

# Deploy Redis
kubectl apply -f redis-deployment.yaml

# Verify Redis is running
kubectl get pods -n feast -l app=redis
kubectl exec -n feast redis-0 -- redis-cli ping
# Should return: PONG
```

## Deploying PostgreSQL for Feature Registry

Deploy PostgreSQL to store feature definitions:

```yaml
# postgres-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: feast
data:
  POSTGRES_DB: feast
  POSTGRES_USER: feast
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: feast
type: Opaque
stringData:
  POSTGRES_PASSWORD: "your-secure-password"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: feast
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        envFrom:
        - configMapRef:
            name: postgres-config
        - secretRef:
            name: postgres-secret
        resources:
          requests:
            cpu: "500m"
            memory: "2Gi"
          limits:
            cpu: "1"
            memory: "4Gi"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: feast
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

Deploy PostgreSQL:

```bash
kubectl apply -f postgres-deployment.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=Ready pod/postgres-0 -n feast --timeout=5m

# Test connection
kubectl exec -n feast postgres-0 -- psql -U feast -c "SELECT version();"
```

## Creating Feast Feature Definitions

Create a Python project with feature definitions:

```python
# features.py
from datetime import timedelta
from feast import Entity, Feature, FeatureView, Field, FileSource
from feast.types import Float32, Int64, String

# Define entities
user = Entity(
    name="user_id",
    description="User identifier",
)

item = Entity(
    name="item_id",
    description="Item identifier",
)

# Define data sources (offline store)
user_features_source = FileSource(
    path="/data/user_features.parquet",
    timestamp_field="event_timestamp",
)

item_features_source = FileSource(
    path="/data/item_features.parquet",
    timestamp_field="event_timestamp",
)

# Define feature views
user_features = FeatureView(
    name="user_features",
    entities=[user],
    ttl=timedelta(days=30),
    schema=[
        Field(name="age", dtype=Int64),
        Field(name="country", dtype=String),
        Field(name="total_purchases", dtype=Int64),
        Field(name="avg_purchase_value", dtype=Float32),
    ],
    online=True,
    source=user_features_source,
    tags={"team": "recommendations"},
)

item_features = FeatureView(
    name="item_features",
    entities=[item],
    ttl=timedelta(days=7),
    schema=[
        Field(name="category", dtype=String),
        Field(name="price", dtype=Float32),
        Field(name="popularity_score", dtype=Float32),
        Field(name="stock_level", dtype=Int64),
    ],
    online=True,
    source=item_features_source,
    tags={"team": "recommendations"},
)
```

Create Feast configuration:

```yaml
# feature_store.yaml
project: recommendation_system
provider: local
registry:
  registry_type: sql
  path: postgresql://feast:your-secure-password@postgres.feast.svc.cluster.local:5432/feast
online_store:
  type: redis
  connection_string: redis:6379
offline_store:
  type: file
entity_key_serialization_version: 2
```

## Building a Feast Feature Server Container

Create a Dockerfile for the feature server:

```dockerfile
# Dockerfile.feast
FROM python:3.10-slim

WORKDIR /app

# Install Feast with Redis support
RUN pip install --no-cache-dir \
    feast[redis]==0.35.0 \
    psycopg2-binary \
    boto3

# Copy feature definitions
COPY features.py /app/
COPY feature_store.yaml /app/

# Initialize Feast repository
RUN feast -c /app apply

# Expose feature server port
EXPOSE 6566

# Start feature server
CMD ["feast", "-c", "/app", "serve", "--host", "0.0.0.0", "--port", "6566"]
```

Build and push the image:

```bash
# Build the image
docker build -t your-registry/feast-server:v1 -f Dockerfile.feast .

# Push to registry
docker push your-registry/feast-server:v1
```

## Deploying Feast Feature Server

Deploy the feature server on Kubernetes:

```yaml
# feast-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feast-feature-server
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
      - name: feast-server
        image: your-registry/feast-server:v1
        ports:
        - containerPort: 6566
          name: http
        env:
        - name: FEAST_REGISTRY_PATH
          value: "postgresql://feast:your-secure-password@postgres.feast.svc.cluster.local:5432/feast"
        - name: FEAST_ONLINE_STORE_TYPE
          value: "redis"
        - name: FEAST_ONLINE_STORE_CONNECTION_STRING
          value: "redis:6379"
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 6566
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 6566
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: feast-feature-server
  namespace: feast
spec:
  selector:
    app: feast-server
  ports:
  - port: 6566
    targetPort: 6566
    name: http
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: feast-server-hpa
  namespace: feast
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: feast-feature-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Deploy the feature server:

```bash
kubectl apply -f feast-server-deployment.yaml

# Check deployment status
kubectl get deployments -n feast

# Verify feature server is healthy
kubectl get pods -n feast -l app=feast-server

# Test the feature server
kubectl port-forward -n feast svc/feast-feature-server 6566:6566

# In another terminal
curl http://localhost:6566/health
```

## Materializing Features to Online Store

Create a job to materialize features from offline to online store:

```yaml
# materialize-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: feast-materialize
  namespace: feast
spec:
  # Run every hour
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: materialize
            image: your-registry/feast-server:v1
            command:
            - python
            - -c
            - |
              from datetime import datetime, timedelta
              from feast import FeatureStore

              # Initialize feature store
              store = FeatureStore(repo_path="/app")

              # Materialize features for the last hour
              end_date = datetime.now()
              start_date = end_date - timedelta(hours=1)

              print(f"Materializing features from {start_date} to {end_date}")

              # Materialize all feature views
              store.materialize(start_date, end_date)

              print("Materialization complete!")
            env:
            - name: FEAST_REGISTRY_PATH
              value: "postgresql://feast:your-secure-password@postgres.feast.svc.cluster.local:5432/feast"
            resources:
              requests:
                cpu: "1"
                memory: "2Gi"
              limits:
                cpu: "2"
                memory: "4Gi"
```

Deploy the materialization job:

```bash
kubectl apply -f materialize-job.yaml

# Trigger a manual run
kubectl create job -n feast feast-materialize-manual --from=cronjob/feast-materialize

# Check job logs
kubectl logs -n feast job/feast-materialize-manual
```

## Using Features in Training

Create a training script that uses Feast features:

```python
# train_with_feast.py
from feast import FeatureStore
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import pickle

# Initialize Feast
store = FeatureStore(repo_path="/app")

# Get historical features for training
entity_df = pd.DataFrame({
    "user_id": [1001, 1002, 1003, 1004],
    "item_id": [5001, 5002, 5003, 5004],
    "event_timestamp": pd.to_datetime([
        "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"
    ])
})

# Retrieve features from offline store
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_features:age",
        "user_features:total_purchases",
        "user_features:avg_purchase_value",
        "item_features:price",
        "item_features:popularity_score",
    ],
).to_df()

print(f"Retrieved {len(training_df)} training examples")
print(training_df.head())

# Train model (simplified example)
X = training_df[["age", "total_purchases", "avg_purchase_value", "price", "popularity_score"]]
y = training_df["purchased"]  # Assuming you have labels

model = RandomForestClassifier()
model.fit(X, y)

# Save model
with open("/models/recommendation_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model training complete!")
```

## Using Features for Inference

Create an inference service that retrieves features online:

```python
# inference_service.py
from feast import FeatureStore
from flask import Flask, request, jsonify
import pickle
import numpy as np

app = Flask(__name__)

# Initialize Feast
store = FeatureStore(repo_path="/app")

# Load model
with open("/models/recommendation_model.pkl", "rb") as f:
    model = pickle.load(f)

@app.route("/predict", methods=["POST"])
def predict():
    """
    Get features from Feast online store and make predictions
    """
    data = request.json

    user_id = data["user_id"]
    item_id = data["item_id"]

    # Get features from online store (low latency)
    feature_vector = store.get_online_features(
        features=[
            "user_features:age",
            "user_features:total_purchases",
            "user_features:avg_purchase_value",
            "item_features:price",
            "item_features:popularity_score",
        ],
        entity_rows=[
            {"user_id": user_id, "item_id": item_id}
        ],
    ).to_dict()

    # Extract feature values
    features = np.array([[
        feature_vector["age"][0],
        feature_vector["total_purchases"][0],
        feature_vector["avg_purchase_value"][0],
        feature_vector["price"][0],
        feature_vector["popularity_score"][0],
    ]])

    # Make prediction
    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0][1]

    return jsonify({
        "user_id": user_id,
        "item_id": item_id,
        "prediction": int(prediction),
        "probability": float(probability)
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Test the inference endpoint:

```bash
# Port forward to the service
kubectl port-forward -n feast svc/feast-feature-server 6566:6566

# Make a prediction request
curl -X POST http://localhost:6566/get-online-features \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      "user_features:age",
      "user_features:total_purchases",
      "item_features:price"
    ],
    "entities": {
      "user_id": [1001],
      "item_id": [5001]
    }
  }'
```

## Monitoring Feast

Add Prometheus metrics:

```yaml
# feast-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: feast-metrics
  namespace: feast
spec:
  selector:
    matchLabels:
      app: feast-server
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

Query key metrics:

```promql
# Feature serving latency
histogram_quantile(0.95, rate(feast_feature_serving_duration_seconds_bucket[5m]))

# Feature cache hit rate
rate(feast_cache_hits_total[5m]) / rate(feast_cache_requests_total[5m])

# Online store connection errors
rate(feast_online_store_errors_total[5m])
```

## Conclusion

Feast provides a production-ready feature store that solves the challenge of consistent feature management across training and serving. By deploying it on Kubernetes with Redis for online serving and PostgreSQL for the registry, you get a scalable platform for managing ML features. The separation of offline and online stores ensures you can retrieve historical data efficiently for training while maintaining low latency for real-time inference.

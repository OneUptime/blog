# How to Manage Feature Stores with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Feature Store, Machine Learning

Description: Learn how to deploy and manage feature stores like Feast on Kubernetes using ArgoCD, covering feature definitions, online and offline stores, and GitOps-driven feature management.

---

Feature stores have become a critical piece of the ML infrastructure puzzle. They provide a centralized place to define, store, and serve features for both model training and real-time inference. Managing a feature store with ArgoCD means your feature definitions, infrastructure, and serving configurations are all version-controlled and auditable.

This guide covers deploying Feast, the most popular open-source feature store, on Kubernetes using ArgoCD.

## Why GitOps for Feature Stores

Feature stores sit at the intersection of data engineering and ML. Without proper version control, you end up with:

- Feature definitions that drift between environments
- Inconsistencies between training and serving features (training-serving skew)
- No audit trail for who changed what feature and when
- Difficulty rolling back broken feature transformations

ArgoCD solves all of these by making your feature store configuration declarative and Git-managed.

## Architecture

A Feast deployment on Kubernetes includes:

```mermaid
graph TB
    A[ArgoCD] --> B[Feast Feature Server]
    A --> C[Redis - Online Store]
    A --> D[Feature Definitions]
    B --> C
    B --> E[BigQuery/S3 - Offline Store]
    F[Training Pipeline] --> E
    G[Serving Pipeline] --> B
```

## Repository Structure

Organize your feature store Git repository:

```text
feature-store/
  infrastructure/
    base/
      kustomization.yaml
      namespace.yaml
      redis/
        statefulset.yaml
        service.yaml
      feast-server/
        deployment.yaml
        service.yaml
        configmap.yaml
    overlays/
      production/
        kustomization.yaml
  feature-definitions/
    entities/
      user.py
      product.py
    feature-views/
      user_features.py
      product_features.py
    feature-services/
      recommendation_service.py
    feature_store.yaml
```

## Deploying Redis as the Online Store

Feast uses Redis as its online feature store for low-latency lookups:

```yaml
# infrastructure/base/redis/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: feast-redis
  labels:
    app: feast-redis
spec:
  serviceName: feast-redis
  replicas: 1
  selector:
    matchLabels:
      app: feast-redis
  template:
    metadata:
      labels:
        app: feast-redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - --maxmemory
            - 4gb
            - --maxmemory-policy
            - allkeys-lru
            - --save
            - "900"
            - "1"
            - --appendonly
            - "yes"
          resources:
            requests:
              cpu: "1"
              memory: "4Gi"
            limits:
              cpu: "2"
              memory: "6Gi"
          volumeMounts:
            - name: redis-data
              mountPath: /data
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi
```

```yaml
# infrastructure/base/redis/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: feast-redis
spec:
  selector:
    app: feast-redis
  ports:
    - port: 6379
      targetPort: 6379
  clusterIP: None
```

## Feature Store Configuration

Define your Feast configuration as a ConfigMap:

```yaml
# infrastructure/base/feast-server/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feast-config
data:
  feature_store.yaml: |
    project: ml_features
    provider: local
    registry:
      registry_type: sql
      path: postgresql://feast:password@feast-postgres:5432/feast_registry
      cache_ttl_seconds: 60
    online_store:
      type: redis
      connection_string: feast-redis:6379
    offline_store:
      type: bigquery
      project_id: my-gcp-project
      dataset: feast_offline
    entity_key_serialization_version: 2
```

## Deploying the Feast Feature Server

The feature server handles online serving requests:

```yaml
# infrastructure/base/feast-server/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feast-feature-server
  labels:
    app: feast-feature-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feast-feature-server
  template:
    metadata:
      labels:
        app: feast-feature-server
    spec:
      initContainers:
        # Clone feature definitions from Git
        - name: feature-loader
          image: myregistry/feast-loader:v1.0.0
          command:
            - /bin/sh
            - -c
            - |
              # Copy feature definitions
              cp -r /features/* /feast-repo/
              # Apply feature definitions to the registry
              cd /feast-repo
              feast apply
          volumeMounts:
            - name: feast-repo
              mountPath: /feast-repo
            - name: feast-config
              mountPath: /features/feature_store.yaml
              subPath: feature_store.yaml
      containers:
        - name: feast-server
          image: feastdev/feature-server:0.36.0
          args:
            - -c
            - /feast-repo
            - --host
            - "0.0.0.0"
            - --port
            - "6566"
          ports:
            - containerPort: 6566
              name: http
          readinessProbe:
            httpGet:
              path: /health
              port: 6566
            initialDelaySeconds: 20
            periodSeconds: 10
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          volumeMounts:
            - name: feast-repo
              mountPath: /feast-repo
            - name: feast-config
              mountPath: /feast-repo/feature_store.yaml
              subPath: feature_store.yaml
      volumes:
        - name: feast-repo
          emptyDir: {}
        - name: feast-config
          configMap:
            name: feast-config
```

## Feature Definitions in Git

The real power of this approach is that feature definitions live in Git alongside your infrastructure:

```python
# feature-definitions/entities/user.py
from feast import Entity, ValueType

user = Entity(
    name="user_id",
    value_type=ValueType.INT64,
    description="Unique user identifier",
)
```

```python
# feature-definitions/feature-views/user_features.py
from feast import FeatureView, Field
from feast.types import Float32, Int64
from datetime import timedelta

user_features = FeatureView(
    name="user_features",
    entities=["user_id"],
    ttl=timedelta(days=1),
    schema=[
        Field(name="total_purchases", dtype=Int64),
        Field(name="avg_session_duration", dtype=Float32),
        Field(name="days_since_last_visit", dtype=Int64),
        Field(name="conversion_rate", dtype=Float32),
    ],
    online=True,
    source=user_purchase_source,
    tags={"team": "recommendations", "version": "2.1"},
)
```

```python
# feature-definitions/feature-services/recommendation_service.py
from feast import FeatureService

recommendation_service = FeatureService(
    name="recommendation_features",
    features=[
        user_features,
        product_features,
    ],
    tags={"model": "recommendation-v3"},
)
```

## Automating Feature Materialization

Set up a CronJob to materialize features from the offline store to the online store:

```yaml
# infrastructure/base/feast-server/materialization-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: feast-materialization
spec:
  schedule: "0 */2 * * *"  # Every 2 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: materialize
              image: myregistry/feast-loader:v1.0.0
              command:
                - /bin/sh
                - -c
                - |
                  cd /feast-repo
                  feast materialize-incremental $(date -u +%Y-%m-%dT%H:%M:%S)
              resources:
                requests:
                  cpu: "2"
                  memory: "4Gi"
              volumeMounts:
                - name: feast-config
                  mountPath: /feast-repo/feature_store.yaml
                  subPath: feature_store.yaml
          volumes:
            - name: feast-config
              configMap:
                name: feast-config
```

## The ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: feature-store
  namespace: argocd
  labels:
    team: ml-platform
    component: feature-store
spec:
  project: ml-infrastructure
  source:
    repoURL: https://github.com/myorg/feature-store.git
    targetRevision: main
    path: infrastructure/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: feast
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

## Feature Definition CI/CD Pipeline

When someone changes a feature definition, you want to validate it before it reaches production. Set up a pre-sync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: feast-validate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: validate
          image: myregistry/feast-loader:v1.0.0
          command:
            - /bin/sh
            - -c
            - |
              cd /feast-repo
              # Validate feature definitions
              feast plan
              if [ $? -ne 0 ]; then
                echo "Feature validation failed"
                exit 1
              fi
```

The `feast plan` command shows what changes will be applied without actually applying them, similar to `terraform plan`. If validation fails, the sync is aborted.

## Best Practices

1. **Version your feature definitions** - Use tags in your FeatureView definitions to track which version of a feature is deployed.

2. **Separate infrastructure from definitions** - Keep your Feast infrastructure (Redis, server deployments) separate from feature definitions. They have different change frequencies.

3. **Monitor online store latency** - Add ServiceMonitor resources for the feature server and Redis to track p99 latency.

4. **Set appropriate TTLs** - Feature TTLs determine how stale a feature can be before it is considered invalid. Set these based on your use case.

5. **Test feature serving in CI** - Before merging feature definition changes, run integration tests that verify the features can be served correctly.

Managing your feature store with ArgoCD ensures that every feature definition change is reviewed, tracked, and easily reversible. This is especially valuable in regulated industries where you need to demonstrate what features were used by which model at any point in time.

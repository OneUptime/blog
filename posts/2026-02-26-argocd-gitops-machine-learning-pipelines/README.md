# How to Implement GitOps for Machine Learning Pipelines with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Machine Learning, MLOps

Description: Learn how to manage machine learning infrastructure and model deployments with ArgoCD, covering training pipelines, model serving, feature stores, and ML-specific deployment patterns.

---

Machine learning pipelines present unique challenges for GitOps. Models are large binary artifacts. Training jobs need GPUs. Inference services have different scaling patterns than traditional APIs. Feature stores, experiment tracking, and model registries all need to be deployed and managed.

ArgoCD can manage all of this. This guide shows you how to apply GitOps principles to your ML infrastructure using ArgoCD.

## The ML Platform Stack on Kubernetes

A typical ML platform running on Kubernetes includes:

```mermaid
graph TB
    subgraph ML Platform
        A[Model Training - Kubeflow/Argo Workflows] --> B[Model Registry - MLflow/Seldon]
        B --> C[Model Serving - KServe/Seldon Core]
        D[Feature Store - Feast] --> A
        E[Experiment Tracking - MLflow] --> A
        F[Data Pipeline - Spark/Airflow] --> D
    end
    G[ArgoCD] --> A
    G --> B
    G --> C
    G --> D
    G --> E
    G --> F
```

ArgoCD manages the infrastructure components (Kubeflow, MLflow, KServe, Feast) and the model deployments themselves.

## Repository Structure for ML GitOps

Separate infrastructure from model deployments:

```
ml-platform-config/
  infrastructure/
    kubeflow/
      kustomization.yaml
    mlflow/
      deployment.yaml
      service.yaml
      kustomization.yaml
    kserve/
      kustomization.yaml
    feast/
      kustomization.yaml
    monitoring/
      kustomization.yaml
  models/
    fraud-detection/
      base/
        inferenceservice.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
    recommendation/
      base/
        inferenceservice.yaml
        kustomization.yaml
      overlays/
        staging/
        production/
  training/
    fraud-detection/
      training-pipeline.yaml
    recommendation/
      training-pipeline.yaml
```

## Deploying ML Infrastructure with ArgoCD

### MLflow Tracking Server

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mlflow
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"  # Deploy infrastructure first
spec:
  project: ml-platform
  source:
    repoURL: https://github.com/your-org/ml-platform-config.git
    targetRevision: main
    path: infrastructure/mlflow
  destination:
    server: https://kubernetes.default.svc
    namespace: mlflow
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

The MLflow deployment itself:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mlflow
  template:
    metadata:
      labels:
        app: mlflow
    spec:
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:2.10.0
          command:
            - mlflow
            - server
            - --host=0.0.0.0
            - --port=5000
            - --backend-store-uri=postgresql://mlflow:$(DB_PASSWORD)@postgres:5432/mlflow
            - --default-artifact-root=s3://mlflow-artifacts/
          ports:
            - containerPort: 5000
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mlflow-db-secrets
                  key: password
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-secrets
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-secrets
                  key: secret-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
```

## Model Serving with KServe

KServe (formerly KFServing) is the standard for model serving on Kubernetes. ArgoCD can manage InferenceService resources:

```yaml
# models/fraud-detection/base/inferenceservice.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detection
  labels:
    model: fraud-detection
    team: ml-risk
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "s3://models/fraud-detection/v1.2.0"
      resources:
        requests:
          memory: "2Gi"
          cpu: "1"
        limits:
          memory: "4Gi"
          cpu: "2"
    minReplicas: 2
    maxReplicas: 10
    scaleTarget: 10         # Target 10 concurrent requests per pod
    scaleMetric: concurrency
```

Production overlay with higher resources and canary:

```yaml
# models/fraud-detection/overlays/production/kustomization.yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: ml-serving
patches:
  - target:
      kind: InferenceService
      name: fraud-detection
    patch: |
      - op: replace
        path: /spec/predictor/minReplicas
        value: 5
      - op: add
        path: /spec/predictor/canaryTrafficPercent
        value: 10
```

## Managing Model Versions

The key challenge in ML GitOps is managing model artifacts. Models are large binary files that should not go into Git. Instead, reference them by URI:

```yaml
# When a new model version is promoted, update the storageUri in Git
spec:
  predictor:
    model:
      storageUri: "s3://models/fraud-detection/v1.3.0"  # Updated from v1.2.0
```

The workflow:

1. Data scientists train a model and register it in MLflow
2. The model is evaluated and approved for staging
3. A PR updates the `storageUri` in the staging overlay
4. ArgoCD deploys the new model to staging
5. After validation, another PR updates the production overlay
6. ArgoCD deploys to production

Automate this with a CI job:

```yaml
# .github/workflows/promote-model.yaml
name: Promote Model
on:
  workflow_dispatch:
    inputs:
      model_name:
        description: "Model name"
        required: true
      model_version:
        description: "Model version"
        required: true
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update model version
        run: |
          MODEL=${{ inputs.model_name }}
          VERSION=${{ inputs.model_version }}
          ENV=${{ inputs.environment }}

          # Update the storageUri in the overlay
          cd models/${MODEL}/overlays/${ENV}
          sed -i "s|storageUri:.*|storageUri: \"s3://models/${MODEL}/${VERSION}\"|" \
            kustomization.yaml

          git add .
          git commit -m "Promote ${MODEL} ${VERSION} to ${ENV}"
          git push
```

## Training Pipelines

Use Argo Workflows (not ArgoCD) for training pipelines, but manage the workflow definitions with ArgoCD:

```yaml
# training/fraud-detection/training-pipeline.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: fraud-detection-training
spec:
  schedule: "0 2 * * 0"  # Weekly retraining
  timezone: "UTC"
  workflowSpec:
    entrypoint: train-pipeline
    templates:
      - name: train-pipeline
        steps:
          - - name: fetch-data
              template: fetch-data
          - - name: preprocess
              template: preprocess
          - - name: train
              template: train
          - - name: evaluate
              template: evaluate
          - - name: register
              template: register-model

      - name: fetch-data
        container:
          image: my-registry/ml-pipeline:latest
          command: [python, fetch_data.py]
          resources:
            requests:
              memory: "4Gi"
              cpu: "2"

      - name: train
        container:
          image: my-registry/ml-pipeline:latest
          command: [python, train.py]
          resources:
            requests:
              memory: "16Gi"
              cpu: "4"
              nvidia.com/gpu: "1"    # GPU for training
            limits:
              nvidia.com/gpu: "1"

      - name: evaluate
        container:
          image: my-registry/ml-pipeline:latest
          command: [python, evaluate.py]

      - name: register-model
        container:
          image: my-registry/ml-pipeline:latest
          command: [python, register_model.py]
          env:
            - name: MLFLOW_TRACKING_URI
              value: "http://mlflow-server.mlflow:5000"
```

ArgoCD manages this CronWorkflow definition. When data scientists update the training code or schedule, they commit to Git and ArgoCD applies the change.

## Feature Store Management

Deploy and manage Feast with ArgoCD:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feast-feature-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feast-server
  template:
    spec:
      containers:
        - name: feast
          image: feastdev/feature-server:0.36.0
          command:
            - feast
            - serve
            - --host=0.0.0.0
            - --port=6566
          volumeMounts:
            - name: feature-repo
              mountPath: /feature_repo
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
      volumes:
        - name: feature-repo
          configMap:
            name: feast-feature-definitions
```

Feature definitions as a ConfigMap managed through Git:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feast-feature-definitions
data:
  feature_store.yaml: |
    project: fraud_detection
    registry: s3://feast-registry/registry.db
    provider: aws
    online_store:
      type: redis
      connection_string: redis-master.redis:6379
```

## GPU Node Management

ML workloads often need GPU nodes. Use ArgoCD to manage node-level configs:

```yaml
# GPU node taints and tolerations managed via Git
apiVersion: v1
kind: ConfigMap
metadata:
  name: gpu-scheduling-config
data:
  gpu-toleration.yaml: |
    tolerations:
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"
    nodeSelector:
      accelerator: nvidia-tesla-v100
```

## Monitoring ML Deployments

ML models have unique monitoring needs - data drift, prediction quality, and latency:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ml-model-alerts
spec:
  groups:
    - name: ml-model-health
      rules:
        - alert: ModelLatencyHigh
          expr: |
            histogram_quantile(0.99,
              rate(inference_request_duration_seconds_bucket{model="fraud-detection"}[5m])
            ) > 0.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Model {{ $labels.model }} p99 latency above 500ms"

        - alert: ModelErrorRateHigh
          expr: |
            rate(inference_request_errors_total{model="fraud-detection"}[5m])
            / rate(inference_request_total{model="fraud-detection"}[5m]) > 0.05
          for: 5m
          labels:
            severity: critical
```

## Conclusion

GitOps for ML is about managing the infrastructure and deployment lifecycle through Git while keeping large artifacts (models, datasets) in object storage. ArgoCD handles the Kubernetes resources - deployments, InferenceServices, CronWorkflows, feature stores - while model registries handle the artifacts. The separation is clean: Git for config, S3 for blobs, ArgoCD for reconciliation.

For monitoring your ML model serving infrastructure, [OneUptime](https://oneuptime.com) provides the observability layer to track latency, errors, and availability alongside your ArgoCD deployments.

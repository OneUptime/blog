# How to Handle ML Model Versioning with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Machine Learning, Model Versioning

Description: A practical guide to handling ML model versioning with ArgoCD, covering model artifact management, serving version control, and rollback strategies for production models.

---

Machine learning model versioning is one of those things that sounds simple but quickly becomes a nightmare at scale. You have model weights, preprocessing configs, feature schemas, and serving code - all of which need to stay in sync. ArgoCD can bring sanity to this process by making your model deployments declarative and version-controlled.

In this guide, we will cover how to structure your model versioning workflow with ArgoCD, from artifact tracking to production rollbacks.

## The Model Versioning Problem

In a typical ML pipeline, you have multiple moving parts:

- Model weights stored in object storage (S3, GCS, MinIO)
- Feature preprocessing configurations
- Model serving code and container images
- Inference API definitions
- Scaling configurations specific to each model version

When you deploy a new model version, all of these need to change together atomically. If your serving code expects a different input shape than what your preprocessor outputs, you have a broken deployment.

## Structuring Model Versions in Git

The key insight is that your Git repository should describe the desired state of your model serving infrastructure, not the model artifacts themselves. Model weights are too large for Git. Instead, reference them by version:

```text
model-serving/
  base/
    kustomization.yaml
    serving-deployment.yaml
    serving-service.yaml
  models/
    recommendation-model/
      kustomization.yaml
      model-config.yaml    # Points to model artifact version
      serving-config.yaml  # Model-specific serving params
    fraud-detection/
      kustomization.yaml
      model-config.yaml
      serving-config.yaml
```

## Model Configuration as Code

Create a ConfigMap that tracks the current model version and its artifact location:

```yaml
# models/recommendation-model/model-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: recommendation-model-config
  labels:
    app: model-serving
    model: recommendation
data:
  MODEL_NAME: "recommendation-v3"
  MODEL_VERSION: "3.2.1"
  MODEL_ARTIFACT_URI: "s3://ml-models/recommendation/v3.2.1/model.tar.gz"
  MODEL_CHECKSUM: "sha256:a1b2c3d4e5f6..."
  FEATURE_SCHEMA_VERSION: "2.1.0"
  PREPROCESSING_VERSION: "1.4.0"
  MIN_BATCH_SIZE: "8"
  MAX_BATCH_SIZE: "64"
  BATCH_TIMEOUT_MS: "100"
```

When you want to deploy a new model version, you update this ConfigMap in Git. ArgoCD detects the change and rolls out the new configuration.

## Model Serving Deployment

Here is a model serving deployment that uses the version config:

```yaml
# base/serving-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-serving
  labels:
    app: model-serving
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: model-serving
  template:
    metadata:
      labels:
        app: model-serving
    spec:
      initContainers:
        # Download model artifacts before the serving container starts
        - name: model-downloader
          image: myregistry/model-downloader:v1.0.0
          envFrom:
            - configMapRef:
                name: recommendation-model-config
          command:
            - /bin/sh
            - -c
            - |
              # Download and verify model artifacts
              aws s3 cp $MODEL_ARTIFACT_URI /models/model.tar.gz
              echo "$MODEL_CHECKSUM /models/model.tar.gz" | sha256sum -c -
              tar xzf /models/model.tar.gz -C /models/
          volumeMounts:
            - name: model-storage
              mountPath: /models
      containers:
        - name: serving
          image: myregistry/model-server:v2.1.0
          envFrom:
            - configMapRef:
                name: recommendation-model-config
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 8081
              name: grpc
          readinessProbe:
            httpGet:
              path: /v2/health/ready
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /v2/health/live
              port: 8080
            periodSeconds: 15
          resources:
            requests:
              cpu: "4"
              memory: "8Gi"
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: "16Gi"
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: model-storage
              mountPath: /models
              readOnly: true
      volumes:
        - name: model-storage
          emptyDir:
            sizeLimit: 10Gi
```

The init container pattern is important. It downloads and verifies the model artifact before the serving container starts. If the download fails or the checksum does not match, the pod stays in Init state and ArgoCD reports a degraded status.

## ArgoCD Application with Model Version Tracking

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: recommendation-model
  namespace: argocd
  annotations:
    # Track model version in ArgoCD metadata
    model.ml/version: "3.2.1"
    model.ml/trained-at: "2024-01-15T10:30:00Z"
    model.ml/accuracy: "0.94"
  labels:
    team: ml-platform
    model: recommendation
spec:
  project: ml-models
  source:
    repoURL: https://github.com/myorg/model-serving.git
    targetRevision: main
    path: models/recommendation-model
  destination:
    server: https://kubernetes.default.svc
    namespace: model-serving
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Adding model metrics as annotations gives you visibility into which model version is deployed and how well it performs. You can query this through the ArgoCD API.

## Implementing Model Rollbacks

One of the biggest advantages of GitOps for ML is rollback. If a new model version causes degraded performance, you simply revert the Git commit:

```bash
# Find the commit that changed the model version
git log --oneline -- models/recommendation-model/model-config.yaml

# Revert to the previous version
git revert abc123

# Push - ArgoCD will automatically roll back the model
git push origin main
```

For faster rollbacks, you can use ArgoCD's sync to a specific revision:

```bash
argocd app sync recommendation-model --revision HEAD~1
```

## Canary Model Deployments

For safer model rollouts, deploy the new version alongside the old one:

```yaml
# models/recommendation-model/canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-model-canary
  labels:
    app: model-serving
    track: canary
    model-version: "3.3.0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: model-serving
      track: canary
  template:
    metadata:
      labels:
        app: model-serving
        track: canary
    spec:
      containers:
        - name: serving
          image: myregistry/model-server:v2.1.0
          env:
            - name: MODEL_ARTIFACT_URI
              value: "s3://ml-models/recommendation/v3.3.0/model.tar.gz"
            - name: MODEL_VERSION
              value: "3.3.0"
          # ... rest of container spec
```

Then use a traffic splitting tool like Istio or Argo Rollouts to gradually shift traffic:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: recommendation-model-rollout
spec:
  strategy:
    canary:
      canaryService: model-serving-canary
      stableService: model-serving-stable
      analysis:
        templates:
          - templateName: model-performance-check
        args:
          - name: model-version
            value: "3.3.0"
      steps:
        - setWeight: 5
        - pause: { duration: 1h }
        - setWeight: 20
        - pause: { duration: 2h }
        - setWeight: 50
        - pause: { duration: 4h }
```

## Model Version Governance with AppProjects

Use ArgoCD Projects to enforce which model versions can be deployed to production:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: ml-models-prod
  namespace: argocd
spec:
  description: Production ML models
  sourceRepos:
    - 'https://github.com/myorg/model-serving.git'
  destinations:
    - namespace: model-serving
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  namespaceResourceWhitelist:
    - group: 'apps'
      kind: Deployment
    - group: ''
      kind: ConfigMap
    - group: ''
      kind: Service
```

## Automating Model Version Updates

When your training pipeline produces a new model, automate the Git update:

```bash
#!/bin/bash
# Called by the training pipeline after model validation passes
MODEL_VERSION=$1
MODEL_URI=$2
MODEL_CHECKSUM=$3

# Clone the deployment repo
git clone https://github.com/myorg/model-serving.git
cd model-serving

# Update the model config
yq eval ".data.MODEL_VERSION = \"$MODEL_VERSION\"" -i models/recommendation-model/model-config.yaml
yq eval ".data.MODEL_ARTIFACT_URI = \"$MODEL_URI\"" -i models/recommendation-model/model-config.yaml
yq eval ".data.MODEL_CHECKSUM = \"$MODEL_CHECKSUM\"" -i models/recommendation-model/model-config.yaml

# Commit and push
git add .
git commit -m "Update recommendation model to $MODEL_VERSION"
git push origin main
```

This script bridges your training pipeline with your GitOps deployment pipeline. ArgoCD picks up the change and rolls out the new model version.

## Summary

Model versioning with ArgoCD follows the same principles as any GitOps workflow - your Git repository is the source of truth for what should be deployed. The key differences for ML are:

- Model artifacts live in object storage, not Git. Reference them by version and checksum.
- Use init containers to download and verify models before serving.
- Track model metadata in ArgoCD annotations for observability.
- Implement canary deployments with automated performance validation.
- Automate the Git update step in your training pipeline.

This approach gives you full auditability of which model version was deployed when, who approved it, and the ability to roll back instantly if something goes wrong.

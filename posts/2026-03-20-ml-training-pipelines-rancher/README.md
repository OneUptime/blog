# How to Configure ML Training Pipelines on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, ML, Training-pipelines, Argo, Kubernetes

Description: Guide to building automated ML training pipelines on Rancher using Argo Workflows and Kubeflow Pipelines.

## Introduction

ML training pipelines automate the process of data preparation, model training, evaluation, and registration. On Rancher, you can use Argo Workflows or Kubeflow Pipelines to orchestrate these workflows at scale.

## Step 1: Install Argo Workflows

```bash
# Create namespace

kubectl create namespace argo

# Install Argo Workflows
kubectl apply -n argo \
  -f https://github.com/argoproj/argo-workflows/releases/download/v3.5.0/install.yaml

# Patch service to LoadBalancer or configure ingress
kubectl patch svc argo-server -n argo \
  -p '{"spec": {"type": "ClusterIP"}}'

# Verify
kubectl get pods -n argo
```

## Step 2: Configure Argo WorkflowDefaults

```yaml
# argo-workflow-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  workflowDefaults: |
    spec:
      ttlStrategy:
        secondsAfterCompletion: 86400    # Clean up after 24h
        secondsAfterSuccess: 86400
        secondsAfterFailure: 604800      # Keep failed for 7 days
      podGC:
        strategy: OnWorkflowCompletion
  executor: |
    resources:
      requests:
        cpu: 100m
        memory: 64Mi
```

## Step 3: Create ML Training Pipeline

```yaml
# ml-training-pipeline.yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: ml-training-
  namespace: argo
spec:
  entrypoint: ml-pipeline
  
  arguments:
    parameters:
    - name: dataset-version
      value: "v2.5"
    - name: model-type
      value: "gradient-boosting"
  
  volumeClaimTemplates:
  - metadata:
      name: workdir
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
      storageClassName: longhorn
  
  templates:
  - name: ml-pipeline
    dag:
      tasks:
      - name: download-data
        template: download-data
        arguments:
          parameters:
          - name: version
            value: "{{workflow.parameters.dataset-version}}"
      
      - name: preprocess
        template: preprocess-data
        dependencies: [download-data]
      
      - name: train-model
        template: train-model
        dependencies: [preprocess]
        arguments:
          parameters:
          - name: model-type
            value: "{{workflow.parameters.model-type}}"
      
      - name: evaluate
        template: evaluate-model
        dependencies: [train-model]
      
      - name: register
        template: register-model
        dependencies: [evaluate]
        when: "{{tasks.evaluate.outputs.parameters.accuracy}} > 0.85"
  
  - name: download-data
    inputs:
      parameters:
      - name: version
    container:
      image: registry.example.com/ml/data-downloader:latest
      command: [python, download.py]
      args: ["--version", "{{inputs.parameters.version}}",
             "--output", "/workdir/raw-data"]
      volumeMounts:
      - name: workdir
        mountPath: /workdir
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"
  
  - name: preprocess-data
    container:
      image: registry.example.com/ml/preprocessor:latest
      command: [python, preprocess.py]
      args: ["--input", "/workdir/raw-data",
             "--output", "/workdir/processed-data"]
      volumeMounts:
      - name: workdir
        mountPath: /workdir
  
  - name: train-model
    inputs:
      parameters:
      - name: model-type
    container:
      image: registry.example.com/ml/trainer:latest
      command: [python, train.py]
      args: ["--data", "/workdir/processed-data",
             "--model-type", "{{inputs.parameters.model-type}}",
             "--output", "/workdir/model"]
      volumeMounts:
      - name: workdir
        mountPath: /workdir
      resources:
        limits:
          nvidia.com/gpu: "1"
          memory: "32Gi"
          cpu: "8"
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
  
  - name: evaluate-model
    outputs:
      parameters:
      - name: accuracy
        valueFrom:
          path: /workdir/metrics/accuracy.txt
    container:
      image: registry.example.com/ml/evaluator:latest
      command: [python, evaluate.py]
      args: ["--model", "/workdir/model",
             "--test-data", "/workdir/processed-data/test",
             "--output", "/workdir/metrics"]
      volumeMounts:
      - name: workdir
        mountPath: /workdir
  
  - name: register-model
    container:
      image: registry.example.com/ml/model-registry:latest
      command: [python, register.py]
      args: ["--model-path", "/workdir/model",
             "--registry-uri", "http://mlflow-server.mlops.svc.cluster.local:5000",
             "--model-name", "production-model"]
      volumeMounts:
      - name: workdir
        mountPath: /workdir
```

## Step 4: Schedule Recurring Training

```yaml
# recurring-training.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: weekly-model-retrain
  namespace: argo
spec:
  schedule: "0 2 * * 0"        # Sunday at 2 AM
  timezone: "UTC"
  concurrencyPolicy: Forbid     # Don't allow concurrent runs
  workflowSpec:
    entrypoint: ml-pipeline
    templates:
    - name: ml-pipeline
      # ... same as above
```

## Step 5: Trigger on New Data

```yaml
# argo-event-trigger.yaml - Trigger pipeline when new data arrives in S3-compatible storage
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: s3-dataset-source
  namespace: argo
spec:
  minio:
    dataset-upload:
      bucket:
        name: ml-datasets
      endpoint: minio-service.minio:9000
      events:
      - s3:ObjectCreated:*
      filter:
        prefix: "datasets/"
        suffix: ".csv"
      accessKey:
        name: s3-credentials
        key: accesskey
      secretKey:
        name: s3-credentials
        key: secretkey
```

## Monitoring Pipelines

```bash
# List running workflows
argo list -n argo

# Get workflow logs
argo logs ml-training-xxxxx -n argo

# View workflow in UI
kubectl port-forward svc/argo-server -n argo 2746:2746
# Open https://localhost:2746
```

## Conclusion

ML training pipelines on Rancher with Argo Workflows provide reproducible, automated model training that scales with your data. DAG-based workflows ensure proper task ordering, GPU nodes handle compute-intensive training, and conditional execution ensures only high-quality models get registered.

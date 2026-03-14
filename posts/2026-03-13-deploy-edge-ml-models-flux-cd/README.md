# How to Deploy Edge ML Models with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Machine Learning, Edge AI, GitOps, ONNX

Description: Deploy machine learning models to edge devices using Flux CD, with versioned model artifacts, automated rollout, and rollback capabilities.

---

## Introduction

Machine learning inference at the edge is one of the fastest-growing areas in industrial and consumer technology - computer vision for quality control, predictive maintenance from sensor data, and natural language processing in kiosk applications all benefit from inference running locally rather than round-tripping to the cloud. Managing ML model versions at scale is, however, genuinely hard.

Models need to be versioned, tested, deployed to specific hardware configurations, monitored for accuracy drift, and rolled back when performance degrades. Flux CD provides exactly the GitOps infrastructure needed to manage this lifecycle. By packaging models as OCI artifacts alongside their inference server configuration, you can treat model deployments with the same rigor as application code deployments.

This guide covers packaging ML models as OCI artifacts, deploying them to edge clusters with Flux, and managing the model update lifecycle.

## Prerequisites

- Edge Kubernetes cluster (K3s or MicroK8s)
- Flux CD with OCIRepository support
- ML model in ONNX, TensorFlow Lite, or OpenVINO format
- Container registry for model artifacts
- GPU or NPU hardware (optional but recommended)

## Step 1: Package ML Models as OCI Artifacts

Store model files as OCI artifacts alongside their deployment manifests.

```bash
# Package the model and manifests together as an OCI artifact
MODEL_VERSION="v2.3.0"
MODEL_NAME="defect-detector"

# Build model artifact directory
mkdir -p /tmp/model-artifact/models
cp models/${MODEL_NAME}.onnx /tmp/model-artifact/models/
cp models/${MODEL_NAME}-config.json /tmp/model-artifact/models/

# Push model + deployment manifests as OCI artifact
flux push artifact \
  oci://my-registry.example.com/ml-models/${MODEL_NAME}:${MODEL_VERSION} \
  --path=/tmp/model-artifact \
  --source=https://github.com/my-org/ml-models \
  --revision="${MODEL_VERSION}" \
  --annotations="model.accuracy=0.94,model.framework=onnx,model.size-mb=45"

# Verify the artifact
flux pull artifact \
  oci://my-registry.example.com/ml-models/${MODEL_NAME}:${MODEL_VERSION} \
  --output=/tmp/verify-artifact
```

## Step 2: Configure the Inference Server Deployment

Use ONNX Runtime or Triton Inference Server to serve the model on edge hardware.

```yaml
# apps/base/ml-inference/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: defect-detector-inference
  namespace: ml-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: defect-detector
  template:
    metadata:
      labels:
        app: defect-detector
        model-version: "${MODEL_VERSION}"
    spec:
      nodeSelector:
        node-role.kubernetes.io/edge: ""
        # Target nodes with GPU or NPU if available
        accelerator: gpu
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      initContainers:
        # Download model from OCI artifact
        - name: model-downloader
          image: my-registry.example.com/model-downloader:latest
          command:
            - /bin/sh
            - -c
            - |
              flux pull artifact \
                oci://my-registry.example.com/ml-models/defect-detector:${MODEL_VERSION} \
                --output=/models
          volumeMounts:
            - name: model-storage
              mountPath: /models
      containers:
        - name: inference-server
          image: mcr.microsoft.com/onnxruntime/server:latest
          args:
            - --model_path=/models/defect-detector.onnx
            - --address=0.0.0.0:8001
          ports:
            - containerPort: 8001
              name: grpc
            - containerPort: 8002
              name: http
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          volumeMounts:
            - name: model-storage
              mountPath: /models
          readinessProbe:
            httpGet:
              path: /v2/health/ready
              port: 8002
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: model-storage
          emptyDir: {}
```

## Step 3: Manage Model Versions with Flux OCIRepository

```yaml
# Track the ML model OCI artifact with Flux
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: defect-detector-model
  namespace: flux-system
spec:
  interval: 30m
  url: oci://my-registry.example.com/ml-models/defect-detector
  ref:
    semver: ">=2.0.0 <3.0.0"  # Auto-update within v2.x range
  secretRef:
    name: registry-credentials
```

```yaml
# Kustomization that deploys the model inference workload
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ml-inference
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/edge-ml
  prune: true
  sourceRef:
    kind: OCIRepository
    name: defect-detector-model
  postBuild:
    substitute:
      MODEL_VERSION: "${MODEL_VERSION}"
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: defect-detector-inference
      namespace: ml-inference
```

## Step 4: Implement Blue-Green Model Deployment

Roll out new model versions without disrupting inference.

```yaml
# Blue-green model deployment
# apps/overlays/edge-ml/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/ml-inference
  - model-blue.yaml      # Current stable model (v2.2.0)
  - model-green.yaml     # New candidate model (v2.3.0)
```

```yaml
# model-blue.yaml - Current production model
apiVersion: apps/v1
kind: Deployment
metadata:
  name: defect-detector-blue
  namespace: ml-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: defect-detector
      slot: blue
  template:
    metadata:
      labels:
        app: defect-detector
        slot: blue
    spec:
      containers:
        - name: inference-server
          image: mcr.microsoft.com/onnxruntime/server:latest
          # Blue slot runs v2.2.0
          env:
            - name: MODEL_VERSION
              value: "v2.2.0"
```

```yaml
# Service routing to active slot
apiVersion: v1
kind: Service
metadata:
  name: defect-detector
  namespace: ml-inference
spec:
  selector:
    app: defect-detector
    slot: blue  # Switch to "green" after validation
  ports:
    - port: 8001
      targetPort: 8001
```

## Step 5: Automate Model Accuracy Validation

```yaml
# Run model validation job after each deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: model-validation-v2-3-0
  namespace: ml-inference
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: validator
          image: my-registry.example.com/model-validator:latest
          args:
            - --model-endpoint=http://defect-detector-green:8002
            - --test-dataset=/validation-data/test-set.json
            - --accuracy-threshold=0.92
            - --latency-threshold-ms=50
          volumeMounts:
            - name: validation-data
              mountPath: /validation-data
      volumes:
        - name: validation-data
          configMap:
            name: model-validation-dataset
```

## Best Practices

- Version models with semantic versioning and store version metadata in OCI artifact annotations.
- Use blue-green deployment for model updates - inference continuity is critical for edge applications.
- Test new model versions against a held-out validation dataset before routing production traffic.
- Monitor inference latency and accuracy metrics post-deployment to catch model drift.
- Use Flux's `semver` constraint on OCIRepository to auto-update within a safe version range.
- Store model configuration (pre/post processing parameters) alongside deployment manifests in Git.

## Conclusion

Flux CD brings GitOps discipline to ML model deployment at the edge. By packaging models as OCI artifacts, managing inference server configurations through Kustomize overlays, and using Flux's reconciliation loop for deployment, you gain version control, automated rollout, and reliable rollback for your edge ML workloads. The same workflow that deploys your application code can now deploy and update your ML models with equal rigor.

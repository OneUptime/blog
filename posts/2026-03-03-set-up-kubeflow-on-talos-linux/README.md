# How to Set Up Kubeflow on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubeflow, Machine Learning, MLOps, Kubernetes, GPU

Description: Deploy Kubeflow on Talos Linux to build a complete MLOps platform for training, serving, and managing machine learning workflows on Kubernetes.

---

Kubeflow is the open-source machine learning platform built for Kubernetes. It provides tools for every stage of the ML lifecycle, from data preparation and model training to serving and monitoring. Running Kubeflow on Talos Linux combines the comprehensive ML capabilities of Kubeflow with the security and immutability of Talos. This pairing works especially well because Kubeflow is entirely Kubernetes-native, and Talos is designed from the ground up to be the ideal Kubernetes host OS.

This guide walks through installing Kubeflow on a Talos Linux cluster, configuring its components, and running your first ML pipeline.

## Prerequisites

Kubeflow is a substantial platform with many components. You will need:

- A Talos Linux cluster with at least 3 worker nodes (8 CPU, 32GB RAM each recommended)
- GPU nodes if you plan to train models (NVIDIA device plugin installed)
- kubectl configured for your cluster
- kustomize installed (v5.0 or later)
- A default StorageClass configured
- An ingress controller with TLS support

## Storage Configuration

Kubeflow requires a default StorageClass. Verify one exists:

```bash
# Check for a default StorageClass
kubectl get storageclass
```

If no default is set, mark one:

```bash
# Set local-path as the default StorageClass
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

For production, consider using a distributed storage solution like Longhorn or Rook-Ceph, since Kubeflow components need ReadWriteMany access in some cases.

## Installing Kubeflow

Clone the Kubeflow manifests repository:

```bash
# Clone the Kubeflow manifests
git clone https://github.com/kubeflow/manifests.git
cd manifests
git checkout v1.8-branch
```

Kubeflow uses Kustomize for deployment. Install everything with a single command:

```bash
# Install all Kubeflow components
# This may take 10-15 minutes
while ! kustomize build example | kubectl apply -f -; do
  echo "Retrying..."
  sleep 10
done
```

The retry loop is necessary because some resources depend on CRDs that are created by other components, so the first few attempts may have ordering issues.

## Verifying the Installation

Check that all pods are running:

```bash
# Check pods across all Kubeflow namespaces
kubectl get pods -n kubeflow
kubectl get pods -n cert-manager
kubectl get pods -n istio-system
kubectl get pods -n auth
kubectl get pods -n knative-eventing
kubectl get pods -n knative-serving
```

It can take 10-20 minutes for all pods to reach the Running state. Monitor progress:

```bash
# Watch for pods that are not yet ready
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Accessing the Kubeflow Dashboard

Kubeflow uses Istio for its ingress. Port-forward to access the dashboard:

```bash
# Port-forward to the Istio ingress gateway
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80
```

Navigate to http://localhost:8080 in your browser. The default credentials are:

- Email: user@example.com
- Password: 12341234

For production, configure proper authentication by updating the Dex configuration:

```yaml
# dex-config-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex
  namespace: auth
data:
  config.yaml: |
    issuer: http://dex.auth.svc.cluster.local:5556/dex
    storage:
      type: kubernetes
      config:
        inCluster: true
    web:
      http: 0.0.0.0:5556
    staticClients:
      - idEnv: OIDC_CLIENT_ID
        redirectURIs:
          - /authservice/oidc/callback
        name: 'Dex Login Application'
        secretEnv: OIDC_CLIENT_SECRET
    staticPasswords:
      - email: admin@yourcompany.com
        hash: "$2y$12$your-bcrypt-hash"
        username: admin
```

## Creating a Kubeflow Notebook Server

Kubeflow Notebooks let you run Jupyter environments directly in the cluster. Create one through the dashboard:

1. Navigate to Notebooks in the left sidebar
2. Click "New Notebook"
3. Select a GPU-enabled image like `kubeflownotebookswg/jupyter-pytorch-cuda-full`
4. Set resource limits (CPU, memory, GPU)
5. Click "Launch"

Or create it via kubectl:

```yaml
# kubeflow-notebook.yaml
apiVersion: kubeflow.org/v1
kind: Notebook
metadata:
  name: ml-workspace
  namespace: kubeflow-user-example-com
  labels:
    app: ml-workspace
spec:
  template:
    spec:
      containers:
        - name: ml-workspace
          image: kubeflownotebookswg/jupyter-pytorch-cuda-full:v1.8.0
          resources:
            requests:
              cpu: "2"
              memory: 4Gi
              nvidia.com/gpu: 1
            limits:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: 1
          volumeMounts:
            - name: workspace
              mountPath: /home/jovyan
      volumes:
        - name: workspace
          persistentVolumeClaim:
            claimName: ml-workspace-pvc
```

## Building an ML Pipeline

Kubeflow Pipelines let you define reproducible ML workflows as code. Here is a simple pipeline using the Kubeflow Pipelines SDK:

```python
# pipeline.py
from kfp import dsl
from kfp import compiler

# Define pipeline components
@dsl.component(base_image="python:3.10")
def load_data() -> str:
    """Download and prepare training data."""
    import urllib.request
    import os
    data_path = "/tmp/data"
    os.makedirs(data_path, exist_ok=True)
    # Download dataset
    print("Data loaded successfully")
    return data_path

@dsl.component(base_image="pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime",
               packages_to_install=["torchvision"])
def train_model(data_path: str, epochs: int = 10) -> str:
    """Train a PyTorch model."""
    import torch
    import torchvision
    import torchvision.transforms as transforms

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on {device}")

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])
    trainset = torchvision.datasets.MNIST(root=data_path, train=True,
                                           download=True, transform=transform)
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=64, shuffle=True)

    model = torch.nn.Sequential(
        torch.nn.Flatten(),
        torch.nn.Linear(784, 128),
        torch.nn.ReLU(),
        torch.nn.Linear(128, 10)
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters())
    criterion = torch.nn.CrossEntropyLoss()

    for epoch in range(epochs):
        for inputs, labels in trainloader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(inputs), labels)
            loss.backward()
            optimizer.step()
        print(f"Epoch {epoch+1} complete")

    model_path = "/tmp/model.pth"
    torch.save(model.state_dict(), model_path)
    return model_path

@dsl.component(base_image="python:3.10")
def evaluate_model(model_path: str) -> float:
    """Evaluate the trained model."""
    print(f"Evaluating model at {model_path}")
    # Simplified evaluation
    accuracy = 0.95
    print(f"Model accuracy: {accuracy}")
    return accuracy

# Define the pipeline
@dsl.pipeline(name="mnist-training-pipeline")
def mnist_pipeline(epochs: int = 10):
    data_task = load_data()
    train_task = train_model(data_path=data_task.output, epochs=epochs)
    train_task.set_gpu_limit(1)
    evaluate_model(model_path=train_task.output)

# Compile the pipeline
compiler.Compiler().compile(mnist_pipeline, "mnist_pipeline.yaml")
```

Upload the compiled pipeline YAML through the Kubeflow dashboard or use the SDK to submit it:

```python
import kfp

client = kfp.Client(host="http://localhost:8080/pipeline")
client.create_run_from_pipeline_func(
    mnist_pipeline,
    arguments={"epochs": 20}
)
```

## Configuring Katib for Hyperparameter Tuning

Kubeflow includes Katib for automated hyperparameter tuning. Create an experiment:

```yaml
# katib-experiment.yaml
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: resnet-tuning
  namespace: kubeflow-user-example-com
spec:
  objective:
    type: maximize
    goal: 0.99
    objectiveMetricName: accuracy
  algorithm:
    algorithmName: random
  parallelTrialCount: 3
  maxTrialCount: 12
  maxFailedTrialCount: 3
  parameters:
    - name: lr
      parameterType: double
      feasibleSpace:
        min: "0.001"
        max: "0.1"
    - name: batch_size
      parameterType: int
      feasibleSpace:
        min: "32"
        max: "256"
  trialTemplate:
    primaryContainerName: training
    trialParameters:
      - name: learningRate
        reference: lr
      - name: batchSize
        reference: batch_size
    trialSpec:
      apiVersion: batch/v1
      kind: Job
      spec:
        template:
          spec:
            containers:
              - name: training
                image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
                command:
                  - python
                  - /scripts/train.py
                  - --lr=${trialParameters.learningRate}
                  - --batch-size=${trialParameters.batchSize}
                resources:
                  limits:
                    nvidia.com/gpu: 1
            restartPolicy: Never
```

## Talos-Specific Considerations

When running Kubeflow on Talos Linux, keep these points in mind:

- Istio requires some additional kernel modules. Ensure they are loaded through Talos machine configuration.
- Kubeflow components create many pods, so ensure your cluster has sufficient resources.
- Use node affinity to keep Kubeflow system components on non-GPU nodes, reserving GPUs for actual ML workloads.
- Configure proper resource quotas per namespace to prevent any single user from consuming all cluster resources.

## Conclusion

Kubeflow on Talos Linux gives you a complete MLOps platform on a secure, immutable foundation. From interactive notebooks and automated pipelines to hyperparameter tuning and model serving, Kubeflow covers every stage of the ML lifecycle. Combined with Talos's security properties, you have an enterprise-grade ML platform that is both powerful and well-protected against infrastructure-level threats.

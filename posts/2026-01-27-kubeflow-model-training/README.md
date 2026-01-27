# How to Use Kubeflow for Model Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubeflow, Kubernetes, Machine Learning, MLOps, TFJob, PyTorchJob, Katib, GPU, Distributed Training

Description: A comprehensive guide to training machine learning models at scale using Kubeflow on Kubernetes, covering training operators, distributed training, GPU scheduling, and hyperparameter tuning.

---

> Kubeflow turns Kubernetes into a machine learning platform. It handles the complexity of distributed training, GPU scheduling, and experiment tracking so you can focus on building better models.

## What Is Kubeflow?

Kubeflow is an open-source ML platform designed to make deployments of machine learning workflows on Kubernetes simple, portable, and scalable. It provides a suite of tools for every stage of the ML lifecycle:

- **Training Operators** - Run TensorFlow, PyTorch, and other framework jobs
- **Katib** - Automated hyperparameter tuning
- **Pipelines** - End-to-end ML workflow orchestration
- **Notebooks** - Jupyter notebooks on Kubernetes
- **Serving** - Model deployment and inference

## Installing Kubeflow

### Prerequisites

```bash
# Verify Kubernetes cluster is running
kubectl cluster-info

# Ensure you have at least 16GB RAM and 4 CPUs available
kubectl top nodes
```

### Install with kustomize

```bash
# Clone the Kubeflow manifests repository
git clone https://github.com/kubeflow/manifests.git
cd manifests

# Install Kubeflow (this may take 10-15 minutes)
while ! kustomize build example | kubectl apply -f -; do
  echo "Retrying..."
  sleep 10
done

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n kubeflow --timeout=600s
```

### Access the Dashboard

```bash
# Port forward to access the Kubeflow dashboard
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80

# Open http://localhost:8080 in your browser
# Default credentials: user@example.com / 12341234
```

## Training Operators: TFJob and PyTorchJob

Training operators are Kubernetes custom resources that manage distributed training jobs. They handle pod creation, networking, and failure recovery automatically.

### TFJob for TensorFlow Training

TFJob manages TensorFlow distributed training using the parameter server or multi-worker mirrored strategy.

```yaml
# tfjob-mnist.yaml
# TFJob for training a simple MNIST classifier
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: mnist-training
  namespace: kubeflow
spec:
  # Clean up completed pods after 1 hour
  ttlSecondsAfterFinished: 3600
  tfReplicaSpecs:
    # Parameter Server configuration
    PS:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:2.14.0-gpu
              command:
                - python
                - /app/train.py
                - --job_type=ps
              resources:
                requests:
                  cpu: "2"
                  memory: "4Gi"
                limits:
                  cpu: "4"
                  memory: "8Gi"
              volumeMounts:
                - name: training-code
                  mountPath: /app
          volumes:
            - name: training-code
              configMap:
                name: mnist-training-code
    # Worker configuration - these do the actual training
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:2.14.0-gpu
              command:
                - python
                - /app/train.py
                - --job_type=worker
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
                - name: training-code
                  mountPath: /app
                - name: model-output
                  mountPath: /output
          volumes:
            - name: training-code
              configMap:
                name: mnist-training-code
            - name: model-output
              persistentVolumeClaim:
                claimName: model-storage
```

### PyTorchJob for PyTorch Training

PyTorchJob manages PyTorch distributed training using torch.distributed.

```yaml
# pytorchjob-resnet.yaml
# PyTorchJob for distributed ResNet training
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: resnet-distributed
  namespace: kubeflow
spec:
  # Enable elastic training - job can scale up/down dynamically
  elasticPolicy:
    minReplicas: 2
    maxReplicas: 8
    rdzvBackend: etcd
    rdzvHost: etcd-service
    rdzvPort: 2379
  pytorchReplicaSpecs:
    # Master node coordinates the training
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
              command:
                - python
                - -m
                - torch.distributed.launch
                - --nproc_per_node=1
                - --nnodes=$(WORLD_SIZE)
                - --node_rank=$(RANK)
                - --master_addr=$(MASTER_ADDR)
                - --master_port=$(MASTER_PORT)
                - /app/train_resnet.py
              env:
                - name: NCCL_DEBUG
                  value: "INFO"
              resources:
                requests:
                  nvidia.com/gpu: "1"
                limits:
                  nvidia.com/gpu: "1"
              volumeMounts:
                - name: dshm
                  mountPath: /dev/shm
                - name: training-data
                  mountPath: /data
          volumes:
            # Shared memory for NCCL communication
            - name: dshm
              emptyDir:
                medium: Memory
                sizeLimit: "16Gi"
            - name: training-data
              persistentVolumeClaim:
                claimName: imagenet-data
    # Worker nodes participate in distributed training
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
              command:
                - python
                - -m
                - torch.distributed.launch
                - --nproc_per_node=1
                - --nnodes=$(WORLD_SIZE)
                - --node_rank=$(RANK)
                - --master_addr=$(MASTER_ADDR)
                - --master_port=$(MASTER_PORT)
                - /app/train_resnet.py
              resources:
                requests:
                  nvidia.com/gpu: "1"
                limits:
                  nvidia.com/gpu: "1"
              volumeMounts:
                - name: dshm
                  mountPath: /dev/shm
                - name: training-data
                  mountPath: /data
          volumes:
            - name: dshm
              emptyDir:
                medium: Memory
                sizeLimit: "16Gi"
            - name: training-data
              persistentVolumeClaim:
                claimName: imagenet-data
```

## Distributed Training Strategies

### Data Parallelism

Data parallelism distributes the dataset across multiple workers. Each worker has a copy of the model and processes different batches.

```python
# train_distributed.py
# PyTorch Distributed Data Parallel training script
import torch
import torch.distributed as dist
import torch.nn as nn
import torch.optim as optim
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data.distributed import DistributedSampler
import os

def setup_distributed():
    """Initialize the distributed environment."""
    # Kubeflow sets these environment variables automatically
    rank = int(os.environ.get("RANK", 0))
    world_size = int(os.environ.get("WORLD_SIZE", 1))
    master_addr = os.environ.get("MASTER_ADDR", "localhost")
    master_port = os.environ.get("MASTER_PORT", "29500")

    # Initialize process group for distributed training
    dist.init_process_group(
        backend="nccl",  # Use NCCL for GPU communication
        init_method=f"tcp://{master_addr}:{master_port}",
        world_size=world_size,
        rank=rank
    )

    # Set the GPU device for this process
    torch.cuda.set_device(rank % torch.cuda.device_count())

    return rank, world_size

def train():
    rank, world_size = setup_distributed()

    # Create model and move to GPU
    model = YourModel().cuda()

    # Wrap model with DistributedDataParallel
    # This handles gradient synchronization across workers
    model = DDP(model, device_ids=[rank % torch.cuda.device_count()])

    # Use DistributedSampler to partition data across workers
    train_dataset = YourDataset()
    sampler = DistributedSampler(
        train_dataset,
        num_replicas=world_size,
        rank=rank,
        shuffle=True
    )

    train_loader = torch.utils.data.DataLoader(
        train_dataset,
        batch_size=32,
        sampler=sampler,
        num_workers=4,
        pin_memory=True
    )

    optimizer = optim.Adam(model.parameters(), lr=0.001 * world_size)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(100):
        # Important: set epoch for shuffling
        sampler.set_epoch(epoch)

        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.cuda(), target.cuda()

            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            # Only print from rank 0 to avoid duplicate logs
            if rank == 0 and batch_idx % 100 == 0:
                print(f"Epoch {epoch}, Batch {batch_idx}, Loss: {loss.item():.4f}")

        # Save checkpoint only from rank 0
        if rank == 0:
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.module.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
            }, f'/output/checkpoint_epoch_{epoch}.pt')

    # Clean up
    dist.destroy_process_group()

if __name__ == "__main__":
    train()
```

### Model Parallelism for Large Models

For models too large to fit on a single GPU, use model parallelism:

```python
# model_parallel.py
# Pipeline parallelism for large models using PyTorch
import torch
import torch.nn as nn
from torch.distributed.pipeline.sync import Pipe

class LargeModel(nn.Module):
    """A large model split across multiple GPUs."""

    def __init__(self):
        super().__init__()

        # First half of the model on GPU 0
        self.layer1 = nn.Sequential(
            nn.Linear(1024, 4096),
            nn.ReLU(),
            nn.Linear(4096, 4096),
            nn.ReLU(),
        ).to('cuda:0')

        # Second half of the model on GPU 1
        self.layer2 = nn.Sequential(
            nn.Linear(4096, 4096),
            nn.ReLU(),
            nn.Linear(4096, 1000),
        ).to('cuda:1')

    def forward(self, x):
        # Move data between GPUs as needed
        x = self.layer1(x.to('cuda:0'))
        x = self.layer2(x.to('cuda:1'))
        return x

# Wrap with Pipe for pipeline parallelism
# This overlaps computation across micro-batches
model = LargeModel()
model = Pipe(model, chunks=8)  # Split batch into 8 micro-batches
```

## GPU Scheduling

### Requesting GPUs in Pod Specs

```yaml
# gpu-training-pod.yaml
# Pod spec with GPU resource requests
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training
spec:
  containers:
    - name: training
      image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
      resources:
        requests:
          # Request 2 NVIDIA GPUs
          nvidia.com/gpu: "2"
          # Request sufficient CPU and memory
          cpu: "8"
          memory: "32Gi"
        limits:
          nvidia.com/gpu: "2"
          cpu: "16"
          memory: "64Gi"
      # Set CUDA visible devices
      env:
        - name: NVIDIA_VISIBLE_DEVICES
          value: "all"
        - name: CUDA_VISIBLE_DEVICES
          value: "0,1"
```

### GPU Node Affinity

Schedule training jobs on specific GPU node pools:

```yaml
# gpu-node-affinity.yaml
# Training job with GPU node affinity
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: a100-training
spec:
  pytorchReplicaSpecs:
    Worker:
      replicas: 4
      template:
        spec:
          # Schedule only on nodes with A100 GPUs
          nodeSelector:
            accelerator: nvidia-a100
          # Or use affinity for more control
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: nvidia.com/gpu.product
                        operator: In
                        values:
                          - NVIDIA-A100-SXM4-80GB
                          - NVIDIA-A100-SXM4-40GB
          tolerations:
            # Tolerate GPU node taints
            - key: nvidia.com/gpu
              operator: Exists
              effect: NoSchedule
          containers:
            - name: pytorch
              image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
              resources:
                limits:
                  nvidia.com/gpu: "8"
```

### Multi-Instance GPU (MIG) Support

For A100 GPUs, use MIG to partition a single GPU:

```yaml
# mig-training.yaml
# Use MIG partitions for smaller training jobs
apiVersion: v1
kind: Pod
metadata:
  name: mig-training
spec:
  containers:
    - name: training
      image: tensorflow/tensorflow:2.14.0-gpu
      resources:
        limits:
          # Request a specific MIG partition
          # 3g.20gb = 3 GPU instances, 20GB memory
          nvidia.com/mig-3g.20gb: "1"
```

## Hyperparameter Tuning with Katib

Katib is Kubeflow's hyperparameter tuning system. It automatically searches for optimal hyperparameters using various algorithms.

### Basic Katib Experiment

```yaml
# katib-experiment.yaml
# Hyperparameter tuning experiment for a neural network
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: cnn-hyperparameter-tuning
  namespace: kubeflow
spec:
  # Objective metric to optimize
  objective:
    type: maximize
    goal: 0.99
    objectiveMetricName: accuracy
    additionalMetricNames:
      - loss
      - val_accuracy

  # Search algorithm configuration
  algorithm:
    algorithmName: bayesianoptimization
    algorithmSettings:
      - name: random_state
        value: "42"

  # Maximum number of trials to run
  maxTrialCount: 30
  # Run up to 5 trials in parallel
  parallelTrialCount: 5
  # Stop if 3 trials fail
  maxFailedTrialCount: 3

  # Hyperparameter search space
  parameters:
    - name: learning_rate
      parameterType: double
      feasibleSpace:
        min: "0.0001"
        max: "0.1"
        step: "0.0001"
    - name: batch_size
      parameterType: int
      feasibleSpace:
        min: "16"
        max: "256"
        step: "16"
    - name: num_layers
      parameterType: int
      feasibleSpace:
        min: "2"
        max: "10"
    - name: optimizer
      parameterType: categorical
      feasibleSpace:
        list:
          - adam
          - sgd
          - rmsprop
    - name: dropout_rate
      parameterType: double
      feasibleSpace:
        min: "0.0"
        max: "0.5"

  # Resume policy for fault tolerance
  resumePolicy: FromVolume

  # Trial template - each trial runs a training job
  trialTemplate:
    primaryContainerName: training
    trialParameters:
      - name: learningRate
        description: Learning rate for the optimizer
        reference: learning_rate
      - name: batchSize
        description: Training batch size
        reference: batch_size
      - name: numLayers
        description: Number of hidden layers
        reference: num_layers
      - name: optimizer
        description: Optimizer algorithm
        reference: optimizer
      - name: dropoutRate
        description: Dropout rate for regularization
        reference: dropout_rate
    trialSpec:
      apiVersion: batch/v1
      kind: Job
      spec:
        template:
          spec:
            containers:
              - name: training
                image: your-registry/cnn-trainer:latest
                command:
                  - python
                  - /app/train.py
                  - --learning_rate=${trialParameters.learningRate}
                  - --batch_size=${trialParameters.batchSize}
                  - --num_layers=${trialParameters.numLayers}
                  - --optimizer=${trialParameters.optimizer}
                  - --dropout_rate=${trialParameters.dropoutRate}
                resources:
                  limits:
                    nvidia.com/gpu: "1"
                    memory: "16Gi"
            restartPolicy: Never
```

### Training Script for Katib

```python
# train_with_katib.py
# Training script that reports metrics to Katib
import argparse
import tensorflow as tf

def create_model(num_layers, dropout_rate):
    """Create a CNN model with configurable architecture."""
    model = tf.keras.Sequential()
    model.add(tf.keras.layers.Input(shape=(28, 28, 1)))

    for i in range(num_layers):
        model.add(tf.keras.layers.Conv2D(32 * (2 ** i), 3, activation='relu'))
        model.add(tf.keras.layers.MaxPooling2D(2))
        model.add(tf.keras.layers.Dropout(dropout_rate))

    model.add(tf.keras.layers.Flatten())
    model.add(tf.keras.layers.Dense(128, activation='relu'))
    model.add(tf.keras.layers.Dropout(dropout_rate))
    model.add(tf.keras.layers.Dense(10, activation='softmax'))

    return model

class KatibMetricsCallback(tf.keras.callbacks.Callback):
    """Callback to print metrics in Katib-readable format."""

    def on_epoch_end(self, epoch, logs=None):
        # Katib parses stdout for metrics in this format
        # Format: metric_name=value
        print(f"\nEpoch {epoch + 1}")
        print(f"accuracy={logs['accuracy']:.4f}")
        print(f"loss={logs['loss']:.4f}")
        print(f"val_accuracy={logs['val_accuracy']:.4f}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--learning_rate', type=float, default=0.001)
    parser.add_argument('--batch_size', type=int, default=32)
    parser.add_argument('--num_layers', type=int, default=3)
    parser.add_argument('--optimizer', type=str, default='adam')
    parser.add_argument('--dropout_rate', type=float, default=0.2)
    parser.add_argument('--epochs', type=int, default=10)
    args = parser.parse_args()

    # Load data
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0

    # Create model with hyperparameters
    model = create_model(args.num_layers, args.dropout_rate)

    # Select optimizer based on hyperparameter
    optimizers = {
        'adam': tf.keras.optimizers.Adam(learning_rate=args.learning_rate),
        'sgd': tf.keras.optimizers.SGD(learning_rate=args.learning_rate),
        'rmsprop': tf.keras.optimizers.RMSprop(learning_rate=args.learning_rate),
    }

    model.compile(
        optimizer=optimizers[args.optimizer],
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    # Train with Katib metrics callback
    model.fit(
        x_train, y_train,
        batch_size=args.batch_size,
        epochs=args.epochs,
        validation_data=(x_test, y_test),
        callbacks=[KatibMetricsCallback()]
    )

if __name__ == '__main__':
    main()
```

### Early Stopping with Katib

Configure early stopping to terminate underperforming trials:

```yaml
# katib-early-stopping.yaml
# Experiment with median stopping rule
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: early-stopping-experiment
spec:
  objective:
    type: maximize
    goal: 0.99
    objectiveMetricName: val_accuracy

  algorithm:
    algorithmName: tpe  # Tree-structured Parzen Estimator

  # Early stopping configuration
  earlyStopping:
    algorithmName: medianstop
    algorithmSettings:
      - name: min_trials_required
        value: "3"
      - name: start_step
        value: "5"

  maxTrialCount: 50
  parallelTrialCount: 10

  parameters:
    - name: learning_rate
      parameterType: double
      feasibleSpace:
        min: "0.00001"
        max: "0.1"

  trialTemplate:
    # ... same as above
```

## Experiment Tracking

### Using MLflow with Kubeflow

```python
# train_with_mlflow.py
# Training script with MLflow experiment tracking
import mlflow
import mlflow.pytorch
import torch
import os

# Configure MLflow to use the tracking server
mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow-server:5000"))
mlflow.set_experiment("resnet-training")

def train():
    with mlflow.start_run():
        # Log hyperparameters
        mlflow.log_params({
            "learning_rate": 0.001,
            "batch_size": 32,
            "epochs": 100,
            "model": "ResNet50"
        })

        model = create_model()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

        for epoch in range(100):
            train_loss, train_acc = train_epoch(model, optimizer)
            val_loss, val_acc = validate(model)

            # Log metrics for each epoch
            mlflow.log_metrics({
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "val_loss": val_loss,
                "val_accuracy": val_acc
            }, step=epoch)

        # Log the trained model
        mlflow.pytorch.log_model(model, "model")

        # Log artifacts like plots or config files
        mlflow.log_artifact("/app/training_config.yaml")
```

### Deploy MLflow on Kubernetes

```yaml
# mlflow-deployment.yaml
# MLflow tracking server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: kubeflow
spec:
  replicas: 1
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
          image: ghcr.io/mlflow/mlflow:v2.9.0
          command:
            - mlflow
            - server
            - --host=0.0.0.0
            - --port=5000
            - --backend-store-uri=postgresql://mlflow:password@postgres:5432/mlflow
            - --default-artifact-root=s3://mlflow-artifacts/
          ports:
            - containerPort: 5000
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-credentials
                  key: secret-key
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-server
  namespace: kubeflow
spec:
  ports:
    - port: 5000
      targetPort: 5000
  selector:
    app: mlflow
```

## Monitoring Training Jobs

### View Job Status

```bash
# List all TFJobs
kubectl get tfjobs -n kubeflow

# Get detailed status of a specific job
kubectl describe tfjob mnist-training -n kubeflow

# View logs from a worker pod
kubectl logs -n kubeflow mnist-training-worker-0 -f

# List all Katib experiments
kubectl get experiments -n kubeflow

# Get experiment results
kubectl get experiment cnn-hyperparameter-tuning -n kubeflow -o yaml
```

### Prometheus Metrics

```yaml
# servicemonitor.yaml
# Expose training metrics to Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: training-metrics
  namespace: kubeflow
spec:
  selector:
    matchLabels:
      app: training
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Best Practices Summary

1. **Use appropriate training operators** - TFJob for TensorFlow, PyTorchJob for PyTorch. They handle distributed training complexity automatically.

2. **Request GPU resources explicitly** - Always specify nvidia.com/gpu in resource requests and limits to ensure proper scheduling.

3. **Configure shared memory for NCCL** - Mount an emptyDir with medium: Memory at /dev/shm for efficient GPU-to-GPU communication.

4. **Use DistributedSampler for data loading** - Ensure each worker processes a unique subset of the data to avoid redundant computation.

5. **Scale learning rate with world size** - When using data parallelism, multiply the base learning rate by the number of workers.

6. **Implement checkpointing** - Save model checkpoints regularly to persistent storage. Only save from rank 0 to avoid conflicts.

7. **Use Katib for hyperparameter search** - Automated tuning finds better hyperparameters faster than manual search.

8. **Track experiments with MLflow** - Log parameters, metrics, and artifacts for reproducibility and comparison.

9. **Set resource limits appropriately** - Prevent resource contention by setting both requests and limits on CPU, memory, and GPU.

10. **Use node affinity for GPU types** - Schedule training jobs on nodes with the appropriate GPU type (A100 vs V100 vs T4) based on workload requirements.

---

Kubeflow transforms Kubernetes into a powerful ML training platform. Start with single-node training jobs, then scale to distributed training as your models and datasets grow. Use Katib to automate the tedious work of hyperparameter tuning, and track everything with MLflow for reproducibility. With these tools, you can focus on what matters: building better models.

For monitoring your Kubeflow training jobs and infrastructure, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you track model training metrics, set up alerts for failed jobs, and maintain visibility across your entire ML pipeline.

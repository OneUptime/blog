# How to Deploy PyTorch Training Jobs Using the Kubeflow Training Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PyTorch, Kubeflow, Machine Learning, Distributed Training

Description: Deploy distributed PyTorch training jobs on Kubernetes using the Kubeflow Training Operator for scalable and fault-tolerant machine learning model training.

---

Training deep learning models at scale requires distributing the workload across multiple GPUs and nodes. PyTorch provides excellent distributed training capabilities, but managing these distributed jobs on Kubernetes manually becomes complex. The Kubeflow Training Operator simplifies this by providing a Kubernetes-native way to define and manage PyTorch training jobs with automatic setup of distributed communication, fault tolerance, and resource management.

This guide shows you how to set up the Training Operator and deploy distributed PyTorch training jobs on Kubernetes.

## Installing the Kubeflow Training Operator

The Training Operator manages distributed training jobs for PyTorch, TensorFlow, MXNet, and other frameworks.

Install using kubectl:

```bash
# Install the Training Operator
kubectl apply -k "github.com/kubeflow/training-operator/manifests/overlays/standalone?ref=v1.7.0"

# Verify installation
kubectl get pods -n kubeflow

# Check the operator is running
kubectl logs -n kubeflow deployment/training-operator

# Verify CRDs are installed
kubectl get crd | grep kubeflow.org
# Should see: pytorchjobs.kubeflow.org
```

Alternatively, install with Helm:

```bash
# Add Kubeflow Helm repo
helm repo add kubeflow https://kubeflow.github.io/training-operator
helm repo update

# Install Training Operator
helm install training-operator kubeflow/training-operator \
  --namespace kubeflow \
  --create-namespace \
  --set pytorch.enabled=true

# Verify
helm list -n kubeflow
```

## Creating a Simple PyTorch Training Job

Start with a basic single-node training job to understand the structure:

```yaml
# simple-pytorch-job.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-simple
  namespace: training
spec:
  # PyTorch job requires exactly one master
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - python
            - -c
            - |
              import torch
              import torch.nn as nn
              import torch.optim as optim

              print(f"PyTorch version: {torch.__version__}")
              print(f"CUDA available: {torch.cuda.is_available()}")

              # Simple neural network
              class SimpleNet(nn.Module):
                  def __init__(self):
                      super(SimpleNet, self).__init__()
                      self.fc1 = nn.Linear(10, 50)
                      self.fc2 = nn.Linear(50, 1)

                  def forward(self, x):
                      x = torch.relu(self.fc1(x))
                      x = self.fc2(x)
                      return x

              # Training loop
              model = SimpleNet()
              if torch.cuda.is_available():
                  model = model.cuda()

              optimizer = optim.Adam(model.parameters(), lr=0.001)
              criterion = nn.MSELoss()

              for epoch in range(10):
                  # Dummy data
                  x = torch.randn(32, 10)
                  y = torch.randn(32, 1)

                  if torch.cuda.is_available():
                      x, y = x.cuda(), y.cuda()

                  optimizer.zero_grad()
                  output = model(x)
                  loss = criterion(output, y)
                  loss.backward()
                  optimizer.step()

                  print(f"Epoch {epoch}, Loss: {loss.item():.4f}")

              print("Training completed successfully!")
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "4Gi"
                cpu: "2"
              limits:
                nvidia.com/gpu: 1
                memory: "4Gi"
                cpu: "2"
```

Deploy the job:

```bash
# Create training namespace
kubectl create namespace training

# Deploy the job
kubectl apply -f simple-pytorch-job.yaml

# Watch the job progress
kubectl get pytorchjobs -n training -w

# View logs
kubectl logs -n training pytorch-simple-master-0

# Check job status
kubectl describe pytorchjob pytorch-simple -n training
```

## Distributed Data Parallel Training

Now create a distributed training job using PyTorch DDP (DistributedDataParallel):

```yaml
# distributed-pytorch-job.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-distributed-ddp
  namespace: training
spec:
  pytorchReplicaSpecs:
    # Master replica (rank 0)
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - python
            - /workspace/train_ddp.py
            env:
            # Training Operator automatically sets these:
            # - MASTER_ADDR
            # - MASTER_PORT
            # - WORLD_SIZE
            # - RANK
            - name: NCCL_DEBUG
              value: "INFO"
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
              limits:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
            volumeMounts:
            - name: training-code
              mountPath: /workspace
          volumes:
          - name: training-code
            configMap:
              name: training-script

    # Worker replicas (rank 1, 2, 3)
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - python
            - /workspace/train_ddp.py
            env:
            - name: NCCL_DEBUG
              value: "INFO"
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
              limits:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
            volumeMounts:
            - name: training-code
              mountPath: /workspace
          volumes:
          - name: training-code
            configMap:
              name: training-script
```

Create the training script:

```python
# train_ddp.py
import os
import torch
import torch.nn as nn
import torch.optim as optim
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import Dataset, DataLoader
from torch.utils.data.distributed import DistributedSampler

# Custom dataset
class DummyDataset(Dataset):
    def __init__(self, size=1000):
        self.size = size
        self.data = torch.randn(size, 784)
        self.labels = torch.randint(0, 10, (size,))

    def __len__(self):
        return self.size

    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]

# Model definition
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(784, 256)
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, 10)
        self.dropout = nn.Dropout(0.2)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        x = torch.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        return x

def setup_distributed():
    """Initialize distributed training environment"""
    # Training Operator sets these environment variables
    rank = int(os.environ.get("RANK", 0))
    world_size = int(os.environ.get("WORLD_SIZE", 1))
    master_addr = os.environ.get("MASTER_ADDR", "localhost")
    master_port = os.environ.get("MASTER_PORT", "23456")

    # Initialize process group
    dist.init_process_group(
        backend="nccl",
        init_method=f"tcp://{master_addr}:{master_port}",
        world_size=world_size,
        rank=rank
    )

    # Set device
    local_rank = int(os.environ.get("LOCAL_RANK", 0))
    torch.cuda.set_device(local_rank)

    return rank, world_size, local_rank

def train():
    # Setup distributed training
    rank, world_size, local_rank = setup_distributed()

    print(f"Rank {rank}/{world_size} initialized")

    # Create model and move to GPU
    model = SimpleNN().to(local_rank)

    # Wrap model with DDP
    model = DDP(model, device_ids=[local_rank])

    # Create dataset and distributed sampler
    dataset = DummyDataset(size=10000)
    sampler = DistributedSampler(
        dataset,
        num_replicas=world_size,
        rank=rank,
        shuffle=True
    )

    # Create dataloader
    dataloader = DataLoader(
        dataset,
        batch_size=32,
        sampler=sampler,
        num_workers=2
    )

    # Optimizer and loss
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    # Training loop
    num_epochs = 10
    for epoch in range(num_epochs):
        sampler.set_epoch(epoch)  # Important for proper shuffling
        model.train()

        epoch_loss = 0.0
        for batch_idx, (data, target) in enumerate(dataloader):
            data, target = data.to(local_rank), target.to(local_rank)

            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

            if rank == 0 and batch_idx % 50 == 0:
                print(f"Epoch {epoch}, Batch {batch_idx}, Loss: {loss.item():.4f}")

        # Aggregate loss across all ranks
        avg_loss = epoch_loss / len(dataloader)

        if rank == 0:
            print(f"Epoch {epoch} completed. Average Loss: {avg_loss:.4f}")

    # Save model (only from rank 0)
    if rank == 0:
        torch.save(model.module.state_dict(), "/workspace/model.pt")
        print("Model saved successfully!")

    # Cleanup
    dist.destroy_process_group()

if __name__ == "__main__":
    train()
```

Create a ConfigMap with the training script:

```bash
# Create ConfigMap from the Python script
kubectl create configmap training-script \
  --from-file=train_ddp.py \
  -n training

# Deploy the distributed job
kubectl apply -f distributed-pytorch-job.yaml

# Monitor all pods
kubectl get pods -n training -l training.kubeflow.org/job-name=pytorch-distributed-ddp -w

# View logs from master
kubectl logs -n training pytorch-distributed-ddp-master-0 -f

# View logs from workers
kubectl logs -n training pytorch-distributed-ddp-worker-0 -f
```

## Elastic Training with TorchElastic

Configure elastic training that can handle node failures:

```yaml
# elastic-pytorch-job.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-elastic
  namespace: training
spec:
  # Enable elastic training
  elasticPolicy:
    # Minimum replicas required
    minReplicas: 2
    # Maximum replicas allowed
    maxReplicas: 4
    # Number of retries on failure
    maxRestarts: 10
    # Metrics for scaling
    metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80

  pytorchReplicaSpecs:
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - torchrun
            - --nnodes=2:4  # Min 2, max 4 nodes
            - --nproc_per_node=1
            - --rdzv_backend=c10d
            - --rdzv_endpoint=$(MASTER_ADDR):$(MASTER_PORT)
            - /workspace/train_elastic.py
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
              limits:
                nvidia.com/gpu: 1
                memory: "8Gi"
                cpu: "4"
```

## Saving Models to Persistent Storage

Configure persistent storage for model checkpoints:

```yaml
# pytorch-job-with-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-models
  namespace: training
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 100Gi
---
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-with-storage
  namespace: training
spec:
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - python
            - /workspace/train.py
            - --checkpoint-dir=/models
            - --save-every=5
            env:
            - name: CHECKPOINT_DIR
              value: "/models"
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "8Gi"
              limits:
                nvidia.com/gpu: 1
                memory: "8Gi"
            volumeMounts:
            - name: model-storage
              mountPath: /models
          volumes:
          - name: model-storage
            persistentVolumeClaim:
              claimName: training-models
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
            command:
            - python
            - /workspace/train.py
            - --checkpoint-dir=/models
            resources:
              requests:
                nvidia.com/gpu: 1
                memory: "8Gi"
              limits:
                nvidia.com/gpu: 1
                memory: "8Gi"
            volumeMounts:
            - name: model-storage
              mountPath: /models
          volumes:
          - name: model-storage
            persistentVolumeClaim:
              claimName: training-models
```

## Monitoring Training Jobs

Create a ServiceMonitor for Prometheus:

```yaml
# pytorch-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: pytorch-training
  namespace: training
spec:
  selector:
    matchLabels:
      training.kubeflow.org/job-role: master
  endpoints:
  - port: metrics
    interval: 30s
```

Query training metrics:

```bash
# Get job status
kubectl get pytorchjobs -n training

# Get detailed job info
kubectl describe pytorchjob pytorch-distributed-ddp -n training

# Check events
kubectl get events -n training --sort-by='.lastTimestamp'

# Monitor GPU usage
kubectl exec -n training pytorch-distributed-ddp-master-0 -- nvidia-smi
```

## Cleanup and Best Practices

Set TTL for completed jobs:

```yaml
spec:
  # Automatically delete job after 1 hour of completion
  ttlSecondsAfterFinished: 3600
```

Create resource quotas:

```yaml
# training-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: training-quota
  namespace: training
spec:
  hard:
    nvidia.com/gpu: "16"  # Maximum 16 GPUs for training
    requests.memory: "256Gi"
    limits.memory: "256Gi"
```

## Conclusion

The Kubeflow Training Operator simplifies running distributed PyTorch training jobs on Kubernetes by handling the complex setup of distributed communication, environment variables, and pod orchestration. With support for elastic training, fault tolerance, and easy integration with Kubernetes resource management, it provides a production-ready platform for training models at scale. The operator's declarative approach makes it easy to version control your training configurations and reproduce training runs consistently.

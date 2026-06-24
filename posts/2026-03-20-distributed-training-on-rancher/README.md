# How to Set Up Distributed Training on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Distributed Training, Kubernetes, PyTorch, TensorFlow, GPU, Training Operator

Description: Configure distributed ML model training on Rancher using the Kubeflow Training Operator with PyTorchJob and TFJob for multi-GPU and multi-node training.

## Introduction

Training large ML models requires distributing work across multiple GPUs and nodes. The legacy Kubeflow Training Operator v1 provides Kubernetes-native distributed training with PyTorchJob and TFJob custom resources. In this guide, we use PyTorchJob for data-parallel training across multiple GPUs and nodes.

## Step 1: Install the Training Operator

```bash
kubectl apply --server-side -k "github.com/kubeflow/training-operator.git/manifests/overlays/standalone?ref=v1.8.1"

# Verify installation

kubectl get pods -n kubeflow
kubectl get crd | grep kubeflow
```

## Step 2: Configure GPU Nodes

```bash
# Install NVIDIA GPU Operator (handles driver and plugin installation)
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --wait

# Verify GPUs are available
kubectl get nodes -o json | jq '.items[].status.capacity | select(."nvidia.com/gpu" != null)'
```

## Step 3: Launch a PyTorchJob (Data Parallel Training)

```yaml
# pytorch-training-job.yaml
apiVersion: "kubeflow.org/v1"
kind: PyTorchJob
metadata:
  name: bert-fine-tuning
  namespace: ml-training
spec:
  nprocPerNode: "2"
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: myregistry/bert-trainer:latest
              command:
                - torchrun
              args:
                - --nnodes=$(PET_NNODES)
                - --nproc-per-node=$(PET_NPROC_PER_NODE)
                - --node-rank=$(PET_NODE_RANK)
                - --master-addr=$(PET_MASTER_ADDR)
                - --master-port=$(PET_MASTER_PORT)
                - train.py
                - --epochs=10
                - --batch-size=32
              resources:
                limits:
                  nvidia.com/gpu: "2"    # 2 GPUs per master pod
              env:
                - name: MLFLOW_TRACKING_URI
                  value: https://mlflow.example.com
    Worker:
      replicas: 3    # 3 worker nodes
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: myregistry/bert-trainer:latest
              command:
                - torchrun
              args:
                - --nnodes=$(PET_NNODES)
                - --nproc-per-node=$(PET_NPROC_PER_NODE)
                - --node-rank=$(PET_NODE_RANK)
                - --master-addr=$(PET_MASTER_ADDR)
                - --master-port=$(PET_MASTER_PORT)
                - train.py
                - --epochs=10
                - --batch-size=32
              resources:
                limits:
                  nvidia.com/gpu: "2"    # 2 GPUs per worker
```

```bash
kubectl create namespace ml-training
kubectl apply -f pytorch-training-job.yaml
```

## Step 4: Distributed Training Code (PyTorch)

```python
# train.py
import argparse
import os

import torch
import torch.distributed as dist
import torch.nn as nn
import torch.optim as optim
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, TensorDataset
from torch.utils.data.distributed import DistributedSampler


class MyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(768, 1024),
            nn.ReLU(),
            nn.Linear(1024, 2),
        )

    def forward(self, x):
        return self.net(x)


def setup(local_rank):
    """Initialize distributed training."""
    dist.init_process_group("nccl")    # NCCL for GPU communication
    torch.cuda.set_device(local_rank)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-rank", "--local_rank", type=int, default=int(os.getenv("LOCAL_RANK", 0)))
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    setup(args.local_rank)

    # Each process handles a slice of the data
    rank = dist.get_rank()
    world_size = dist.get_world_size()

    # Wrap model in DDP
    model = MyModel().to(args.local_rank)
    model = DDP(model, device_ids=[args.local_rank], output_device=args.local_rank)

    # Distributed sampler splits data across processes
    dataset = TensorDataset(
        torch.randn(1024, 768),
        torch.randint(0, 2, (1024,)),
    )
    sampler = DistributedSampler(dataset, num_replicas=world_size, rank=rank)
    dataloader = DataLoader(dataset, sampler=sampler, batch_size=args.batch_size, pin_memory=True)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=1e-4)

    # Training loop
    for epoch in range(args.epochs):
        sampler.set_epoch(epoch)    # Required for proper shuffling
        for features, labels in dataloader:
            features = features.to(args.local_rank, non_blocking=True)
            labels = labels.to(args.local_rank, non_blocking=True)

            optimizer.zero_grad()
            loss = criterion(model(features), labels)
            loss.backward()
            optimizer.step()

    if rank == 0:    # Only save model from the master process
        torch.save(model.module.state_dict(), "model.pt")

    dist.destroy_process_group()

if __name__ == "__main__":
    main()
```

## Step 5: Monitor Training

```bash
# Watch training job status
kubectl get pytorchjobs -n ml-training -w

# View master pod logs
kubectl logs -n ml-training bert-fine-tuning-master-0 -f

# Check that PyTorch can see the GPUs inside the master pod
kubectl exec -it bert-fine-tuning-master-0 -n ml-training -- python -c "import torch; print(torch.cuda.device_count())"
```

## Conclusion

Distributed training on Rancher with the legacy Training Operator v1 scales model training from single-GPU to multi-node GPU clusters. The `PyTorchJob` manages the replica topology and injects the distributed environment variables for each pod, while your training code initializes the PyTorch process group and uses NCCL for GPU-to-GPU communication. The `torchrun` launcher starts one worker process per GPU on each node, and `restartPolicy: OnFailure` lets Kubernetes restart failed training containers.

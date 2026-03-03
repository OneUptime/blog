# How to Deploy PyTorch Workloads on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PyTorch, Machine Learning, GPU, Kubernetes, Deep Learning

Description: Learn how to run PyTorch training and inference workloads on Talos Linux with GPU acceleration, distributed training, and TorchServe deployment.

---

PyTorch has become the go-to framework for deep learning research and increasingly for production workloads as well. Its dynamic computation graphs, intuitive API, and strong ecosystem make it the preferred choice for many ML teams. Running PyTorch on Talos Linux gives you an immutable, secure infrastructure layer that pairs well with the reproducibility demands of machine learning workflows. No more worrying about driver conflicts, stale CUDA installations, or configuration drift between your training nodes.

This guide covers running PyTorch workloads on Talos Linux, from single-GPU training to multi-node distributed training and production inference with TorchServe.

## Prerequisites

Before getting started, make sure you have:

- A Talos Linux cluster with NVIDIA GPU nodes configured
- NVIDIA device plugin deployed and functional
- kubectl and Helm configured
- Persistent storage for datasets and model checkpoints
- At least one GPU node with 8GB or more of VRAM for practical training

## Verifying PyTorch GPU Access

Start by confirming that PyTorch can see the GPUs in your cluster:

```bash
# Run a quick PyTorch GPU check
kubectl run pytorch-gpu-test --rm -it --restart=Never \
  --image=pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime \
  --limits=nvidia.com/gpu=1 \
  -- python -c "
import torch
print('PyTorch version:', torch.__version__)
print('CUDA available:', torch.cuda.is_available())
print('GPU count:', torch.cuda.device_count())
if torch.cuda.is_available():
    print('GPU name:', torch.cuda.get_device_name(0))
    print('CUDA version:', torch.version.cuda)
"
```

## Single-GPU Training Job

Here is a complete example of training a ResNet model on CIFAR-10 using a Kubernetes Job:

```yaml
# pytorch-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-resnet-training
  namespace: ml-workloads
spec:
  backoffLimit: 2
  template:
    metadata:
      labels:
        app: pytorch-training
    spec:
      restartPolicy: OnFailure
      containers:
        - name: pytorch
          image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
          command: ["python", "/scripts/train_resnet.py"]
          resources:
            requests:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: 16Gi
              nvidia.com/gpu: 1
          volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: models
              mountPath: /models
          env:
            - name: PYTHONUNBUFFERED
              value: "1"
      volumes:
        - name: scripts
          configMap:
            name: pytorch-training-scripts
        - name: models
          persistentVolumeClaim:
            claimName: model-storage
```

Create the training script:

```yaml
# pytorch-training-scripts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pytorch-training-scripts
  namespace: ml-workloads
data:
  train_resnet.py: |
    import torch
    import torch.nn as nn
    import torch.optim as optim
    import torchvision
    import torchvision.transforms as transforms
    import os

    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on: {device}")

    # Data transforms with augmentation
    transform_train = transforms.Compose([
        transforms.RandomCrop(32, padding=4),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))
    ])

    transform_test = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))
    ])

    # Load datasets
    trainset = torchvision.datasets.CIFAR10(
        root='/data', train=True, download=True, transform=transform_train
    )
    trainloader = torch.utils.data.DataLoader(
        trainset, batch_size=128, shuffle=True, num_workers=4, pin_memory=True
    )

    testset = torchvision.datasets.CIFAR10(
        root='/data', train=False, download=True, transform=transform_test
    )
    testloader = torch.utils.data.DataLoader(
        testset, batch_size=128, shuffle=False, num_workers=4, pin_memory=True
    )

    # Build model
    model = torchvision.models.resnet18(num_classes=10).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(model.parameters(), lr=0.1, momentum=0.9, weight_decay=5e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)

    # Training loop
    best_acc = 0.0
    for epoch in range(100):
        model.train()
        running_loss = 0.0

        for i, (inputs, labels) in enumerate(trainloader):
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        scheduler.step()

        # Evaluate
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in testloader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        acc = 100 * correct / total
        print(f"Epoch {epoch+1}: Loss={running_loss/len(trainloader):.4f}, Acc={acc:.2f}%")

        # Save best model
        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), '/models/resnet18_cifar10_best.pth')

    print(f"Training complete. Best accuracy: {best_acc:.2f}%")
    # Save final model for serving
    torch.save(model.state_dict(), '/models/resnet18_cifar10_final.pth')
```

Apply and run:

```bash
kubectl apply -f pytorch-training-scripts.yaml
kubectl apply -f pytorch-training-job.yaml
kubectl logs -n ml-workloads job/pytorch-resnet-training -f
```

## Distributed Training with PyTorch DDP

PyTorch's DistributedDataParallel (DDP) is the standard approach for multi-GPU and multi-node training. You can use the PyTorch Job operator from Kubeflow, or set it up manually with headless services:

```yaml
# pytorch-distributed.yaml
apiVersion: v1
kind: Service
metadata:
  name: pytorch-workers
  namespace: ml-workloads
spec:
  clusterIP: None
  selector:
    app: pytorch-ddp
  ports:
    - port: 29500
      name: nccl
---
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-ddp-worker-0
  namespace: ml-workloads
spec:
  template:
    metadata:
      labels:
        app: pytorch-ddp
    spec:
      restartPolicy: OnFailure
      subdomain: pytorch-workers
      hostname: worker-0
      containers:
        - name: pytorch
          image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
          command: ["python", "-m", "torch.distributed.run",
                    "--nproc_per_node=1",
                    "--nnodes=2",
                    "--node_rank=0",
                    "--master_addr=worker-0.pytorch-workers.ml-workloads.svc",
                    "--master_port=29500",
                    "/scripts/ddp_train.py"]
          resources:
            limits:
              nvidia.com/gpu: 1
          ports:
            - containerPort: 29500
          volumeMounts:
            - name: scripts
              mountPath: /scripts
      volumes:
        - name: scripts
          configMap:
            name: ddp-training-scripts
```

The DDP training script:

```python
# ddp_train.py
import torch
import torch.distributed as dist
import torch.nn as nn
from torch.nn.parallel import DistributedDataParallel as DDP
import torchvision
import torchvision.transforms as transforms
from torch.utils.data.distributed import DistributedSampler

# Initialize distributed process group
dist.init_process_group(backend='nccl')
local_rank = int(os.environ.get('LOCAL_RANK', 0))
torch.cuda.set_device(local_rank)

# Create model and wrap with DDP
model = torchvision.models.resnet18(num_classes=10).cuda(local_rank)
model = DDP(model, device_ids=[local_rank])

# Use distributed sampler for data loading
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))
])
dataset = torchvision.datasets.CIFAR10(root='/data', train=True, download=True, transform=transform)
sampler = DistributedSampler(dataset)
dataloader = torch.utils.data.DataLoader(dataset, batch_size=64, sampler=sampler, num_workers=4)

# Training loop
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)

for epoch in range(20):
    sampler.set_epoch(epoch)
    for inputs, labels in dataloader:
        inputs, labels = inputs.cuda(local_rank), labels.cuda(local_rank)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

    if dist.get_rank() == 0:
        print(f"Epoch {epoch+1} complete")

# Save model on rank 0 only
if dist.get_rank() == 0:
    torch.save(model.module.state_dict(), '/models/ddp_resnet18.pth')

dist.destroy_process_group()
```

## Deploying TorchServe for Inference

TorchServe is the official serving solution for PyTorch models. First, package your model:

```bash
# Create a model archive (run this locally or in a pod)
torch-model-archiver --model-name resnet18 \
  --version 1.0 \
  --model-file model.py \
  --serialized-file resnet18_cifar10_best.pth \
  --handler image_classifier \
  --export-path /models/model_store
```

Deploy TorchServe:

```yaml
# torchserve-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve
  namespace: ml-workloads
spec:
  replicas: 2
  selector:
    matchLabels:
      app: torchserve
  template:
    metadata:
      labels:
        app: torchserve
    spec:
      containers:
        - name: torchserve
          image: pytorch/torchserve:latest-gpu
          args:
            - torchserve
            - --start
            - --model-store=/models/model_store
            - --models=resnet18=resnet18.mar
          ports:
            - containerPort: 8080
              name: inference
            - containerPort: 8081
              name: management
            - containerPort: 8082
              name: metrics
          resources:
            limits:
              nvidia.com/gpu: 1
          volumeMounts:
            - name: models
              mountPath: /models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: model-storage
---
apiVersion: v1
kind: Service
metadata:
  name: torchserve
  namespace: ml-workloads
spec:
  ports:
    - port: 8080
      name: inference
    - port: 8081
      name: management
    - port: 8082
      name: metrics
  selector:
    app: torchserve
```

## Performance Tips for Talos Linux

For optimal PyTorch performance on Talos:

- Use `pin_memory=True` in DataLoaders when using GPUs
- Set `num_workers` to match available CPU cores for data loading
- Use NCCL backend for distributed training across GPUs
- Enable CUDA memory pooling to reduce allocation overhead
- Consider using PyTorch's compile feature for additional speed

## Conclusion

Running PyTorch on Talos Linux gives you a clean, reproducible environment for machine learning workloads. The immutable OS removes an entire category of environment-related bugs that plague ML teams, while Kubernetes provides the scheduling and scaling infrastructure. From quick experiments to large-scale distributed training and production inference, Talos Linux handles the heavy lifting at the infrastructure level so your team can focus on the models.

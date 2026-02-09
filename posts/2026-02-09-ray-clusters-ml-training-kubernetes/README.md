# How to Deploy Ray Clusters on Kubernetes for Distributed ML Training and Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ray, Distributed Computing, Machine Learning, Python

Description: Deploy Ray clusters on Kubernetes for distributed machine learning training, hyperparameter tuning, and model serving with automatic scaling and fault tolerance.

---

Ray is a distributed computing framework that makes it easy to scale Python applications from a laptop to a cluster. For machine learning workloads, Ray provides libraries for distributed training (Ray Train), hyperparameter tuning (Ray Tune), and model serving (Ray Serve). Running Ray on Kubernetes gives you the benefits of both frameworks: Ray's simple Python API and Kubernetes' orchestration capabilities.

This guide shows you how to deploy production-ready Ray clusters on Kubernetes.

## Installing the KubeRay Operator

The KubeRay operator manages Ray clusters on Kubernetes:

```bash
# Add KubeRay Helm repository
helm repo add kuberay https://ray-project.github.io/kuberay-helm/
helm repo update

# Install KubeRay operator
helm install kuberay-operator kuberay/kuberay-operator \
  --namespace ray-system \
  --create-namespace \
  --version 1.0.0

# Verify installation
kubectl get pods -n ray-system
kubectl get crd | grep ray
```

## Creating a Basic Ray Cluster

Deploy a simple Ray cluster:

```yaml
# ray-cluster.yaml
apiVersion: ray.io/v1
kind: RayCluster
metadata:
  name: ray-cluster
  namespace: ray
spec:
  # Ray version
  rayVersion: '2.9.0'

  # Enable autoscaling
  enableInTreeAutoscaling: true

  # Head node configuration
  headGroupSpec:
    rayStartParams:
      dashboard-host: '0.0.0.0'
      block: 'true'
    template:
      spec:
        containers:
        - name: ray-head
          image: rayproject/ray:2.9.0-py310
          ports:
          - containerPort: 6379
            name: gcs
          - containerPort: 8265
            name: dashboard
          - containerPort: 10001
            name: client
          resources:
            requests:
              cpu: "2"
              memory: "8Gi"
            limits:
              cpu: "4"
              memory: "16Gi"
          volumeMounts:
          - name: ray-logs
            mountPath: /tmp/ray
        volumes:
        - name: ray-logs
          emptyDir: {}

  # Worker node groups
  workerGroupSpecs:
  - replicas: 3
    minReplicas: 1
    maxReplicas: 10
    groupName: worker-group
    rayStartParams:
      block: 'true'
    template:
      spec:
        containers:
        - name: ray-worker
          image: rayproject/ray:2.9.0-py310
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
            limits:
              cpu: "8"
              memory: "32Gi"
          volumeMounts:
          - name: ray-logs
            mountPath: /tmp/ray
        volumes:
        - name: ray-logs
          emptyDir: {}

  # Autoscaler configuration
  autoscalerOptions:
    upscalingMode: Default
    idleTimeoutSeconds: 60
    resources:
      limits:
        cpu: "500m"
        memory: "512Mi"
      requests:
        cpu: "100m"
        memory: "128Mi"
```

Deploy the cluster:

```bash
kubectl create namespace ray
kubectl apply -f ray-cluster.yaml

# Wait for cluster to be ready
kubectl wait --for=condition=ready pod -l ray.io/cluster=ray-cluster -n ray --timeout=5m

# Check cluster status
kubectl get rayclusters -n ray
kubectl get pods -n ray -l ray.io/cluster=ray-cluster
```

## Accessing the Ray Dashboard

Expose the Ray dashboard:

```yaml
# ray-dashboard-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ray-dashboard
  namespace: ray
spec:
  selector:
    ray.io/cluster: ray-cluster
    ray.io/node-type: head
  ports:
  - port: 8265
    targetPort: 8265
    name: dashboard
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ray-dashboard
  namespace: ray
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: ray-dashboard.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ray-dashboard
            port:
              number: 8265
```

Access the dashboard:

```bash
kubectl apply -f ray-dashboard-service.yaml

# Or port-forward
kubectl port-forward -n ray svc/ray-dashboard 8265:8265

# Open browser to http://localhost:8265
```

## Running Distributed Training with Ray Train

Create a training script using Ray Train:

```python
# ray_train_example.py
import ray
from ray import train
from ray.train import ScalingConfig
from ray.train.torch import TorchTrainer
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

def train_func(config):
    """Training function that runs on each worker"""
    # Get distributed context
    rank = train.get_context().get_world_rank()
    world_size = train.get_context().get_world_size()

    print(f"Worker {rank}/{world_size} starting...")

    # Create model
    model = nn.Sequential(
        nn.Linear(10, 64),
        nn.ReLU(),
        nn.Linear(64, 32),
        nn.ReLU(),
        nn.Linear(32, 1)
    )

    # Wrap model for distributed training
    model = train.torch.prepare_model(model)

    # Create dataset
    X = torch.randn(1000, 10)
    y = torch.randn(1000, 1)
    dataset = TensorDataset(X, y)
    dataloader = DataLoader(dataset, batch_size=32)

    # Prepare dataloader for distributed training
    dataloader = train.torch.prepare_data_loader(dataloader)

    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()

    # Training loop
    for epoch in range(10):
        model.train()
        total_loss = 0

        for batch_X, batch_y in dataloader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)

        # Report metrics to Ray
        train.report({"loss": avg_loss, "epoch": epoch})

        if rank == 0:
            print(f"Epoch {epoch}: Loss = {avg_loss:.4f}")

if __name__ == "__main__":
    # Connect to Ray cluster
    ray.init(address="ray://ray-cluster-head-svc.ray.svc:10001")

    # Configure distributed training
    scaling_config = ScalingConfig(
        num_workers=4,
        use_gpu=False,
        resources_per_worker={"CPU": 2, "memory": 4 * 1024**3}
    )

    # Create trainer
    trainer = TorchTrainer(
        train_loop_per_worker=train_func,
        scaling_config=scaling_config,
        train_loop_config={}
    )

    # Run training
    result = trainer.fit()

    print("Training completed!")
    print(f"Final metrics: {result.metrics}")
```

Run the training job:

```bash
# Create a job to run the training script
kubectl run ray-train-job --image=rayproject/ray:2.9.0-py310 -n ray \
  --command -- python -c "
import ray
from ray import train
from ray.train import ScalingConfig
from ray.train.torch import TorchTrainer

ray.init('ray://ray-cluster-head-svc:10001')

# Training code here
print('Training started')
"
```

## Hyperparameter Tuning with Ray Tune

Use Ray Tune for distributed hyperparameter search:

```python
# ray_tune_example.py
import ray
from ray import tune
from ray.tune.schedulers import ASHAScheduler
import torch
import torch.nn as nn

def train_model(config):
    """Training function with hyperparameters"""
    model = nn.Sequential(
        nn.Linear(10, config["hidden_size"]),
        nn.ReLU(),
        nn.Linear(config["hidden_size"], 1)
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=config["lr"])

    # Dummy training loop
    for epoch in range(10):
        loss = torch.randn(1).item()  # Simulated loss

        # Report metrics
        tune.report(loss=loss, epoch=epoch)

if __name__ == "__main__":
    ray.init("ray://ray-cluster-head-svc.ray.svc:10001")

    # Define search space
    search_space = {
        "lr": tune.loguniform(1e-4, 1e-1),
        "hidden_size": tune.choice([32, 64, 128, 256]),
        "batch_size": tune.choice([16, 32, 64])
    }

    # Configure scheduler (early stopping)
    scheduler = ASHAScheduler(
        max_t=10,
        grace_period=1,
        reduction_factor=2
    )

    # Run tuning
    tuner = tune.Tuner(
        train_model,
        param_space=search_space,
        tune_config=tune.TuneConfig(
            metric="loss",
            mode="min",
            num_samples=20,
            scheduler=scheduler
        ),
        run_config=train.RunConfig(
            name="tune_experiment",
            storage_path="/tmp/ray_results"
        )
    )

    results = tuner.fit()

    print("Best config:", results.get_best_result().config)
    print("Best loss:", results.get_best_result().metrics["loss"])
```

## Model Serving with Ray Serve

Deploy models with Ray Serve:

```python
# ray_serve_example.py
from ray import serve
import ray

# Start Ray Serve
ray.init("ray://ray-cluster-head-svc.ray.svc:10001")
serve.start(detached=True)

@serve.deployment(num_replicas=3, ray_actor_options={"num_cpus": 1})
class ModelPredictor:
    def __init__(self):
        # Load model
        import torch
        self.model = torch.nn.Linear(10, 1)
        self.model.eval()

    async def __call__(self, request):
        import torch
        import json

        # Parse request
        data = await request.json()
        features = torch.tensor(data["features"])

        # Make prediction
        with torch.no_grad():
            prediction = self.model(features)

        return {"prediction": prediction.item()}

# Deploy
ModelPredictor.deploy()

print("Model deployed at http://localhost:8000/ModelPredictor")
```

Create a service for Ray Serve:

```yaml
# ray-serve-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ray-serve
  namespace: ray
spec:
  selector:
    ray.io/cluster: ray-cluster
    ray.io/node-type: head
  ports:
  - port: 8000
    targetPort: 8000
    name: serve
  type: LoadBalancer
```

## GPU-Enabled Ray Cluster

Deploy Ray with GPU support:

```yaml
apiVersion: ray.io/v1
kind: RayCluster
metadata:
  name: ray-gpu-cluster
  namespace: ray
spec:
  rayVersion: '2.9.0'
  headGroupSpec:
    template:
      spec:
        containers:
        - name: ray-head
          image: rayproject/ray-ml:2.9.0-gpu
          resources:
            requests:
              cpu: "2"
              memory: "8Gi"
            limits:
              cpu: "4"
              memory: "16Gi"

  workerGroupSpecs:
  - replicas: 2
    minReplicas: 1
    maxReplicas: 5
    groupName: gpu-workers
    rayStartParams:
      resources: '"{\"GPU\": 1}"'
    template:
      spec:
        containers:
        - name: ray-worker
          image: rayproject/ray-ml:2.9.0-gpu
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
```

## Monitoring Ray Clusters

Query Ray metrics with Prometheus:

```yaml
# ray-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ray-metrics
  namespace: ray
spec:
  selector:
    matchLabels:
      ray.io/cluster: ray-cluster
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics to monitor:

```promql
# Active workers
ray_cluster_active_nodes

# CPU utilization
ray_node_cpu_utilization

# Memory usage
ray_node_mem_used / ray_node_mem_total

# Task execution time
ray_tasks_execution_time_ms

# Object store memory
ray_object_store_memory
```

## Cleanup and Best Practices

Set resource limits:

```yaml
resources:
  requests:
    cpu: "2"
    memory: "8Gi"
  limits:
    cpu: "4"
    memory: "16Gi"
```

Enable autoscaling:

```yaml
autoscalerOptions:
  upscalingMode: Default
  idleTimeoutSeconds: 60
```

## Conclusion

Ray on Kubernetes provides a powerful platform for distributed machine learning workloads. The KubeRay operator simplifies cluster management while Ray's Python-native API makes it easy to scale existing code. With support for distributed training, hyperparameter tuning, and model serving, Ray offers a complete solution for ML pipelines. The integration with Kubernetes enables automatic scaling, fault tolerance, and resource management, making it suitable for production deployments.

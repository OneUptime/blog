# How to Configure Ray for Distributed Computing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ray, Distributed Computing, Machine Learning, Python, Scalability

Description: Learn how to use Ray for distributed computing, from parallel task execution to scaling ML training and serving across clusters.

---

Python's Global Interpreter Lock (GIL) limits single-process parallelism. When you need to scale beyond a single machine or fully utilize multiple cores, Ray provides a simple API for distributed computing. It powers production ML systems at companies like OpenAI, Uber, and Spotify.

## Why Ray?

Ray makes distributed computing accessible with:

- Simple decorators to parallelize Python functions
- Built-in task scheduling and fault tolerance
- Shared memory for zero-copy data passing
- Ray Tune for hyperparameter optimization
- Ray Serve for model serving
- Ray Train for distributed training
- Works on laptops and scales to clusters

## Installation

Install Ray with the components you need:

```bash
# Core Ray
pip install ray

# All ML libraries
pip install "ray[all]"

# Specific components
pip install "ray[tune]"       # Hyperparameter tuning
pip install "ray[serve]"      # Model serving
pip install "ray[train]"      # Distributed training
pip install "ray[data]"       # Distributed data processing
```

## Getting Started with Ray Core

Ray turns Python functions into distributed tasks with decorators:

```python
import ray
import time

# Initialize Ray (uses all available cores by default)
ray.init()

# Define a regular function
def slow_function(x):
    time.sleep(1)
    return x * x

# Without Ray - sequential execution (10 seconds)
results = [slow_function(i) for i in range(10)]

# Define a Ray task
@ray.remote
def slow_function_ray(x):
    time.sleep(1)
    return x * x

# With Ray - parallel execution (about 1 second with enough cores)
futures = [slow_function_ray.remote(i) for i in range(10)]
results = ray.get(futures)  # Block until all tasks complete

print(results)

# Clean up
ray.shutdown()
```

## Specifying Resources

Control how tasks use CPU, GPU, and memory:

```python
import ray

ray.init()

# CPU-intensive task
@ray.remote(num_cpus=4)
def cpu_heavy_task(data):
    """Process data using 4 CPU cores."""
    # Heavy computation here
    return sum(data)

# GPU task
@ray.remote(num_gpus=1)
def gpu_task(model_weights, data):
    """Run inference on GPU."""
    import torch
    device = torch.device("cuda")
    # Move data to GPU and process
    return "result"

# Memory-intensive task
@ray.remote(memory=4 * 1024 * 1024 * 1024)  # 4 GB
def memory_task(large_dataset):
    """Process large dataset in memory."""
    return len(large_dataset)

# Launch tasks
cpu_future = cpu_heavy_task.remote([1, 2, 3, 4, 5])
gpu_future = gpu_task.remote(None, None)

print(ray.get([cpu_future, gpu_future]))
```

## Ray Actors for Stateful Computation

Actors maintain state across method calls:

```python
import ray

ray.init()

@ray.remote
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self.count

    def get_count(self):
        return self.count

# Create actor instance
counter = Counter.remote()

# Call methods (returns futures)
futures = [counter.increment.remote() for _ in range(10)]
results = ray.get(futures)
print(f"Final counts: {results}")

# Get final state
final_count = ray.get(counter.get_count.remote())
print(f"Final count: {final_count}")
```

## Ray Data for Distributed Datasets

Process large datasets in parallel:

```python
import ray

ray.init()

# Create a Ray Dataset
ds = ray.data.range(10000)

# Map transformation (parallelized automatically)
ds = ds.map(lambda x: {"value": x["id"] * 2})

# Filter
ds = ds.filter(lambda x: x["value"] > 100)

# Batch processing
ds = ds.map_batches(
    lambda batch: {"squared": [v ** 2 for v in batch["value"]]},
    batch_size=100
)

# Aggregate
result = ds.sum("squared")
print(f"Sum: {result}")

# Write to parquet
ds.write_parquet("/tmp/output/")

# Read from various sources
csv_ds = ray.data.read_csv("s3://bucket/data/*.csv")
parquet_ds = ray.data.read_parquet("/data/files/")
json_ds = ray.data.read_json("hdfs://cluster/data/")
```

## Ray Tune for Hyperparameter Optimization

Run distributed hyperparameter search:

```python
import ray
from ray import tune
from ray.tune.schedulers import ASHAScheduler

ray.init()

def train_model(config):
    """Training function that reports metrics."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.datasets import make_classification
    from sklearn.model_selection import cross_val_score

    # Generate sample data
    X, y = make_classification(n_samples=1000, n_features=20, random_state=42)

    # Create model with hyperparameters from config
    model = RandomForestClassifier(
        n_estimators=config["n_estimators"],
        max_depth=config["max_depth"],
        min_samples_split=config["min_samples_split"]
    )

    # Evaluate
    scores = cross_val_score(model, X, y, cv=5)
    accuracy = scores.mean()

    # Report metrics to Ray Tune
    tune.report(accuracy=accuracy)

# Define search space
search_space = {
    "n_estimators": tune.choice([50, 100, 200, 500]),
    "max_depth": tune.randint(3, 20),
    "min_samples_split": tune.uniform(0.01, 0.1)
}

# Early stopping scheduler
scheduler = ASHAScheduler(
    metric="accuracy",
    mode="max",
    max_t=100,
    grace_period=10,
    reduction_factor=2
)

# Run hyperparameter search
analysis = tune.run(
    train_model,
    config=search_space,
    num_samples=50,
    scheduler=scheduler,
    resources_per_trial={"cpu": 2},
    verbose=1
)

# Get best result
best_config = analysis.get_best_config(metric="accuracy", mode="max")
print(f"Best config: {best_config}")
print(f"Best accuracy: {analysis.best_result['accuracy']}")
```

## Ray Serve for Model Serving

Deploy models as scalable microservices:

```python
import ray
from ray import serve
from starlette.requests import Request
import torch

ray.init()
serve.start()

@serve.deployment(
    num_replicas=2,
    ray_actor_options={"num_cpus": 1, "num_gpus": 0.5}
)
class TextClassifier:
    def __init__(self):
        # Load model once per replica
        self.model = self._load_model()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def _load_model(self):
        # Load your PyTorch model here
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        model_name = "distilbert-base-uncased-finetuned-sst-2-english"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        return AutoModelForSequenceClassification.from_pretrained(model_name)

    async def __call__(self, request: Request):
        data = await request.json()
        text = data.get("text", "")

        # Tokenize
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)

        return {
            "prediction": "positive" if probs[0][1] > 0.5 else "negative",
            "confidence": float(probs[0].max())
        }

# Deploy the model
classifier = TextClassifier.bind()
serve.run(classifier, route_prefix="/classify")

# Test with curl:
# curl -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"text": "This is great!"}'
```

## Ray Train for Distributed Training

Scale training across multiple GPUs or machines:

```python
import ray
from ray.train.torch import TorchTrainer
from ray.train import ScalingConfig
import torch
import torch.nn as nn

def train_loop(config):
    """Training loop that runs on each worker."""
    import ray.train as train

    # Model and data setup
    model = nn.Sequential(
        nn.Linear(10, 64),
        nn.ReLU(),
        nn.Linear(64, 1)
    )

    # Prepare model for distributed training
    model = train.torch.prepare_model(model)

    optimizer = torch.optim.Adam(model.parameters(), lr=config["lr"])
    criterion = nn.MSELoss()

    # Simulated dataset
    dataset = torch.randn(1000, 10)
    labels = torch.randn(1000, 1)

    # Training loop
    for epoch in range(config["epochs"]):
        model.train()
        optimizer.zero_grad()

        outputs = model(dataset)
        loss = criterion(outputs, labels)

        loss.backward()
        optimizer.step()

        # Report metrics
        train.report({"loss": loss.item(), "epoch": epoch})

# Configure distributed training
scaling_config = ScalingConfig(
    num_workers=4,              # Number of parallel workers
    use_gpu=True,               # Use GPUs
    resources_per_worker={
        "CPU": 2,
        "GPU": 1
    }
)

trainer = TorchTrainer(
    train_loop_per_worker=train_loop,
    train_loop_config={"lr": 0.001, "epochs": 10},
    scaling_config=scaling_config
)

result = trainer.fit()
print(f"Final loss: {result.metrics['loss']}")
```

## Running on a Cluster

Start a Ray cluster for distributed execution:

```bash
# On head node
ray start --head --port=6379

# On worker nodes
ray start --address='head-node-ip:6379'

# Check cluster status
ray status
```

Connect from Python:

```python
import ray

# Connect to existing cluster
ray.init(address="ray://head-node-ip:10001")

# Or use auto-detection in Kubernetes
ray.init(address="auto")

# Check cluster resources
print(ray.cluster_resources())
# {'CPU': 64.0, 'GPU': 8.0, 'memory': 128000000000.0, ...}
```

## Kubernetes Deployment with KubeRay

```yaml
# ray-cluster.yaml
apiVersion: ray.io/v1alpha1
kind: RayCluster
metadata:
  name: ml-cluster
spec:
  rayVersion: '2.9.0'
  headGroupSpec:
    rayStartParams:
      dashboard-host: '0.0.0.0'
    template:
      spec:
        containers:
          - name: ray-head
            image: rayproject/ray-ml:2.9.0-py310-gpu
            ports:
              - containerPort: 6379
                name: redis
              - containerPort: 8265
                name: dashboard
              - containerPort: 10001
                name: client
            resources:
              limits:
                cpu: "4"
                memory: "8Gi"
              requests:
                cpu: "2"
                memory: "4Gi"
  workerGroupSpecs:
    - replicas: 4
      minReplicas: 2
      maxReplicas: 10
      groupName: gpu-workers
      rayStartParams: {}
      template:
        spec:
          containers:
            - name: ray-worker
              image: rayproject/ray-ml:2.9.0-py310-gpu
              resources:
                limits:
                  cpu: "8"
                  memory: "16Gi"
                  nvidia.com/gpu: "1"
                requests:
                  cpu: "4"
                  memory: "8Gi"
                  nvidia.com/gpu: "1"
```

Deploy with kubectl:

```bash
# Install KubeRay operator
kubectl create -k "github.com/ray-project/kuberay/ray-operator/config/default"

# Deploy Ray cluster
kubectl apply -f ray-cluster.yaml

# Port-forward dashboard
kubectl port-forward svc/ml-cluster-head-svc 8265:8265
```

## Monitoring Ray

Access the Ray dashboard at `http://localhost:8265` for:
- Cluster resource utilization
- Task and actor status
- Memory usage
- Logs and errors

```python
# Programmatic metrics access
import ray

ray.init()

# Get cluster state
print(ray.cluster_resources())
print(ray.available_resources())

# Get node info
for node in ray.nodes():
    print(f"Node: {node['NodeID'][:8]}")
    print(f"  CPU: {node['Resources'].get('CPU', 0)}")
    print(f"  GPU: {node['Resources'].get('GPU', 0)}")
    print(f"  Memory: {node['Resources'].get('memory', 0) / 1e9:.1f} GB")
```

---

Ray brings distributed computing to Python without requiring you to learn complex frameworks like Spark or Dask. Start with the simple `@ray.remote` decorator, then explore Ray Tune, Ray Serve, and Ray Train as your ML infrastructure needs grow. The same code runs on your laptop and scales to thousands of nodes in production.

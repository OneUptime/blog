# How to Build an End-to-End MLOps Pipeline with Kubeflow Katib Hyperparameter Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeflow, Katib, Hyperparameter Tuning, MLOps

Description: Build complete MLOps pipelines with Kubeflow Katib for automated hyperparameter tuning, neural architecture search, and model optimization on Kubernetes.

---

Finding optimal hyperparameters can make or break a machine learning model's performance. Manual tuning is time-consuming and doesn't scale. Kubeflow Katib automates hyperparameter tuning using various optimization algorithms like Bayesian optimization, random search, and neural architecture search. Running on Kubernetes, it can parallelize experiments across multiple nodes for fast results.

This guide shows you how to set up Katib and build automated hyperparameter tuning pipelines.

## Installing Kubeflow Katib

Install Katib as part of Kubeflow or standalone:

```bash
# Install standalone Katib
kubectl apply -k "github.com/kubeflow/katib/manifests/v1beta1/installs/katib-standalone?ref=v0.16.0"

# Verify installation
kubectl get pods -n kubeflow

# Check CRDs
kubectl get crd | grep katib
# Should see: experiments.kubeflow.org, suggestions.kubeflow.org, trials.kubeflow.org
```

Access the Katib UI:

```bash
kubectl port-forward -n kubeflow svc/katib-ui 8080:80

# Open browser to http://localhost:8080/katib/
```

## Creating a Simple Hyperparameter Tuning Experiment

Create a training script that accepts hyperparameters:

```python
# train.py
import argparse
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import cross_val_score

def train(learning_rate, n_estimators, max_depth):
    # Generate dataset
    X, y = make_classification(n_samples=1000, n_features=20, random_state=42)

    # Create model
    model = RandomForestClassifier(
        n_estimators=int(n_estimators),
        max_depth=int(max_depth) if max_depth > 0 else None,
        random_state=42
    )

    # Cross-validation
    scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    accuracy = scores.mean()

    # Katib reads metrics from stdout
    print(f"accuracy={accuracy:.4f}")

    return accuracy

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--learning-rate", type=float, default=0.01)
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--max-depth", type=int, default=10)

    args = parser.parse_args()

    train(args.learning_rate, args.n_estimators, args.max_depth)
```

Package as a Docker image:

```dockerfile
# Dockerfile.katib-training
FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    scikit-learn==1.3.0 \
    numpy==1.24.0

COPY train.py /app/

ENTRYPOINT ["python", "/app/train.py"]
```

Build and push:

```bash
docker build -t your-registry/katib-training:v1 -f Dockerfile.katib-training .
docker push your-registry/katib-training:v1
```

## Defining a Katib Experiment

Create an Experiment manifest:

```yaml
# experiment-random-search.yaml
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: random-search-example
  namespace: kubeflow
spec:
  # Optimization objective
  objective:
    type: maximize
    goal: 0.99
    objectiveMetricName: accuracy

  # Search algorithm
  algorithm:
    algorithmName: random

  # Maximum number of trials
  maxTrialCount: 20
  maxFailedTrialCount: 3
  parallelTrialCount: 4

  # Hyperparameter search space
  parameters:
  - name: learning-rate
    parameterType: double
    feasibleSpace:
      min: "0.001"
      max: "0.1"

  - name: n-estimators
    parameterType: int
    feasibleSpace:
      min: "50"
      max: "200"

  - name: max-depth
    parameterType: int
    feasibleSpace:
      min: "5"
      max: "20"

  # Trial template
  trialTemplate:
    primaryContainerName: training
    trialParameters:
    - name: learningRate
      description: Learning rate
      reference: learning-rate
    - name: nEstimators
      description: Number of estimators
      reference: n-estimators
    - name: maxDepth
      description: Max tree depth
      reference: max-depth

    trialSpec:
      apiVersion: batch/v1
      kind: Job
      spec:
        template:
          spec:
            restartPolicy: Never
            containers:
            - name: training
              image: your-registry/katib-training:v1
              command:
              - python
              - /app/train.py
              - --learning-rate=${trialParameters.learningRate}
              - --n-estimators=${trialParameters.nEstimators}
              - --max-depth=${trialParameters.maxDepth}
              resources:
                requests:
                  cpu: "1"
                  memory: "2Gi"
                limits:
                  cpu: "2"
                  memory: "4Gi"
```

Deploy and monitor:

```bash
kubectl apply -f experiment-random-search.yaml

# Watch experiment progress
kubectl get experiment random-search-example -n kubeflow -w

# Get experiment details
kubectl describe experiment random-search-example -n kubeflow

# List all trials
kubectl get trials -n kubeflow -l experiment=random-search-example

# Check trial logs
kubectl logs -n kubeflow <trial-pod-name> -c training
```

## Using Bayesian Optimization

Create an experiment with Bayesian optimization for efficient search:

```yaml
# experiment-bayesian.yaml
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: bayesian-optimization
  namespace: kubeflow
spec:
  objective:
    type: maximize
    objectiveMetricName: accuracy

  # Bayesian optimization algorithm
  algorithm:
    algorithmName: bayesianoptimization
    algorithmSettings:
    - name: random_state
      value: "42"
    - name: acq_func
      value: "gp_hedge"
    - name: acq_optimizer
      value: "auto"
    - name: base_estimator
      value: "GP"
    - name: n_initial_points
      value: "10"

  maxTrialCount: 50
  parallelTrialCount: 5

  parameters:
  - name: learning-rate
    parameterType: double
    feasibleSpace:
      min: "0.0001"
      max: "0.1"

  - name: batch-size
    parameterType: int
    feasibleSpace:
      min: "16"
      max: "128"
      step: "16"

  - name: dropout-rate
    parameterType: double
    feasibleSpace:
      min: "0.1"
      max: "0.5"

  trialTemplate:
    # ... (same as before)
```

## Neural Architecture Search

Use Katib for NAS (Neural Architecture Search):

```yaml
# experiment-nas.yaml
apiVersion: kubeflow.org/v1beta1
kind: Experiment
metadata:
  name: neural-architecture-search
  namespace: kubeflow
spec:
  objective:
    type: maximize
    objectiveMetricName: accuracy
    additionalMetricNames:
    - loss
    - latency

  # ENAS algorithm
  algorithm:
    algorithmName: enas
    algorithmSettings:
    - name: controller_hidden_size
      value: "64"
    - name: controller_temperature
      value: "5.0"
    - name: controller_tanh_const
      value: "2.25"
    - name: controller_entropy_weight
      value: "0.0001"

  # Architecture search space
  nasConfig:
    graphConfig:
      numLayers: 8
    operations:
    - operationType: convolution
      parameters:
      - name: filter_size
        parameterType: categorical
        feasibleSpace:
          list: ["3", "5", "7"]
      - name: num_filter
        parameterType: categorical
        feasibleSpace:
          list: ["32", "48", "64", "96", "128"]
      - name: stride
        parameterType: categorical
        feasibleSpace:
          list: ["1", "2"]

    - operationType: reduction
      parameters:
      - name: reduction_type
        parameterType: categorical
        feasibleSpace:
          list: ["max_pooling", "avg_pooling"]

  maxTrialCount: 100
  parallelTrialCount: 10

  trialTemplate:
    # NAS training job template
```

## Early Stopping for Faster Experiments

Configure early stopping to terminate poor trials:

```yaml
spec:
  # Early stopping configuration
  earlyStopping:
    algorithmName: medianstop
    algorithmSettings:
    - name: min_trials_required
      value: "3"
    - name: start_step
      value: "5"

  # Emit metrics at multiple steps
  metricsCollectorSpec:
    collector:
      kind: StdOut
    source:
      filter:
        metricsFormat:
        - "([\\w|-]+)\\s*=\\s*([+-]?\\d*(\\.\\d+)?([Ee][+-]?\\d+)?)"
```

Update training script to emit intermediate metrics:

```python
# train_with_early_stopping.py
for epoch in range(num_epochs):
    # Training code
    train_loss = train_epoch(model, train_loader)
    val_accuracy = evaluate(model, val_loader)

    # Emit metrics for Katib (each epoch)
    print(f"epoch={epoch}")
    print(f"loss={train_loss:.4f}")
    print(f"accuracy={val_accuracy:.4f}")
```

## Hyperparameter Tuning for Deep Learning

Create a PyTorch training job with tunable hyperparameters:

```python
# train_pytorch.py
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

def train(args):
    # Model architecture based on hyperparameters
    model = nn.Sequential(
        nn.Linear(784, args.hidden_size),
        nn.ReLU(),
        nn.Dropout(args.dropout_rate),
        nn.Linear(args.hidden_size, args.hidden_size // 2),
        nn.ReLU(),
        nn.Dropout(args.dropout_rate),
        nn.Linear(args.hidden_size // 2, 10)
    )

    # Optimizer with tuned learning rate
    optimizer = optim.Adam(model.parameters(), lr=args.learning_rate)

    # Training loop
    for epoch in range(args.num_epochs):
        model.train()
        total_loss = 0

        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            output = model(batch_x)
            loss = nn.CrossEntropyLoss()(output, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        # Validation
        model.eval()
        correct = 0
        total = 0

        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                output = model(batch_x)
                pred = output.argmax(dim=1)
                correct += (pred == batch_y).sum().item()
                total += batch_y.size(0)

        accuracy = correct / total

        # Emit metrics
        print(f"epoch={epoch}")
        print(f"loss={total_loss:.4f}")
        print(f"accuracy={accuracy:.4f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--learning-rate", type=float, required=True)
    parser.add_argument("--batch-size", type=int, required=True)
    parser.add_argument("--hidden-size", type=int, required=True)
    parser.add_argument("--dropout-rate", type=float, required=True)
    parser.add_argument("--num-epochs", type=int, default=10)

    args = parser.parse_args()
    train(args)
```

## Monitoring Experiments with Prometheus

Query Katib metrics:

```promql
# Number of running experiments
katib_experiment_running_total

# Succeeded trials
katib_experiment_succeeded_trials_total

# Failed trials
katib_experiment_failed_trials_total

# Trial duration
katib_trial_duration_seconds
```

Create alerts:

```yaml
# katib-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: katib-alerts
  namespace: kubeflow
spec:
  groups:
  - name: katib
    rules:
    - alert: HighTrialFailureRate
      expr: rate(katib_experiment_failed_trials_total[10m]) > 0.3
      annotations:
        summary: "High trial failure rate detected"
```

## Integrating with ML Pipelines

Use Katib results in Kubeflow Pipelines:

```python
# pipeline_with_katib.py
from kfp import dsl
from kfp import components

@dsl.component
def run_katib_experiment() -> str:
    """Run Katib experiment and return best hyperparameters"""
    import kubernetes
    from kubernetes import client

    # Create Katib experiment
    # Wait for completion
    # Extract best trial hyperparameters
    return best_params

@dsl.component
def train_final_model(hyperparams: str):
    """Train final model with best hyperparameters"""
    # Use best hyperparameters for final training
    pass

@dsl.pipeline(name='HPO Pipeline')
def hpo_pipeline():
    katib_task = run_katib_experiment()
    train_task = train_final_model(katib_task.output)
```

## Conclusion

Kubeflow Katib provides a powerful platform for automated hyperparameter tuning on Kubernetes. With support for various optimization algorithms, early stopping, and parallel execution, it can significantly reduce the time needed to find optimal model configurations. The integration with Kubernetes makes it easy to scale experiments across multiple nodes, while the declarative API ensures reproducibility. By automating hyperparameter search, data scientists can focus on model architecture and feature engineering while Katib handles the optimization.

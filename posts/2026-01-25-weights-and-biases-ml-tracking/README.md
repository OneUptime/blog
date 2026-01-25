# How to Implement Weights & Biases for ML Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Weights & Biases, MLOps, Experiment Tracking, Machine Learning, Observability

Description: Learn how to use Weights & Biases for experiment tracking, model versioning, hyperparameter sweeps, and team collaboration in ML projects.

---

Experiment tracking becomes critical as ML projects grow. Weights & Biases (W&B) provides a hosted platform for tracking experiments, visualizing results, and collaborating with your team. It integrates with every major ML framework and requires minimal code changes.

## Why Weights & Biases?

W&B offers comprehensive ML tooling:

- Automatic logging of metrics, hyperparameters, and system stats
- Interactive dashboards for comparing experiments
- Model and dataset versioning
- Hyperparameter optimization with Sweeps
- Collaborative reports and workspaces
- Integration with all major ML frameworks

## Getting Started

Install the wandb package and authenticate:

```bash
# Install W&B
pip install wandb

# Login (opens browser for authentication)
wandb login

# Or set API key directly
export WANDB_API_KEY=your-api-key
```

## Basic Experiment Tracking

Add W&B to any training script with a few lines:

```python
import wandb
import random

# Initialize a new run
wandb.init(
    project="my-first-project",
    name="experiment-1",
    config={
        "learning_rate": 0.01,
        "epochs": 100,
        "batch_size": 32,
        "architecture": "CNN",
        "dataset": "CIFAR-10"
    }
)

# Access config throughout your code
config = wandb.config

# Simulated training loop
for epoch in range(config.epochs):
    # Simulated metrics
    train_loss = 1.0 / (epoch + 1) + random.uniform(-0.1, 0.1)
    val_loss = 1.2 / (epoch + 1) + random.uniform(-0.1, 0.1)
    accuracy = 0.5 + 0.4 * (epoch / config.epochs)

    # Log metrics - automatically creates charts
    wandb.log({
        "epoch": epoch,
        "train_loss": train_loss,
        "val_loss": val_loss,
        "accuracy": accuracy
    })

# Finish the run
wandb.finish()
```

## Integration with PyTorch

```python
import wandb
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# Initialize W&B
wandb.init(
    project="pytorch-demo",
    config={
        "learning_rate": 0.001,
        "epochs": 20,
        "batch_size": 64,
        "hidden_size": 128
    }
)

config = wandb.config

# Define model
class SimpleNet(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super().__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        return out

model = SimpleNet(784, config.hidden_size, 10)

# Watch model - logs gradients and parameters
wandb.watch(model, log="all", log_freq=100)

# Training setup
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=config.learning_rate)

# Create sample data
X_train = torch.randn(1000, 784)
y_train = torch.randint(0, 10, (1000,))
train_loader = DataLoader(
    TensorDataset(X_train, y_train),
    batch_size=config.batch_size,
    shuffle=True
)

# Training loop
for epoch in range(config.epochs):
    model.train()
    total_loss = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    avg_loss = total_loss / len(train_loader)

    # Log epoch metrics
    wandb.log({
        "epoch": epoch,
        "loss": avg_loss,
        "learning_rate": optimizer.param_groups[0]["lr"]
    })

# Save model artifact
torch.save(model.state_dict(), "model.pth")
artifact = wandb.Artifact("trained-model", type="model")
artifact.add_file("model.pth")
wandb.log_artifact(artifact)

wandb.finish()
```

## Integration with TensorFlow/Keras

```python
import wandb
from wandb.keras import WandbCallback
import tensorflow as tf
from tensorflow import keras

# Initialize W&B
wandb.init(
    project="keras-demo",
    config={
        "learning_rate": 0.001,
        "epochs": 10,
        "batch_size": 32
    }
)

config = wandb.config

# Build model
model = keras.Sequential([
    keras.layers.Dense(128, activation='relu', input_shape=(784,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=config.learning_rate),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# Load data
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 784).astype('float32') / 255.0
x_test = x_test.reshape(-1, 784).astype('float32') / 255.0

# Train with WandbCallback - automatically logs metrics and model
model.fit(
    x_train, y_train,
    epochs=config.epochs,
    batch_size=config.batch_size,
    validation_split=0.2,
    callbacks=[WandbCallback(save_model=True)]
)

# Evaluate
test_loss, test_acc = model.evaluate(x_test, y_test)
wandb.log({"test_loss": test_loss, "test_accuracy": test_acc})

wandb.finish()
```

## Logging Images, Tables, and Media

```python
import wandb
import numpy as np
from PIL import Image

wandb.init(project="media-logging")

# Log images
images = np.random.rand(10, 28, 28)
wandb.log({
    "examples": [wandb.Image(img, caption=f"Sample {i}") for i, img in enumerate(images)]
})

# Log with predictions
wandb.log({
    "predictions": wandb.Image(
        images[0],
        boxes={
            "predictions": {
                "box_data": [
                    {"position": {"minX": 0.1, "maxX": 0.5, "minY": 0.2, "maxY": 0.8},
                     "class_id": 1,
                     "scores": {"confidence": 0.95}}
                ],
                "class_labels": {1: "cat", 2: "dog"}
            }
        }
    )
})

# Log tables for data exploration
table = wandb.Table(
    columns=["id", "image", "prediction", "confidence"],
    data=[
        [1, wandb.Image(images[0]), "cat", 0.95],
        [2, wandb.Image(images[1]), "dog", 0.87],
    ]
)
wandb.log({"predictions_table": table})

# Log confusion matrix
wandb.log({
    "confusion_matrix": wandb.plot.confusion_matrix(
        y_true=[0, 0, 1, 1, 2, 2],
        preds=[0, 1, 1, 1, 2, 0],
        class_names=["cat", "dog", "bird"]
    )
})

# Log precision-recall curve
wandb.log({
    "pr_curve": wandb.plot.pr_curve(
        y_true=[0, 0, 1, 1],
        y_probas=[[0.9, 0.1], [0.6, 0.4], [0.2, 0.8], [0.1, 0.9]],
        labels=["negative", "positive"]
    )
})

wandb.finish()
```

## Hyperparameter Sweeps

Run automated hyperparameter optimization:

```python
import wandb

# Define sweep configuration
sweep_config = {
    "name": "hyperparameter-sweep",
    "method": "bayes",  # Options: grid, random, bayes
    "metric": {
        "name": "val_accuracy",
        "goal": "maximize"
    },
    "parameters": {
        "learning_rate": {
            "distribution": "log_uniform_values",
            "min": 1e-5,
            "max": 1e-1
        },
        "batch_size": {
            "values": [16, 32, 64, 128]
        },
        "hidden_size": {
            "distribution": "int_uniform",
            "min": 32,
            "max": 256
        },
        "dropout": {
            "distribution": "uniform",
            "min": 0.1,
            "max": 0.5
        },
        "optimizer": {
            "values": ["adam", "sgd", "rmsprop"]
        }
    },
    "early_terminate": {
        "type": "hyperband",
        "min_iter": 3
    }
}

# Create the sweep
sweep_id = wandb.sweep(sweep_config, project="sweep-demo")

def train():
    """Training function called by each sweep agent."""
    # Initialize run - config is set by sweep agent
    wandb.init()
    config = wandb.config

    # Build and train model with sweep config
    # (Model code from earlier examples)

    for epoch in range(20):
        # Simulated training with sweep parameters
        val_accuracy = 0.5 + 0.4 * (config.learning_rate * 100) * (epoch / 20)
        val_accuracy = min(val_accuracy, 0.95) + np.random.uniform(-0.02, 0.02)

        wandb.log({
            "epoch": epoch,
            "val_accuracy": val_accuracy,
            "val_loss": 1 - val_accuracy
        })

    wandb.finish()

# Run the sweep (locally)
wandb.agent(sweep_id, function=train, count=50)
```

## Model Registry

Version and manage models:

```python
import wandb
import torch

wandb.init(project="model-registry-demo")

# Train your model...
model = train_model()

# Save model locally
torch.save(model.state_dict(), "best_model.pth")

# Create artifact with metadata
artifact = wandb.Artifact(
    name="text-classifier",
    type="model",
    description="Text classification model trained on sentiment data",
    metadata={
        "accuracy": 0.92,
        "f1_score": 0.91,
        "framework": "pytorch",
        "architecture": "bert-base"
    }
)

# Add model file
artifact.add_file("best_model.pth")

# Log artifact
wandb.log_artifact(artifact)

# Link to model registry with aliases
wandb.run.link_artifact(
    artifact,
    "my-team/model-registry/text-classifier",
    aliases=["latest", "production"]
)

wandb.finish()

# Later: Load model from registry
run = wandb.init(project="inference")
artifact = run.use_artifact("my-team/model-registry/text-classifier:production")
artifact_dir = artifact.download()
model.load_state_dict(torch.load(f"{artifact_dir}/best_model.pth"))
```

## Dataset Versioning

Track datasets alongside experiments:

```python
import wandb
import pandas as pd

wandb.init(project="dataset-versioning")

# Create or load your dataset
df = pd.DataFrame({
    "text": ["sample 1", "sample 2", "sample 3"],
    "label": [0, 1, 1]
})
df.to_csv("training_data.csv", index=False)

# Create dataset artifact
dataset_artifact = wandb.Artifact(
    name="sentiment-dataset",
    type="dataset",
    description="Sentiment analysis training data",
    metadata={
        "num_samples": len(df),
        "num_classes": 2,
        "source": "internal-labeling"
    }
)

# Add data files
dataset_artifact.add_file("training_data.csv")

# Log and version the dataset
wandb.log_artifact(dataset_artifact)

# Reference dataset in training runs
run = wandb.init(project="training")
dataset = run.use_artifact("sentiment-dataset:latest")
data_dir = dataset.download()
# Training code uses data_dir/training_data.csv
```

## Team Collaboration

Create reports and share results:

```python
import wandb

# Create a report programmatically
api = wandb.Api()

# Get runs from a project
runs = api.runs("my-team/my-project")

# Filter and analyze
best_runs = [r for r in runs if r.summary.get("accuracy", 0) > 0.9]

for run in best_runs:
    print(f"Run: {run.name}")
    print(f"  Accuracy: {run.summary['accuracy']}")
    print(f"  Config: {run.config}")

# Export data for external analysis
import pandas as pd

data = []
for run in runs:
    data.append({
        "name": run.name,
        "accuracy": run.summary.get("accuracy"),
        "loss": run.summary.get("loss"),
        **run.config
    })

df = pd.DataFrame(data)
df.to_csv("experiment_results.csv", index=False)
```

## Alerts and Monitoring

Set up alerts for important events:

```python
import wandb

wandb.init(project="alerting-demo")

# Alert when training completes
wandb.alert(
    title="Training Complete",
    text="Model training finished with accuracy 0.95",
    level=wandb.AlertLevel.INFO
)

# Alert on errors
try:
    # Training code
    pass
except Exception as e:
    wandb.alert(
        title="Training Failed",
        text=f"Error: {str(e)}",
        level=wandb.AlertLevel.ERROR
    )
    raise

# Threshold-based alerts during training
for epoch in range(100):
    loss = train_epoch()
    wandb.log({"loss": loss})

    if loss > 10.0:
        wandb.alert(
            title="High Loss Detected",
            text=f"Loss spiked to {loss} at epoch {epoch}",
            level=wandb.AlertLevel.WARN
        )
```

---

Weights & Biases removes the friction from experiment tracking. The automatic logging and visualization let you focus on improving models rather than building infrastructure. Start with basic metric logging, then explore sweeps and artifacts as your projects mature.

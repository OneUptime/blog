# How to Manage ML Experiment Tracking with Vertex AI Experiments and TensorBoard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Machine Learning, Experiment Tracking, TensorBoard

Description: Learn how to track and compare ML experiments using Vertex AI Experiments integrated with TensorBoard for better model development workflows.

---

If you have ever trained dozens of models with different hyperparameters and lost track of which configuration produced the best results, you know exactly why experiment tracking matters. Vertex AI Experiments, paired with TensorBoard, gives you a structured way to log, compare, and visualize every training run without building your own tracking infrastructure.

This guide walks through setting up experiment tracking on Vertex AI, logging metrics and parameters, and using TensorBoard to make sense of it all.

## Why Experiment Tracking Matters

When you are iterating on a machine learning model, you might change the learning rate, switch optimizers, add dropout layers, or modify the training data. Without a systematic way to track these changes, you end up with a mess of notebooks and spreadsheets that tell you very little about what actually worked.

Vertex AI Experiments provides a managed service that logs parameters, metrics, and artifacts for each training run. TensorBoard integration lets you visualize training curves, compare runs side by side, and spot trends that would be invisible in raw numbers.

## Setting Up Vertex AI Experiments

Before you start logging experiments, make sure you have the Vertex AI SDK installed and your GCP project configured.

This snippet initializes the Vertex AI SDK and creates a new experiment:

```python
# Install the SDK if you haven't already
# pip install google-cloud-aiplatform

from google.cloud import aiplatform

# Initialize the SDK with your project and location
aiplatform.init(
    project="your-project-id",
    location="us-central1",
    experiment="fraud-detection-v2"  # Name your experiment
)
```

The experiment name groups all your related runs together. Pick something descriptive - you will be looking at this name months from now when you need to revisit your results.

## Logging Parameters and Metrics

Each training run within an experiment gets its own run name. You log parameters at the start and metrics as training progresses.

This code shows how to create a run and log both parameters and metrics:

```python
# Start a new experiment run
aiplatform.start_run("run-lr-001-dropout-03")

# Log the hyperparameters for this run
aiplatform.log_params({
    "learning_rate": 0.001,
    "dropout_rate": 0.3,
    "batch_size": 64,
    "optimizer": "adam",
    "epochs": 50,
    "hidden_units": 256
})

# Train your model (simplified example)
for epoch in range(50):
    train_loss, train_acc = train_one_epoch(model, train_loader)
    val_loss, val_acc = evaluate(model, val_loader)

    # Log metrics at each step
    aiplatform.log_metrics({
        "train_loss": train_loss,
        "train_accuracy": train_acc,
        "val_loss": val_loss,
        "val_accuracy": val_acc
    })

# Log final summary metrics
aiplatform.log_metrics({
    "final_val_accuracy": val_acc,
    "final_val_loss": val_loss,
    "best_epoch": best_epoch
})

# End the run
aiplatform.end_run()
```

You can also log time series metrics that show how values change over training steps, which is especially useful for loss curves and learning rate schedules.

## Logging Time Series Metrics

For metrics that change over time, use the time series logging API. This is what feeds the TensorBoard visualizations.

Here is how to log time series data during training:

```python
from google.cloud import aiplatform

aiplatform.start_run("run-lr-0005-scheduler")

aiplatform.log_params({
    "learning_rate": 0.0005,
    "scheduler": "cosine_annealing",
    "warmup_steps": 1000
})

for step in range(total_steps):
    loss = train_step(model, batch)

    # Log time series metrics every 100 steps
    if step % 100 == 0:
        aiplatform.log_time_series_metrics({
            "training_loss": loss,
            "learning_rate": get_current_lr(optimizer)
        }, step=step)

aiplatform.end_run()
```

## Integrating TensorBoard

Vertex AI provides a managed TensorBoard instance that you can create and attach to your experiments. This removes the hassle of running your own TensorBoard server.

This code creates a TensorBoard instance and links it to your experiment:

```python
from google.cloud import aiplatform

# Create a managed TensorBoard instance
tb_instance = aiplatform.Tensorboard.create(
    display_name="fraud-detection-tensorboard",
    project="your-project-id",
    location="us-central1"
)

# Initialize with the TensorBoard instance
aiplatform.init(
    project="your-project-id",
    location="us-central1",
    experiment="fraud-detection-v2",
    experiment_tensorboard=tb_instance
)

print(f"TensorBoard resource: {tb_instance.resource_name}")
```

Once your experiments have logged data, you can open the TensorBoard UI directly from the Vertex AI console. Navigate to the Experiments section, select your experiment, and click "Open TensorBoard" to view the interactive dashboards.

## Comparing Experiment Runs

One of the most valuable features is the ability to compare runs programmatically. You can pull all runs from an experiment and analyze them in a DataFrame.

This code retrieves all runs and sorts them by validation accuracy:

```python
import pandas as pd
from google.cloud import aiplatform

# Get the experiment
experiment = aiplatform.Experiment("fraud-detection-v2")

# Pull all runs as a DataFrame
experiment_df = aiplatform.get_experiment_df("fraud-detection-v2")

# Sort by validation accuracy to find the best run
best_runs = experiment_df.sort_values(
    "metric.final_val_accuracy",
    ascending=False
)

# Display the top 5 runs with their parameters
print(best_runs[[
    "run_name",
    "param.learning_rate",
    "param.dropout_rate",
    "param.optimizer",
    "metric.final_val_accuracy",
    "metric.final_val_loss"
]].head())
```

This gives you a clear picture of which hyperparameter combinations performed best, without manually checking each run.

## Logging Artifacts and Model Metadata

Beyond parameters and metrics, you can attach artifacts like model files, datasets, and evaluation reports to your experiment runs.

Here is an example of logging artifacts alongside your training run:

```python
aiplatform.start_run("run-best-config")

# Log the dataset metadata
aiplatform.log_params({
    "dataset_version": "v2.3",
    "train_samples": 50000,
    "val_samples": 10000,
    "feature_count": 42
})

# After training, log the model artifact
model_artifact = aiplatform.Artifact.create(
    schema_title="system.Model",
    display_name="fraud-detector-best",
    uri="gs://your-bucket/models/fraud-detector-best/"
)

# Associate the artifact with the current run
aiplatform.log(model_artifact)

aiplatform.end_run()
```

## Using Experiment Context in Training Jobs

When running training jobs on Vertex AI, you can pass the experiment context so that the job automatically logs to the right experiment.

This shows how to submit a custom training job with experiment tracking:

```python
from google.cloud import aiplatform

# Create a custom training job
job = aiplatform.CustomJob(
    display_name="fraud-detection-training",
    worker_pool_specs=[{
        "machine_spec": {
            "machine_type": "n1-standard-8",
            "accelerator_type": "NVIDIA_TESLA_T4",
            "accelerator_count": 1
        },
        "replica_count": 1,
        "container_spec": {
            "image_uri": "us-docker.pkg.dev/your-project/training/fraud-model:latest",
            "args": ["--epochs=50", "--lr=0.001"]
        }
    }]
)

# Run the job within an experiment context
job.run(
    experiment="fraud-detection-v2",
    experiment_run="training-job-run-001"
)
```

## Best Practices for Experiment Tracking

Through working with Vertex AI Experiments on production ML projects, a few patterns have proven helpful.

First, name your experiments by the problem you are solving, not the model architecture. "fraud-detection-v2" is more useful than "transformer-model-3" because you might switch architectures while still working on the same problem.

Second, log everything you think you might need later. Storage is cheap, but re-running experiments is expensive. Log not just the obvious hyperparameters, but also data preprocessing choices, feature selection decisions, and random seeds.

Third, use consistent parameter names across runs. If one run logs "lr" and another logs "learning_rate", your comparison DataFrames will have separate columns and the comparison becomes harder.

Fourth, tag your runs with metadata that helps future filtering. Add tags like "baseline", "production-candidate", or "ablation-study" so you can quickly find the runs you care about.

Finally, clean up TensorBoard instances you no longer need. Each managed TensorBoard instance incurs costs, so delete old ones after you have extracted the insights you need.

Vertex AI Experiments and TensorBoard together give you a complete experiment tracking solution that scales with your team and your model complexity. The managed infrastructure means you spend your time on modeling, not on maintaining tracking servers.

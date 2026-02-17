# How to Compare ML Experiment Runs Side-by-Side Using Vertex AI Experiments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Experiments, MLOps, Experiment Tracking

Description: Learn how to use Vertex AI Experiments to track, compare, and analyze multiple ML training runs side-by-side with code examples.

---

When you are iterating on a machine learning model, you quickly accumulate dozens of training runs with different hyperparameters, data preprocessing steps, and architecture changes. Without a systematic way to compare them, you end up with a mess of spreadsheets and notebook cells trying to remember which configuration produced the best results. Vertex AI Experiments provides a structured way to log, compare, and analyze your runs so you can make informed decisions about which approach to pursue.

## What Vertex AI Experiments Offers

Vertex AI Experiments is separate from Vertex AI TensorBoard. While TensorBoard focuses on real-time training visualization (loss curves, histograms), Experiments is about tracking and comparing the high-level metadata across runs: parameters used, metrics achieved, artifacts produced, and how they relate to each other.

Think of it this way: TensorBoard shows you the journey of a single training run. Experiments shows you the destination of many runs side by side.

## Setting Up an Experiment

Start by creating an experiment. An experiment groups related runs together:

```python
# create_experiment.py
# Set up a Vertex AI Experiment to track training runs

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    experiment='churn-model-experiments',
    experiment_description='Comparing different approaches for the customer churn prediction model',
)

print("Experiment created and initialized")
```

## Logging a Run

Each training attempt becomes a run within the experiment. You log parameters, metrics, and artifacts for each run:

```python
# log_run.py
# Log a training run to Vertex AI Experiments

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    experiment='churn-model-experiments',
)

# Start a new run
with aiplatform.start_run('run-random-forest-v1') as run:
    # Log the parameters you used for this run
    run.log_params({
        'model_type': 'random_forest',
        'n_estimators': 200,
        'max_depth': 15,
        'min_samples_split': 5,
        'feature_set': 'v2',
        'training_data_size': 50000,
        'preprocessing': 'standard_scaler',
    })

    # ... your training code here ...
    # After training, log the results

    # Log metrics
    run.log_metrics({
        'accuracy': 0.8745,
        'f1_score': 0.8621,
        'precision': 0.8890,
        'recall': 0.8367,
        'auc_roc': 0.9234,
        'training_time_seconds': 142.5,
    })

    # Log time series metrics (metrics that change over iterations)
    for epoch in range(10):
        run.log_time_series_metrics(
            {'train_loss': 0.5 - (epoch * 0.04), 'val_loss': 0.55 - (epoch * 0.035)},
            step=epoch,
        )

    print("Run logged successfully")
```

## Logging Multiple Runs for Comparison

To make comparisons meaningful, log several runs with different configurations:

```python
# multiple_runs.py
# Log multiple training runs for comparison

from google.cloud import aiplatform
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
import time

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    experiment='churn-model-experiments',
)

# Assume X and y are your features and labels
# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Define configurations to compare
configs = [
    {
        'run_name': 'logistic-regression-baseline',
        'model_type': 'logistic_regression',
        'params': {'C': 1.0, 'max_iter': 1000},
    },
    {
        'run_name': 'random-forest-default',
        'model_type': 'random_forest',
        'params': {'n_estimators': 100, 'max_depth': 10},
    },
    {
        'run_name': 'random-forest-tuned',
        'model_type': 'random_forest',
        'params': {'n_estimators': 300, 'max_depth': 20, 'min_samples_split': 5},
    },
    {
        'run_name': 'gradient-boosting-v1',
        'model_type': 'gradient_boosting',
        'params': {'n_estimators': 200, 'max_depth': 5, 'learning_rate': 0.1},
    },
]

for config in configs:
    with aiplatform.start_run(config['run_name']) as run:
        # Log parameters
        run.log_params({
            'model_type': config['model_type'],
            **config['params'],
        })

        start_time = time.time()

        # Train the model (simplified example)
        if config['model_type'] == 'logistic_regression':
            model = LogisticRegression(**config['params'])
        elif config['model_type'] == 'random_forest':
            model = RandomForestClassifier(**config['params'])
        elif config['model_type'] == 'gradient_boosting':
            model = GradientBoostingClassifier(**config['params'])

        model.fit(X_train, y_train)
        predictions = model.predict(X_test)
        probabilities = model.predict_proba(X_test)[:, 1]

        training_time = time.time() - start_time

        # Log metrics
        run.log_metrics({
            'accuracy': accuracy_score(y_test, predictions),
            'f1_score': f1_score(y_test, predictions),
            'auc_roc': roc_auc_score(y_test, probabilities),
            'training_time_seconds': training_time,
        })

        print(f"Logged run: {config['run_name']}")
```

## Retrieving and Comparing Runs

After logging several runs, you can retrieve them and compare:

```python
# compare_runs.py
# Retrieve and compare experiment runs

from google.cloud import aiplatform
import pandas as pd

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the experiment
experiment = aiplatform.Experiment('churn-model-experiments')

# Get all runs as a dataframe for easy comparison
experiment_df = aiplatform.get_experiment_df('churn-model-experiments')

# Display the comparison table
print("\nExperiment Comparison:")
print(experiment_df[['run_name', 'param.model_type', 'param.n_estimators',
                      'metric.accuracy', 'metric.f1_score', 'metric.auc_roc',
                      'metric.training_time_seconds']].to_string())

# Find the best run by AUC-ROC
best_run = experiment_df.loc[experiment_df['metric.auc_roc'].idxmax()]
print(f"\nBest run by AUC-ROC: {best_run['run_name']}")
print(f"  AUC-ROC: {best_run['metric.auc_roc']:.4f}")
print(f"  Accuracy: {best_run['metric.accuracy']:.4f}")
```

## Filtering and Sorting Runs

When you have many runs, filtering helps you find what you need:

```python
# filter_runs.py
# Filter and analyze experiment runs

from google.cloud import aiplatform
import pandas as pd

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

experiment_df = aiplatform.get_experiment_df('churn-model-experiments')

# Filter to only Random Forest runs
rf_runs = experiment_df[experiment_df['param.model_type'] == 'random_forest']
print("Random Forest runs:")
print(rf_runs[['run_name', 'param.n_estimators', 'param.max_depth',
               'metric.accuracy', 'metric.f1_score']].to_string())

# Sort by accuracy (descending)
sorted_runs = experiment_df.sort_values('metric.accuracy', ascending=False)
print("\nAll runs sorted by accuracy:")
print(sorted_runs[['run_name', 'metric.accuracy']].to_string())

# Find runs with accuracy above a threshold
good_runs = experiment_df[experiment_df['metric.accuracy'] > 0.85]
print(f"\nRuns with accuracy > 0.85: {len(good_runs)}")
```

## Integrating with Training Jobs

You can automatically log Vertex AI training jobs as experiment runs:

```python
# training_job_experiment.py
# Run a Vertex AI training job as an experiment run

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    experiment='churn-model-experiments',
)

job = aiplatform.CustomTrainingJob(
    display_name='churn-training-job',
    script_path='trainer/task.py',
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-14:latest',
)

# Run the training job as an experiment run
with aiplatform.start_run('vertex-training-run-001') as run:
    # Log the configuration
    run.log_params({
        'epochs': 30,
        'learning_rate': 0.001,
        'batch_size': 128,
        'model_architecture': 'cnn_v2',
    })

    model = job.run(
        machine_type='n1-standard-4',
        args=['--epochs', '30', '--learning-rate', '0.001', '--batch-size', '128'],
        model_display_name='churn-cnn-v2',
    )

    # Log the resulting metrics after training completes
    run.log_metrics({
        'final_accuracy': 0.91,
        'final_loss': 0.24,
    })
```

## Visualizing Comparisons

While the Cloud Console provides built-in visualizations, you can also create your own:

```python
# visualize_comparisons.py
# Create comparison visualizations from experiment data

from google.cloud import aiplatform
import pandas as pd
import matplotlib.pyplot as plt

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

df = aiplatform.get_experiment_df('churn-model-experiments')

# Create a bar chart comparing model accuracy
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Accuracy comparison
axes[0].barh(df['run_name'], df['metric.accuracy'])
axes[0].set_xlabel('Accuracy')
axes[0].set_title('Model Accuracy Comparison')

# Training time comparison
axes[1].barh(df['run_name'], df['metric.training_time_seconds'])
axes[1].set_xlabel('Training Time (seconds)')
axes[1].set_title('Training Time Comparison')

plt.tight_layout()
plt.savefig('experiment_comparison.png')
print("Comparison chart saved")
```

## Deleting Experiment Runs

Clean up runs you no longer need:

```python
# Delete a specific run
experiment_run = aiplatform.ExperimentRun(
    run_name='old-run-to-delete',
    experiment='churn-model-experiments',
)
experiment_run.delete()

# Delete an entire experiment
experiment = aiplatform.Experiment('old-experiment')
experiment.delete()
```

## Best Practices

Log everything that might be relevant. It costs almost nothing to store experiment metadata, and you never know which parameter will turn out to be important.

Use consistent parameter names across runs. If one run logs 'lr' and another logs 'learning_rate', comparison becomes harder.

Include data versioning information in your parameters. Log the dataset version, preprocessing steps, and feature set used so you can reproduce results.

Run your baseline first. Before trying fancy approaches, log a simple baseline model. This gives you a reference point for evaluating improvements.

## Wrapping Up

Vertex AI Experiments turns your ad-hoc model iteration into a structured, comparable process. By logging parameters and metrics for every run, you build a record of what works and what does not. The comparison features - DataFrames, filtering, sorting - make it easy to find your best model configuration and understand why it works better than alternatives. Start tracking early, even for exploratory work, and you will save yourself a lot of repeated effort.

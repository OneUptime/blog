# How to Create a Hyperparameter Tuning Job in Vertex AI with Bayesian Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Hyperparameter Tuning, Bayesian Optimization, Machine Learning

Description: Learn how to create hyperparameter tuning jobs in Vertex AI using Bayesian optimization to efficiently find the best model configuration.

---

Choosing the right hyperparameters for your model - learning rate, number of layers, batch size, regularization strength - can make the difference between a mediocre model and a great one. But testing every possible combination manually is impossibly slow. Vertex AI hyperparameter tuning automates this search using Bayesian optimization, which intelligently picks the next set of hyperparameters to try based on results from previous trials. This is much more efficient than random search or grid search.

## How Bayesian Optimization Works

Traditional grid search tries every combination. Random search picks random combinations. Bayesian optimization is smarter. It builds a probabilistic model of how hyperparameters relate to model performance and uses that model to decide which combinations to try next. It balances exploration (trying new regions of the search space) with exploitation (focusing on regions that have shown good results).

This means you typically find good hyperparameters with far fewer trials than random or grid search.

## Writing a Tuning-Ready Training Script

Your training script needs to accept hyperparameters as command-line arguments and report the metric you want to optimize. Vertex AI uses a special library called `cloudml-hypertune` to report metrics back.

Here is a training script set up for hyperparameter tuning:

```python
# trainer/task.py
# Training script with hyperparameter tuning support

import argparse
import os
import hypertune
import tensorflow as tf

def get_args():
    """Parse hyperparameters from command-line arguments."""
    parser = argparse.ArgumentParser()
    parser.add_argument('--learning-rate', type=float, default=0.001)
    parser.add_argument('--num-units', type=int, default=128)
    parser.add_argument('--dropout-rate', type=float, default=0.2)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--model-dir', type=str,
                        default=os.environ.get('AIP_MODEL_DIR', '/tmp/model'))
    return parser.parse_args()

def build_model(learning_rate, num_units, dropout_rate):
    """Build a model with the given hyperparameters."""
    model = tf.keras.Sequential([
        tf.keras.layers.Flatten(input_shape=(28, 28)),
        tf.keras.layers.Dense(num_units, activation='relu'),
        tf.keras.layers.Dropout(dropout_rate),
        tf.keras.layers.Dense(num_units // 2, activation='relu'),
        tf.keras.layers.Dropout(dropout_rate),
        tf.keras.layers.Dense(10, activation='softmax')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    return model

def main():
    args = get_args()

    # Load data
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.fashion_mnist.load_data()
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0

    # Build and train the model with the provided hyperparameters
    model = build_model(args.learning_rate, args.num_units, args.dropout_rate)

    history = model.fit(
        x_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_data=(x_test, y_test),
        verbose=1
    )

    # Get the final validation accuracy
    val_accuracy = history.history['val_accuracy'][-1]
    print(f"Validation accuracy: {val_accuracy:.4f}")

    # Report the metric to Vertex AI using hypertune
    hpt = hypertune.HyperTune()
    hpt.report_hyperparameter_tuning_metric(
        hyperparameter_metric_tag='accuracy',
        metric_value=val_accuracy,
        global_step=args.epochs,
    )

    # Save the model
    model.save(args.model_dir)

if __name__ == '__main__':
    main()
```

Make sure `cloudml-hypertune` is installed in your training environment:

```bash
# Install the hypertune library
pip install cloudml-hypertune
```

## Creating the Hyperparameter Tuning Job

Now define the search space and create the tuning job:

```python
# create_hp_tuning_job.py
# Create a hyperparameter tuning job with Bayesian optimization

from google.cloud import aiplatform
from google.cloud.aiplatform import hyperparameter_tuning as hpt

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-staging-bucket',
)

# Define the custom training job
custom_job = aiplatform.CustomJob(
    display_name='hp-tuning-training',
    worker_pool_specs=[{
        'machine_spec': {
            'machine_type': 'n1-standard-4',
            'accelerator_type': 'NVIDIA_TESLA_T4',
            'accelerator_count': 1,
        },
        'replica_count': 1,
        'python_package_spec': {
            'executor_image_uri': 'us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
            'package_uris': ['gs://your-bucket/training/trainer-0.1.tar.gz'],
            'python_module': 'trainer.task',
            'args': ['--epochs', '20'],
        },
    }],
)

# Create the hyperparameter tuning job
hp_job = aiplatform.HyperparameterTuningJob(
    display_name='bayesian-hp-tuning',
    custom_job=custom_job,
    # The metric to optimize
    metric_spec={'accuracy': 'maximize'},
    # Define the hyperparameter search space
    parameter_spec={
        'learning-rate': hpt.DoubleParameterSpec(
            min=0.0001, max=0.01, scale='log'
        ),
        'num-units': hpt.DiscreteParameterSpec(
            values=[64, 128, 256, 512], scale='unspecified'
        ),
        'dropout-rate': hpt.DoubleParameterSpec(
            min=0.1, max=0.5, scale='linear'
        ),
        'batch-size': hpt.DiscreteParameterSpec(
            values=[32, 64, 128, 256], scale='unspecified'
        ),
    },
    # Total number of trials to run
    max_trial_count=30,
    # Number of trials to run in parallel
    parallel_trial_count=3,
    # Use Bayesian optimization (this is the default search algorithm)
    search_algorithm=None,  # None defaults to Bayesian optimization
)

# Run the tuning job
hp_job.run()

print("Hyperparameter tuning job completed")
```

## Understanding the Parameter Spec Types

Vertex AI supports several types of parameter specifications:

```python
from google.cloud.aiplatform import hyperparameter_tuning as hpt

# Continuous parameter with logarithmic scale
# Good for learning rates that span orders of magnitude
learning_rate = hpt.DoubleParameterSpec(
    min=0.00001, max=0.1, scale='log'
)

# Continuous parameter with linear scale
# Good for parameters with a small, linear range
dropout = hpt.DoubleParameterSpec(
    min=0.0, max=0.5, scale='linear'
)

# Integer parameter
# Good for things like number of layers
num_layers = hpt.IntegerParameterSpec(
    min=1, max=10, scale='linear'
)

# Discrete parameter
# Good for categorical choices or specific values
batch_size = hpt.DiscreteParameterSpec(
    values=[16, 32, 64, 128, 256], scale='unspecified'
)

# Categorical parameter
# Good for string choices like optimizer type
optimizer = hpt.CategoricalParameterSpec(
    values=['adam', 'sgd', 'rmsprop']
)
```

The scale parameter matters a lot. Use 'log' scale for parameters like learning rate that span several orders of magnitude. Use 'linear' for parameters with a narrow range.

## Retrieving the Best Hyperparameters

After the tuning job completes, you can retrieve the results:

```python
# get_results.py
# Retrieve the best hyperparameters from a completed tuning job

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the tuning job
hp_job = aiplatform.HyperparameterTuningJob(
    'projects/your-project-id/locations/us-central1/hyperparameterTuningJobs/JOB_ID'
)

# Get all trials sorted by metric
trials = hp_job.trials

# Find the best trial
best_trial = None
best_accuracy = 0

for trial in trials:
    # Each trial has parameters and metrics
    accuracy = trial.final_measurement.metrics[0].value
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        best_trial = trial

print(f"Best trial ID: {best_trial.id}")
print(f"Best accuracy: {best_accuracy:.4f}")
print("Best hyperparameters:")
for param in best_trial.parameters:
    print(f"  {param.parameter_id}: {param.value}")
```

## Configuring Trial Parallelism

The `parallel_trial_count` parameter controls how many trials run simultaneously. More parallel trials means faster completion, but it can reduce the effectiveness of Bayesian optimization because each parallel trial cannot benefit from the results of other currently-running trials.

A good rule of thumb:

- For small search spaces (less than 5 parameters): 2-3 parallel trials
- For large search spaces (5+ parameters): 3-5 parallel trials
- Never set parallel trials higher than about one-third of total trials

```python
# Balance between speed and optimization quality
hp_job = aiplatform.HyperparameterTuningJob(
    display_name='balanced-tuning',
    custom_job=custom_job,
    metric_spec={'accuracy': 'maximize'},
    parameter_spec=parameter_spec,
    max_trial_count=50,
    # Run 5 trials at a time - good balance for 50 total trials
    parallel_trial_count=5,
)
```

## Early Stopping

You can enable early stopping to terminate trials that are not performing well, saving compute time and money:

```python
# In your training script, report metrics at regular intervals
# Vertex AI can stop trials that are performing poorly

hpt = hypertune.HyperTune()

for epoch in range(args.epochs):
    # Train for one epoch
    history = model.fit(x_train, y_train, epochs=1, validation_data=(x_test, y_test))

    val_acc = history.history['val_accuracy'][0]

    # Report metric after each epoch so Vertex AI can evaluate early stopping
    hpt.report_hyperparameter_tuning_metric(
        hyperparameter_metric_tag='accuracy',
        metric_value=val_acc,
        global_step=epoch + 1,
    )
```

## Cost Tips

Hyperparameter tuning can get expensive quickly. Each trial is a separate training job. To control costs:

- Start with a smaller max_trial_count (15-20) to get a sense of the search space
- Use smaller datasets or fewer epochs for the tuning phase, then train the final model with full data
- Use preemptible machines for tuning trials when possible
- Set reasonable ranges for your parameters to avoid wasting trials on obviously bad values

## Wrapping Up

Hyperparameter tuning with Bayesian optimization in Vertex AI takes the guesswork out of model configuration. Define your search space, set the metric to optimize, and let the system intelligently explore combinations. The key is writing a tuning-ready training script that reports metrics properly and choosing sensible parameter ranges. Start with a small number of trials to understand your search space, then scale up for the final tuning run.

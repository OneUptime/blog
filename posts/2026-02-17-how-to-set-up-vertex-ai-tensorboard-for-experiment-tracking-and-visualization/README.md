# How to Set Up Vertex AI TensorBoard for Experiment Tracking and Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, TensorBoard, Experiment Tracking, Machine Learning

Description: Learn how to set up Vertex AI TensorBoard to track training metrics, visualize experiments, and compare model performance across runs.

---

When you are training models, you need visibility into what is happening during training. Is the loss decreasing? Is the model overfitting? How does this run compare to the last one? TensorBoard has been the go-to tool for this in the TensorFlow ecosystem, and Vertex AI TensorBoard takes it a step further by hosting it as a managed service. You get persistent experiment tracking, team collaboration, and integration with Vertex AI training jobs without running your own TensorBoard server.

## Creating a Vertex AI TensorBoard Instance

First, you need to create a TensorBoard instance. This is a persistent resource that stores your experiment data:

```python
# create_tensorboard.py
# Create a Vertex AI TensorBoard instance

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the TensorBoard instance
tensorboard = aiplatform.Tensorboard.create(
    display_name='ml-experiments-tensorboard',
    description='TensorBoard for tracking ML training experiments',
)

print(f"TensorBoard created: {tensorboard.resource_name}")
print(f"TensorBoard ID: {tensorboard.name}")
```

You can also create one with gcloud:

```bash
# Create a TensorBoard instance using gcloud
gcloud ai tensorboards create \
  --display-name=ml-experiments-tensorboard \
  --region=us-central1
```

## Writing TensorBoard Logs in Your Training Script

Your training script needs to write TensorBoard logs. Vertex AI provides an environment variable `AIP_TENSORBOARD_LOG_DIR` that points to the GCS location where logs should be written.

Here is a TensorFlow training script with TensorBoard logging:

```python
# trainer/task.py
# Training script with TensorBoard logging for Vertex AI

import os
import argparse
import tensorflow as tf

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--learning-rate', type=float, default=0.001)
    return parser.parse_args()

def main():
    args = get_args()

    # Get the TensorBoard log directory from the environment
    # Vertex AI sets this automatically when a TensorBoard instance is linked
    log_dir = os.environ.get('AIP_TENSORBOARD_LOG_DIR', '/tmp/tb-logs')
    print(f"TensorBoard log directory: {log_dir}")

    # Load dataset
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.fashion_mnist.load_data()
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0

    # Build model
    model = tf.keras.Sequential([
        tf.keras.layers.Flatten(input_shape=(28, 28)),
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dense(10, activation='softmax')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=args.learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    # Set up TensorBoard callback to write logs
    tensorboard_callback = tf.keras.callbacks.TensorBoard(
        log_dir=log_dir,
        histogram_freq=1,  # Log weight histograms every epoch
        write_graph=True,   # Log the model graph
        update_freq='epoch', # Log metrics every epoch
    )

    # Train with the TensorBoard callback
    model.fit(
        x_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_data=(x_test, y_test),
        callbacks=[tensorboard_callback],
        verbose=1,
    )

    # Save the model
    model_dir = os.environ.get('AIP_MODEL_DIR', '/tmp/model')
    model.save(model_dir)

if __name__ == '__main__':
    main()
```

## Running a Training Job with TensorBoard Integration

When you submit a training job, link it to your TensorBoard instance:

```python
# run_training_with_tb.py
# Run a training job linked to Vertex AI TensorBoard

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-staging-bucket',
)

# Create the training job
job = aiplatform.CustomTrainingJob(
    display_name='fashion-mnist-experiment',
    script_path='trainer/task.py',
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-14:latest',
)

# Run with TensorBoard linked
model = job.run(
    machine_type='n1-standard-4',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    args=['--epochs', '30', '--learning-rate', '0.001'],
    model_display_name='fashion-mnist-model',
    # Link to TensorBoard instance
    tensorboard='projects/your-project-id/locations/us-central1/tensorboards/TB_ID',
    # Where to write service account info for TensorBoard
    service_account='your-sa@your-project-id.iam.gserviceaccount.com',
)

print(f"Training complete. Model: {model.resource_name}")
```

## Custom Metric Logging

Beyond the built-in Keras callback, you can log custom metrics using tf.summary:

```python
# custom_logging.py
# Log custom metrics to TensorBoard during training

import os
import tensorflow as tf

log_dir = os.environ.get('AIP_TENSORBOARD_LOG_DIR', '/tmp/tb-logs')

# Create a summary writer
writer = tf.summary.create_file_writer(log_dir)

# Log custom scalar metrics
with writer.as_default():
    for step in range(100):
        # Log training metrics
        tf.summary.scalar('custom/learning_rate', 0.001 * (0.95 ** step), step=step)
        tf.summary.scalar('custom/gpu_utilization', 75.5, step=step)

        # Log distribution data
        tf.summary.histogram('custom/weights', tf.random.normal([100]), step=step)

        # Log text data
        if step % 10 == 0:
            tf.summary.text('custom/notes',
                           f'Step {step}: Training progressing normally', step=step)

    writer.flush()
```

## Logging with PyTorch

If you are using PyTorch, you can use the `torch.utils.tensorboard` module:

```python
# pytorch_tb_logging.py
# TensorBoard logging for PyTorch training

import os
from torch.utils.tensorboard import SummaryWriter

# Point to the Vertex AI TensorBoard log directory
log_dir = os.environ.get('AIP_TENSORBOARD_LOG_DIR', '/tmp/tb-logs')
writer = SummaryWriter(log_dir)

# During training loop
for epoch in range(num_epochs):
    # ... training code ...
    train_loss = compute_training_loss()
    val_loss = compute_validation_loss()
    val_accuracy = compute_validation_accuracy()

    # Log scalar metrics
    writer.add_scalar('Loss/train', train_loss, epoch)
    writer.add_scalar('Loss/validation', val_loss, epoch)
    writer.add_scalar('Accuracy/validation', val_accuracy, epoch)

    # Log model parameters as histograms
    for name, param in model.named_parameters():
        writer.add_histogram(f'Parameters/{name}', param.data, epoch)

# Always close the writer when done
writer.close()
```

## Viewing Your Experiments

You can open TensorBoard from the Google Cloud Console or get the URL programmatically:

```python
# open_tensorboard.py
# Get the URL for the Vertex AI TensorBoard web interface

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

tensorboard = aiplatform.Tensorboard(
    'projects/your-project-id/locations/us-central1/tensorboards/TB_ID'
)

print(f"TensorBoard URL: https://us-central1.tensorboard.googleusercontent.com/experiment/{tensorboard.resource_name}")
```

Or use gcloud:

```bash
# Get the TensorBoard instance details
gcloud ai tensorboards describe TB_ID --region=us-central1
```

## Uploading Existing TensorBoard Logs

If you have TensorBoard logs from local training runs, you can upload them to Vertex AI TensorBoard:

```python
# upload_logs.py
# Upload existing TensorBoard logs to Vertex AI

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create an experiment within the TensorBoard instance
experiment = aiplatform.TensorboardExperiment.create(
    tensorboard_experiment_id='local-experiment-001',
    tensorboard_name='projects/your-project-id/locations/us-central1/tensorboards/TB_ID',
    display_name='Local Training Experiment',
)

# Upload time series data
aiplatform.upload_tb_log(
    tensorboard_id='TB_ID',
    tensorboard_experiment_name='local-experiment-001',
    logdir='./local-tb-logs/',
)
```

## Organizing Experiments

Use a consistent naming scheme for your experiments. The hierarchy is:

- TensorBoard Instance (one per project or team)
  - Experiment (one per model or project)
    - Run (one per training job)

```python
# organize_experiments.py
# Create experiments and runs with consistent naming

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create an experiment
experiment = aiplatform.TensorboardExperiment.create(
    tensorboard_experiment_id='churn-prediction-v2',
    tensorboard_name='projects/your-project-id/locations/us-central1/tensorboards/TB_ID',
    display_name='Churn Prediction Model v2',
    description='Experiments for the churn prediction model, second iteration',
)

# Each training run creates a new run within the experiment
run = aiplatform.TensorboardRun.create(
    tensorboard_run_id='run-lr001-bs64-ep30',
    tensorboard_experiment_name=experiment.resource_name,
    display_name='LR=0.001, BS=64, Epochs=30',
)
```

## Cleaning Up

TensorBoard instances incur storage costs for the logged data. Clean up old experiments you no longer need:

```python
# Delete old experiments
experiment = aiplatform.TensorboardExperiment(
    'projects/your-project-id/locations/us-central1/tensorboards/TB_ID/experiments/old-experiment'
)
experiment.delete()

# Delete the entire TensorBoard instance if no longer needed
tensorboard = aiplatform.Tensorboard(
    'projects/your-project-id/locations/us-central1/tensorboards/TB_ID'
)
tensorboard.delete()
```

## Wrapping Up

Vertex AI TensorBoard gives you persistent, managed experiment tracking without running your own servers. Link it to your training jobs, use the standard TensorBoard logging APIs in your training script, and you get a shared dashboard where your team can view and compare experiments. The key is setting it up early in your project so every training run is tracked from the start.

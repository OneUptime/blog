# How to Set Up a Custom Training Job in Vertex AI Using a Pre-Built TensorFlow Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, TensorFlow, Machine Learning, Custom Training

Description: Step-by-step guide to running a custom TensorFlow training job on Vertex AI using pre-built containers with practical code examples.

---

Training machine learning models on your local machine works fine for small experiments, but when you need to scale up - bigger datasets, more epochs, GPU acceleration - you need something more powerful. Vertex AI custom training jobs give you managed infrastructure for training without having to set up and maintain your own GPU servers. And the best part is that Google provides pre-built containers with TensorFlow already installed, so you do not have to build your own Docker images.

In this guide, I will walk you through setting up a custom training job from scratch.

## Prerequisites

Before we start, make sure you have the following ready:

- A GCP project with billing enabled
- The Vertex AI API enabled
- The Google Cloud SDK installed
- Python 3.8 or later with the `google-cloud-aiplatform` package installed

Install the Vertex AI Python SDK if you have not already:

```bash
# Install the Vertex AI SDK
pip install google-cloud-aiplatform
```

## Writing Your Training Script

The training script is what runs inside the Vertex AI container. It is just a regular Python script, but there are a few conventions to follow.

Here is a complete training script that trains a simple image classifier on the Fashion MNIST dataset:

```python
# trainer/task.py
# Custom TensorFlow training script for Vertex AI

import argparse
import os
import tensorflow as tf

def get_args():
    """Parse command-line arguments passed by Vertex AI."""
    parser = argparse.ArgumentParser()

    # Hyperparameters
    parser.add_argument('--epochs', type=int, default=10,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Training batch size')
    parser.add_argument('--learning-rate', type=float, default=0.001,
                        help='Learning rate for the optimizer')

    # Vertex AI sets this environment variable to point to the model output directory
    parser.add_argument('--model-dir', type=str,
                        default=os.environ.get('AIP_MODEL_DIR', '/tmp/model'),
                        help='Directory to save the trained model')

    return parser.parse_args()

def build_model(learning_rate):
    """Build a simple CNN for Fashion MNIST classification."""
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu',
                               input_shape=(28, 28, 1)),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dropout(0.3),
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

    # Load Fashion MNIST dataset
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.fashion_mnist.load_data()

    # Normalize pixel values and add channel dimension
    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0

    # Build and train the model
    model = build_model(args.learning_rate)

    print(f"Training for {args.epochs} epochs with batch size {args.batch_size}")

    model.fit(
        x_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_data=(x_test, y_test),
        verbose=1
    )

    # Evaluate on test set
    loss, accuracy = model.evaluate(x_test, y_test)
    print(f"Test accuracy: {accuracy:.4f}")

    # Save the model to the output directory
    model.save(args.model_dir)
    print(f"Model saved to {args.model_dir}")

if __name__ == '__main__':
    main()
```

## Uploading Your Training Code to GCS

Vertex AI needs to access your training script from Cloud Storage. Package your script and upload it.

```bash
# Create a source distribution of your training package
# First, make sure your directory structure looks like:
# trainer/
#   __init__.py
#   task.py

# Create an empty __init__.py file
touch trainer/__init__.py

# Upload the training package to GCS
gsutil cp -r trainer/ gs://your-bucket-name/training/
```

## Submitting the Training Job with Python

Now let us submit the training job using the Vertex AI Python SDK:

```python
# submit_training_job.py
# Submits a custom training job to Vertex AI

from google.cloud import aiplatform

# Initialize the Vertex AI SDK
aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-bucket-name'
)

# Define the custom training job
job = aiplatform.CustomTrainingJob(
    display_name='fashion-mnist-training',
    # Path to your training script
    script_path='trainer/task.py',
    # Pre-built TensorFlow container URI
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    # Requirements for additional packages (if any)
    requirements=['tensorflow-datasets'],
    # Where to save the trained model
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Run the training job
model = job.run(
    # Machine type with GPU
    machine_type='n1-standard-4',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    # Arguments passed to your training script
    args=[
        '--epochs', '20',
        '--batch-size', '128',
        '--learning-rate', '0.001',
    ],
    # Display name for the resulting model
    model_display_name='fashion-mnist-model',
    replica_count=1,
)

print(f"Model resource name: {model.resource_name}")
```

## Choosing the Right Pre-Built Container

Google maintains several pre-built containers for different TensorFlow versions and hardware configurations. Here are the common ones:

For training with GPU:
- `us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest` (TensorFlow 2.14)
- `us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-12.py310:latest` (TensorFlow 2.12)

For training with CPU only:
- `us-docker.pkg.dev/vertex-ai/training/tf-cpu.2-14.py310:latest` (TensorFlow 2.14)

You can list all available containers with this gcloud command:

```bash
# List available pre-built training containers
gcloud ai custom-jobs list --region=us-central1 --format="table(displayName)"
```

## Using the gcloud CLI Instead

If you prefer the command line, you can submit training jobs with gcloud:

```bash
# Submit a custom training job using gcloud
gcloud ai custom-jobs create \
  --region=us-central1 \
  --display-name=fashion-mnist-training \
  --worker-pool-spec=machine-type=n1-standard-4,accelerator-type=NVIDIA_TESLA_T4,accelerator-count=1,replica-count=1,container-image-uri=us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest,local-package-path=./trainer,python-module=task \
  --args=--epochs=20,--batch-size=128,--learning-rate=0.001
```

## Environment Variables Set by Vertex AI

Vertex AI automatically sets several environment variables in the training container that your script can use:

- `AIP_MODEL_DIR` - GCS path where you should save your trained model
- `AIP_CHECKPOINT_DIR` - GCS path for saving checkpoints during training
- `AIP_TENSORBOARD_LOG_DIR` - GCS path for TensorBoard logs
- `AIP_DATA_FORMAT` - Format of training data (if using managed datasets)

Using these variables makes your script portable and compatible with Vertex AI features like model upload and TensorBoard integration.

## Monitoring Your Training Job

Once the job is submitted, you can monitor it in the Console or from the command line:

```bash
# Check the status of your training job
gcloud ai custom-jobs describe JOB_ID --region=us-central1

# Stream the logs from your training job
gcloud ai custom-jobs stream-logs JOB_ID --region=us-central1
```

You can also check the job status programmatically:

```python
# Check job status with the Python SDK
job = aiplatform.CustomTrainingJob.get('projects/your-project/locations/us-central1/customJobs/12345')
print(f"State: {job.state}")
```

## Common Issues and How to Fix Them

One issue I ran into early on was the training script failing to find imported modules. Make sure your trainer directory has an `__init__.py` file. Without it, Python does not recognize the directory as a package.

Another common mistake is forgetting to save the model to the `AIP_MODEL_DIR` path. If you save it somewhere else, Vertex AI will not be able to find your trained model for deployment.

If your job fails immediately, check that the container URI is correct and that the machine type you requested is available in your chosen region. Not all GPU types are available in every region.

## Wrapping Up

Running custom training jobs on Vertex AI with pre-built TensorFlow containers is a clean workflow once you get the pieces in place. You write a standard training script, point it at a pre-built container, and let Vertex AI handle the infrastructure. The pre-built containers save you from managing Docker images, and the environment variables make it easy to integrate with other Vertex AI features like model registry and TensorBoard. Start with a small experiment, verify it works, and then scale up to bigger datasets and more powerful machines.

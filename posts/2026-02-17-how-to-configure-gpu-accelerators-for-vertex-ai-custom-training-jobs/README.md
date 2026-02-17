# How to Configure GPU Accelerators for Vertex AI Custom Training Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, GPU, Custom Training, Machine Learning

Description: A practical guide to configuring GPU accelerators for Vertex AI custom training jobs including GPU selection, multi-GPU setups, and cost tips.

---

Training deep learning models without GPUs is like trying to fill a swimming pool with a teaspoon. It technically works, but you will be waiting a very long time. Vertex AI makes it straightforward to attach GPU accelerators to your custom training jobs, but picking the right GPU and configuring it properly requires some thought. In this post, I will cover how to set up GPUs for training, which types to choose for different workloads, and how to avoid common pitfalls.

## Available GPU Types on Vertex AI

Vertex AI supports several NVIDIA GPU types, each suited for different workloads:

- **NVIDIA Tesla T4** - Good all-around GPU for most training tasks. 16 GB memory, cost-effective.
- **NVIDIA Tesla V100** - High-performance GPU with 16 GB memory. Excellent for training larger models.
- **NVIDIA Tesla P100** - Older generation, still decent for many workloads. 16 GB memory.
- **NVIDIA Tesla A100** - Top-tier GPU with 40 GB or 80 GB memory. Best for very large models and distributed training.
- **NVIDIA L4** - Newer generation, good balance of performance and cost. 24 GB memory.

The GPU you choose depends on your model size, training data volume, and budget.

## Basic GPU Configuration with Python SDK

Here is how to configure a single GPU for a custom training job:

```python
# single_gpu_training.py
# Submit a training job with one NVIDIA T4 GPU

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-staging-bucket',
)

# Create a custom training job
job = aiplatform.CustomTrainingJob(
    display_name='single-gpu-training',
    script_path='trainer/task.py',
    # Use the TensorFlow GPU container
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Run with a T4 GPU attached
model = job.run(
    machine_type='n1-standard-8',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    replica_count=1,
    args=['--epochs', '50', '--batch-size', '256'],
    model_display_name='gpu-trained-model',
)
```

## Multi-GPU Configuration

For larger models or faster training, you can attach multiple GPUs to a single machine:

```python
# multi_gpu_training.py
# Submit a training job with four NVIDIA V100 GPUs

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-staging-bucket',
)

job = aiplatform.CustomTrainingJob(
    display_name='multi-gpu-training',
    script_path='trainer/task.py',
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Attach 4 V100 GPUs
model = job.run(
    machine_type='n1-standard-16',
    accelerator_type='NVIDIA_TESLA_V100',
    accelerator_count=4,
    replica_count=1,
    args=['--epochs', '50', '--batch-size', '512'],
    model_display_name='multi-gpu-model',
)
```

When using multiple GPUs, your training script needs to use a distributed training strategy. Here is how to modify a TensorFlow training script for multi-GPU training:

```python
# trainer/task.py
# Training script with multi-GPU support using MirroredStrategy

import tensorflow as tf
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch-size', type=int, default=256)
    args = parser.parse_args()

    # MirroredStrategy distributes training across all available GPUs
    strategy = tf.distribute.MirroredStrategy()
    print(f"Number of GPUs: {strategy.num_replicas_in_sync}")

    # Scale batch size by number of GPUs
    global_batch_size = args.batch_size * strategy.num_replicas_in_sync

    # Load data
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.cifar10.load_data()
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0

    # Create datasets with the global batch size
    train_dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
    train_dataset = train_dataset.shuffle(50000).batch(global_batch_size)

    # Build model inside the strategy scope
    with strategy.scope():
        model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(64, (3, 3), activation='relu', input_shape=(32, 32, 3)),
            tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(256, activation='relu'),
            tf.keras.layers.Dense(10, activation='softmax')
        ])

        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )

    # Train the model - distribution happens automatically
    model.fit(train_dataset, epochs=args.epochs)

    # Save model
    model.save(os.environ.get('AIP_MODEL_DIR', '/tmp/model'))

if __name__ == '__main__':
    main()
```

## Using the gcloud CLI for GPU Configuration

If you prefer the command line, here is how to configure GPUs with gcloud:

```bash
# Submit a training job with 2 T4 GPUs using gcloud
gcloud ai custom-jobs create \
  --region=us-central1 \
  --display-name=gpu-training-job \
  --worker-pool-spec=machine-type=n1-standard-8,accelerator-type=NVIDIA_TESLA_T4,accelerator-count=2,replica-count=1,container-image-uri=us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest,local-package-path=./trainer,python-module=task
```

## A100 GPUs for Large Model Training

For training large models like transformer architectures, A100 GPUs are the way to go. They have 40 GB or 80 GB of memory and much higher throughput:

```python
# a100_training.py
# Submit a training job with A100 GPUs for large model training

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
    staging_bucket='gs://your-staging-bucket',
)

job = aiplatform.CustomTrainingJob(
    display_name='large-model-training',
    script_path='trainer/task.py',
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
    model_serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Use A100 GPUs with a compatible machine type
model = job.run(
    # a2-highgpu machine types are designed for A100 GPUs
    machine_type='a2-highgpu-1g',
    accelerator_type='NVIDIA_TESLA_A100',
    accelerator_count=1,
    replica_count=1,
    args=['--epochs', '100', '--batch-size', '1024'],
    model_display_name='large-model',
)
```

## Machine Type and GPU Compatibility

Not every machine type works with every GPU. Here is a quick reference:

| GPU Type | Compatible Machine Types | Max GPUs per Machine |
|----------|--------------------------|---------------------|
| T4 | n1-standard, n1-highmem, n1-highcpu | 4 |
| V100 | n1-standard, n1-highmem, n1-highcpu | 8 |
| P100 | n1-standard, n1-highmem, n1-highcpu | 4 |
| A100 40GB | a2-highgpu | 16 |
| A100 80GB | a2-ultragpu | 8 |

Always check that your chosen machine type and GPU combination is valid. Mismatched configurations will cause the job to fail immediately.

## Regional GPU Availability

Not all GPU types are available in every GCP region. T4 GPUs are the most widely available, while A100 GPUs are limited to specific regions. Check availability before submitting your job:

```bash
# List available accelerator types in a specific region
gcloud compute accelerator-types list --filter="zone:us-central1"
```

Common regions with good GPU availability include us-central1, us-east1, europe-west4, and asia-east1.

## Monitoring GPU Utilization

To make sure you are actually using the GPU efficiently, you can add GPU monitoring to your training script:

```python
# Monitor GPU utilization during training
import subprocess

def log_gpu_usage():
    """Log GPU memory and utilization using nvidia-smi."""
    result = subprocess.run(
        ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total',
         '--format=csv,noheader,nounits'],
        capture_output=True, text=True
    )
    print(f"GPU Stats: {result.stdout.strip()}")
```

If your GPU utilization is consistently low (below 50%), you might be bottlenecked on data loading. Consider using `tf.data` pipelines with prefetching to keep the GPU fed.

## Cost Optimization Tips

GPUs are expensive, so here are some tips to reduce costs:

Use preemptible VMs when possible. They cost 60-91% less but can be terminated at any time. For training jobs with checkpointing, this is usually fine:

```python
# Use preemptible VMs to reduce costs
from google.cloud.aiplatform_v1.types import custom_job as custom_job_v1

# In the worker pool spec, set scheduling to use spot/preemptible VMs
job = aiplatform.CustomJob(
    display_name='preemptible-gpu-training',
    worker_pool_specs=[{
        'machine_spec': {
            'machine_type': 'n1-standard-8',
            'accelerator_type': 'NVIDIA_TESLA_T4',
            'accelerator_count': 1,
        },
        'replica_count': 1,
        'container_spec': {
            'image_uri': 'us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
            'args': ['--epochs', '50'],
        },
    }],
)
```

Start with T4 GPUs for experimentation and switch to V100 or A100 only when you need the extra performance. Run short test jobs first to estimate how long full training will take before committing to a long run.

## Wrapping Up

Configuring GPU accelerators for Vertex AI training jobs is not complicated once you know which GPU fits your workload, which machine types are compatible, and how to write your training code for multi-GPU setups. Start with a T4 for development and experimentation, scale up to V100 or A100 for production training, and always make sure your training script actually utilizes the GPU with a proper distribution strategy. Monitor GPU utilization to ensure you are getting your money's worth.

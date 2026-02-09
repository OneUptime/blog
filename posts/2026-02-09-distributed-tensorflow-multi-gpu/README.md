# How to Set Up Distributed TensorFlow Training Across Multiple GPU Nodes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TensorFlow, Distributed Training, GPU, Machine Learning

Description: Configure distributed TensorFlow training across multiple GPU nodes in Kubernetes using the TensorFlow distributed strategy and Kubeflow Training Operator for scalable deep learning.

---

Training large deep learning models on a single GPU takes too long, and some models don't even fit in a single GPU's memory. Distributed training across multiple GPUs and nodes dramatically reduces training time and enables training of larger models. TensorFlow provides distributed strategies that work seamlessly with Kubernetes, letting you scale training from a single GPU to hundreds of GPUs across multiple nodes.

This guide shows you how to set up multi-node, multi-GPU distributed training with TensorFlow on Kubernetes.

## Understanding TensorFlow Distribution Strategies

TensorFlow offers several distribution strategies:

- **MirroredStrategy**: Single-node multi-GPU (data parallel)
- **MultiWorkerMirroredStrategy**: Multi-node multi-GPU (data parallel)
- **ParameterServerStrategy**: Classic parameter server architecture
- **CentralStorageStrategy**: All variables on a single device

For multi-node GPU training, we'll use MultiWorkerMirroredStrategy with All-Reduce communication pattern.

## Setting Up the Kubernetes Environment

First, ensure your cluster has GPU nodes and the NVIDIA device plugin:

```bash
# Verify GPU nodes
kubectl get nodes -l nvidia.com/gpu.present=true

# Check GPU capacity
kubectl describe node <gpu-node-name> | grep nvidia.com/gpu

# Install NVIDIA GPU Operator if not already installed
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace
```

## Installing the Kubeflow Training Operator

The Training Operator simplifies distributed training setup:

```bash
# Install Training Operator
kubectl apply -k "github.com/kubeflow/training-operator/manifests/overlays/standalone?ref=v1.7.0"

# Verify installation
kubectl get pods -n kubeflow

# Check TFJob CRD is installed
kubectl get crd tfjobs.kubeflow.org
```

## Creating a Distributed Training Script

Create a TensorFlow script that uses MultiWorkerMirroredStrategy:

```python
# distributed_train.py
import os
import json
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import logging

logging.basicConfig(level=logging.INFO)

def get_strategy():
    """
    Initialize distribution strategy.
    TF_CONFIG is automatically set by the Training Operator.
    """
    tf_config_json = os.environ.get('TF_CONFIG')

    if tf_config_json:
        tf_config = json.loads(tf_config_json)
        logging.info(f"TF_CONFIG: {tf_config}")

        # Use MultiWorkerMirroredStrategy for multi-node training
        strategy = tf.distribute.MultiWorkerMirroredStrategy()
    else:
        # Fallback to MirroredStrategy for single-node
        logging.info("No TF_CONFIG found, using MirroredStrategy")
        strategy = tf.distribute.MirroredStrategy()

    return strategy

def create_model():
    """Create a simple CNN model"""
    model = keras.Sequential([
        layers.Conv2D(32, 3, activation='relu', input_shape=(28, 28, 1)),
        layers.MaxPooling2D(),
        layers.Conv2D(64, 3, activation='relu'),
        layers.MaxPooling2D(),
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(10, activation='softmax')
    ])

    return model

def get_dataset(batch_size):
    """Load and prepare MNIST dataset"""

    # Load MNIST
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

    # Preprocess
    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255

    # Create tf.data.Dataset
    train_dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
    train_dataset = train_dataset.shuffle(10000).batch(batch_size)
    train_dataset = train_dataset.prefetch(tf.data.AUTOTUNE)

    test_dataset = tf.data.Dataset.from_tensor_slices((x_test, y_test))
    test_dataset = test_dataset.batch(batch_size)

    return train_dataset, test_dataset

def train():
    """Main training function"""

    # Get task information
    tf_config_json = os.environ.get('TF_CONFIG', '{}')
    tf_config = json.loads(tf_config_json)

    task_type = tf_config.get('task', {}).get('type', 'chief')
    task_index = tf_config.get('task', {}).get('index', 0)

    logging.info(f"Starting training: task_type={task_type}, task_index={task_index}")

    # Initialize strategy
    strategy = get_strategy()

    logging.info(f"Number of devices: {strategy.num_replicas_in_sync}")

    # Calculate batch size
    global_batch_size = 64 * strategy.num_replicas_in_sync
    logging.info(f"Global batch size: {global_batch_size}")

    # Load dataset
    train_dataset, test_dataset = get_dataset(global_batch_size)

    # Distribute datasets
    train_dist_dataset = strategy.experimental_distribute_dataset(train_dataset)
    test_dist_dataset = strategy.experimental_distribute_dataset(test_dataset)

    # Create model within strategy scope
    with strategy.scope():
        model = create_model()

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=keras.losses.SparseCategoricalCrossentropy(),
            metrics=['accuracy']
        )

    # Callbacks
    callbacks = []

    # Only chief worker saves checkpoints
    if task_type == 'chief' or task_index == 0:
        checkpoint_dir = '/models/checkpoints'
        os.makedirs(checkpoint_dir, exist_ok=True)

        callbacks.append(
            keras.callbacks.ModelCheckpoint(
                filepath=os.path.join(checkpoint_dir, 'model_{epoch:02d}.h5'),
                save_freq='epoch',
                save_best_only=False
            )
        )

        callbacks.append(
            keras.callbacks.TensorBoard(
                log_dir='/models/logs',
                histogram_freq=1
            )
        )

    # Training
    logging.info("Starting training...")

    history = model.fit(
        train_dist_dataset,
        epochs=10,
        validation_data=test_dist_dataset,
        callbacks=callbacks,
        verbose=1 if task_type == 'chief' else 0
    )

    # Evaluate
    if task_type == 'chief' or task_index == 0:
        logging.info("Evaluating model...")
        test_loss, test_acc = model.evaluate(test_dist_dataset)
        logging.info(f"Test accuracy: {test_acc:.4f}")

        # Save final model
        model.save('/models/final_model')
        logging.info("Model saved to /models/final_model")

    logging.info("Training completed successfully!")

if __name__ == '__main__':
    # Set TensorFlow logging
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

    # Run training
    train()
```

Build a Docker image:

```dockerfile
# Dockerfile.tensorflow
FROM tensorflow/tensorflow:2.14.0-gpu

WORKDIR /app

# Install additional packages
RUN pip install --no-cache-dir \
    tensorflow-datasets==4.9.0

# Copy training script
COPY distributed_train.py /app/

# Set environment variable for GPU memory growth
ENV TF_FORCE_GPU_ALLOW_GROWTH=true

# Run training
CMD ["python", "distributed_train.py"]
```

Build and push:

```bash
docker build -t your-registry/tensorflow-distributed:v1 -f Dockerfile.tensorflow .
docker push your-registry/tensorflow-distributed:v1
```

## Creating a TFJob for Distributed Training

Create a TFJob manifest for multi-node training:

```yaml
# tfjob-distributed.yaml
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: tensorflow-distributed
  namespace: training
spec:
  # Clean up completed jobs after 1 hour
  ttlSecondsAfterFinished: 3600

  tfReplicaSpecs:
    # Chief worker (index 0)
    Chief:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: tensorflow
            image: your-registry/tensorflow-distributed:v1
            resources:
              requests:
                nvidia.com/gpu: 2  # 2 GPUs per node
                memory: "16Gi"
                cpu: "8"
              limits:
                nvidia.com/gpu: 2
                memory: "16Gi"
                cpu: "8"
            volumeMounts:
            - name: model-storage
              mountPath: /models
            env:
            - name: NCCL_DEBUG
              value: "INFO"
            - name: NCCL_SOCKET_IFNAME
              value: "eth0"
          volumes:
          - name: model-storage
            persistentVolumeClaim:
              claimName: training-models

    # Worker replicas
    Worker:
      replicas: 3  # 3 additional worker nodes
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: tensorflow
            image: your-registry/tensorflow-distributed:v1
            resources:
              requests:
                nvidia.com/gpu: 2
                memory: "16Gi"
                cpu: "8"
              limits:
                nvidia.com/gpu: 2
                memory: "16Gi"
                cpu: "8"
            volumeMounts:
            - name: model-storage
              mountPath: /models
            env:
            - name: NCCL_DEBUG
              value: "INFO"
            - name: NCCL_SOCKET_IFNAME
              value: "eth0"
          volumes:
          - name: model-storage
            persistentVolumeClaim:
              claimName: training-models
```

Create PVC for shared storage:

```yaml
# training-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-models
  namespace: training
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-client  # Use a storage class that supports RWX
  resources:
    requests:
      storage: 100Gi
```

Deploy the training job:

```bash
# Create namespace
kubectl create namespace training

# Create PVC
kubectl apply -f training-pvc.yaml

# Deploy TFJob
kubectl apply -f tfjob-distributed.yaml

# Watch job progress
kubectl get tfjobs -n training -w

# Check pods
kubectl get pods -n training -l training.kubeflow.org/job-name=tensorflow-distributed

# View chief logs
kubectl logs -n training -l training.kubeflow.org/job-name=tensorflow-distributed,training.kubeflow.org/replica-type=chief -f

# View worker logs
kubectl logs -n training -l training.kubeflow.org/job-name=tensorflow-distributed,training.kubeflow.org/replica-type=worker
```

## Advanced: Using Horovod for Better Performance

Horovod provides optimized all-reduce operations:

```python
# horovod_train.py
import os
import tensorflow as tf
from tensorflow import keras
import horovod.tensorflow as hvd

# Initialize Horovod
hvd.init()

print(f"Horovod initialized: rank={hvd.rank()}, size={hvd.size()}, local_rank={hvd.local_rank()}")

# Pin GPU to be used to process local rank
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_visible_devices(gpus[hvd.local_rank()], 'GPU')

# Build model
model = keras.Sequential([
    keras.layers.Conv2D(32, 3, activation='relu', input_shape=(28, 28, 1)),
    keras.layers.MaxPooling2D(),
    keras.layers.Conv2D(64, 3, activation='relu'),
    keras.layers.MaxPooling2D(),
    keras.layers.Flatten(),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])

# Horovod: adjust learning rate based on number of GPUs
opt = keras.optimizers.Adam(learning_rate=0.001 * hvd.size())

# Horovod: wrap optimizer with DistributedOptimizer
opt = hvd.DistributedOptimizer(opt)

model.compile(
    optimizer=opt,
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# Load data
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255
x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255

# Horovod: shard dataset across workers
train_dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
train_dataset = train_dataset.shard(hvd.size(), hvd.rank())
train_dataset = train_dataset.shuffle(10000).batch(64)

# Callbacks
callbacks = [
    # Horovod: broadcast initial variable states from rank 0 to all other processes
    hvd.callbacks.BroadcastGlobalVariablesCallback(0),

    # Horovod: average metrics among workers at the end of every epoch
    hvd.callbacks.MetricAverageCallback(),

    # Horovod: learning rate warmup
    hvd.callbacks.LearningRateWarmupCallback(initial_lr=0.001 * hvd.size(), warmup_epochs=3, verbose=1),
]

# Save checkpoints only on rank 0
if hvd.rank() == 0:
    callbacks.append(keras.callbacks.ModelCheckpoint('./checkpoint-{epoch}.h5'))

# Train
model.fit(
    train_dataset,
    epochs=10,
    callbacks=callbacks,
    verbose=1 if hvd.rank() == 0 else 0
)
```

Deploy with Horovod:

```yaml
# tfjob-horovod.yaml
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: tensorflow-horovod
  namespace: training
spec:
  tfReplicaSpecs:
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: tensorflow
            image: horovod/horovod:0.28.0-tf2.14.0-torch2.0.0-mxnet1.9.1-py3.10-gpu
            command:
            - horovodrun
            - -np
            - "8"  # 4 nodes * 2 GPUs
            - -H
            - localhost:2
            - python
            - /app/horovod_train.py
            resources:
              requests:
                nvidia.com/gpu: 2
                memory: "16Gi"
              limits:
                nvidia.com/gpu: 2
                memory: "16Gi"
```

## Monitoring Training Performance

Add TensorBoard for visualization:

```yaml
# tensorboard-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tensorboard
  namespace: training
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tensorboard
  template:
    metadata:
      labels:
        app: tensorboard
    spec:
      containers:
      - name: tensorboard
        image: tensorflow/tensorflow:2.14.0
        command:
        - tensorboard
        - --logdir=/models/logs
        - --host=0.0.0.0
        - --port=6006
        ports:
        - containerPort: 6006
        volumeMounts:
        - name: model-storage
          mountPath: /models
        resources:
          requests:
            cpu: "500m"
            memory: "2Gi"
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: training-models
---
apiVersion: v1
kind: Service
metadata:
  name: tensorboard
  namespace: training
spec:
  selector:
    app: tensorboard
  ports:
  - port: 6006
    targetPort: 6006
  type: ClusterIP
```

Access TensorBoard:

```bash
kubectl apply -f tensorboard-deployment.yaml

# Port forward
kubectl port-forward -n training svc/tensorboard 6006:6006

# Open browser to http://localhost:6006
```

Monitor GPU utilization:

```bash
# Check GPU usage on nodes
for pod in $(kubectl get pods -n training -l training.kubeflow.org/job-name=tensorflow-distributed -o name); do
    echo "=== $pod ==="
    kubectl exec -n training $pod -- nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total --format=csv
done
```

## Performance Optimization Tips

Enable mixed precision training:

```python
# In your training script
from tensorflow.keras import mixed_precision

# Enable mixed precision
policy = mixed_precision.Policy('mixed_float16')
mixed_precision.set_global_policy(policy)

# Rest of your training code
```

Tune NCCL settings:

```yaml
env:
- name: NCCL_DEBUG
  value: "INFO"
- name: NCCL_SOCKET_IFNAME
  value: "eth0"
- name: NCCL_IB_DISABLE
  value: "0"  # Enable InfiniBand if available
- name: NCCL_NET_GDR_LEVEL
  value: "5"
- name: NCCL_P2P_LEVEL
  value: "5"
```

Use data sharding efficiently:

```python
# Ensure each worker processes different data
options = tf.data.Options()
options.experimental_distribute.auto_shard_policy = tf.data.experimental.AutoShardPolicy.DATA

dataset = dataset.with_options(options)
```

## Conclusion

Distributed TensorFlow training on Kubernetes with multiple GPUs across nodes dramatically reduces training time for large models. The Kubeflow Training Operator handles the complexity of distributed setup, including TF_CONFIG generation and service discovery. By using strategies like MultiWorkerMirroredStrategy or Horovod, you can scale from a few GPUs to hundreds, making it possible to train models that would be impractical on a single machine. Proper monitoring and tuning of communication settings ensures you get the best performance from your GPU cluster.

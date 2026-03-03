# How to Run TensorFlow on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TensorFlow, Machine Learning, GPU, Kubernetes, Deep Learning

Description: A hands-on guide to running TensorFlow training and inference workloads on a Talos Linux Kubernetes cluster with GPU acceleration.

---

TensorFlow is one of the most widely used machine learning frameworks, powering everything from image classification to natural language processing models. Running TensorFlow on Talos Linux gives you a secure, immutable infrastructure for your ML workloads while taking advantage of Kubernetes for scheduling, scaling, and resource management. Whether you are training models on GPUs or serving predictions through TensorFlow Serving, Talos Linux provides a clean foundation that eliminates configuration drift and reduces the attack surface of your ML infrastructure.

This guide covers deploying TensorFlow jobs on Talos Linux, both for training and serving, with GPU acceleration.

## Prerequisites

You need:

- A Talos Linux cluster with GPU-enabled nodes (see our GPU setup guide)
- NVIDIA device plugin installed and functional
- kubectl and Helm configured
- A container registry for custom images (optional)
- Persistent storage provisioner for training data and model checkpoints

## Verifying GPU Access

Before running TensorFlow, confirm that GPUs are accessible:

```bash
# Quick GPU verification test
kubectl run tf-gpu-check --rm -it --restart=Never \
  --image=tensorflow/tensorflow:2.15.0-gpu \
  --limits=nvidia.com/gpu=1 \
  -- python -c "
import tensorflow as tf
print('TensorFlow version:', tf.__version__)
print('GPU devices:', tf.config.list_physical_devices('GPU'))
print('Built with CUDA:', tf.test.is_built_with_cuda())
"
```

This should print the TensorFlow version and list available GPU devices.

## Running a TensorFlow Training Job

For training jobs, use a Kubernetes Job resource. Here is an example that trains a simple CNN on the CIFAR-10 dataset:

```yaml
# tf-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: tf-cifar10-training
  namespace: ml-workloads
spec:
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: tf-training
    spec:
      restartPolicy: OnFailure
      containers:
        - name: tensorflow
          image: tensorflow/tensorflow:2.15.0-gpu
          command:
            - python
            - /scripts/train.py
          resources:
            requests:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: 16Gi
              nvidia.com/gpu: 1
          volumeMounts:
            - name: training-scripts
              mountPath: /scripts
            - name: model-output
              mountPath: /models
            - name: data
              mountPath: /data
          env:
            - name: TF_FORCE_GPU_ALLOW_GROWTH
              value: "true"
      volumes:
        - name: training-scripts
          configMap:
            name: tf-training-scripts
        - name: model-output
          persistentVolumeClaim:
            claimName: model-storage
        - name: data
          persistentVolumeClaim:
            claimName: training-data
```

Create the training script as a ConfigMap:

```yaml
# tf-training-scripts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tf-training-scripts
  namespace: ml-workloads
data:
  train.py: |
    import tensorflow as tf
    import os

    # Load CIFAR-10 dataset
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.cifar10.load_data()
    x_train, x_test = x_train / 255.0, x_test / 255.0

    # Build a CNN model
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(32, 32, 3)),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(10)
    ])

    # Compile the model
    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=['accuracy']
    )

    # Set up callbacks
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            '/models/cifar10/checkpoint',
            save_best_only=True
        ),
        tf.keras.callbacks.TensorBoard(log_dir='/models/cifar10/logs'),
        tf.keras.callbacks.EarlyStopping(patience=5)
    ]

    # Train the model
    history = model.fit(
        x_train, y_train,
        epochs=50,
        batch_size=64,
        validation_data=(x_test, y_test),
        callbacks=callbacks
    )

    # Save the final model
    model.save('/models/cifar10/saved_model')
    print("Training complete. Model saved to /models/cifar10/saved_model")
```

Apply and run:

```bash
kubectl create namespace ml-workloads
kubectl apply -f tf-training-scripts.yaml
kubectl apply -f tf-training-job.yaml

# Monitor the training
kubectl logs -n ml-workloads job/tf-cifar10-training -f
```

## Distributed Training with TensorFlow

For larger models, you can use distributed training across multiple GPUs. TensorFlow's MultiWorkerMirroredStrategy works well in Kubernetes. Here is a setup using multiple pods:

```yaml
# tf-distributed-training.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: tf-distributed-worker-0
  namespace: ml-workloads
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: tensorflow
          image: tensorflow/tensorflow:2.15.0-gpu
          command: ["python", "/scripts/distributed_train.py"]
          resources:
            limits:
              nvidia.com/gpu: 1
          env:
            - name: TF_CONFIG
              value: |
                {
                  "cluster": {
                    "worker": [
                      "tf-worker-0.ml-workloads.svc:2222",
                      "tf-worker-1.ml-workloads.svc:2222"
                    ]
                  },
                  "task": {"type": "worker", "index": 0}
                }
          ports:
            - containerPort: 2222
          volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: shared-models
              mountPath: /models
      volumes:
        - name: scripts
          configMap:
            name: distributed-training-scripts
        - name: shared-models
          persistentVolumeClaim:
            claimName: model-storage
```

The distributed training script uses MultiWorkerMirroredStrategy:

```python
# distributed_train.py
import tensorflow as tf
import json
import os

# Configure distributed strategy
strategy = tf.distribute.MultiWorkerMirroredStrategy()

print(f"Number of devices: {strategy.num_replicas_in_sync}")

# Build and compile model within strategy scope
with strategy.scope():
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(32, 32, 3)),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(10)
    ])

    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=['accuracy']
    )

# Load data
(x_train, y_train), _ = tf.keras.datasets.cifar10.load_data()
x_train = x_train / 255.0

# Train
model.fit(x_train, y_train, epochs=20, batch_size=64)
model.save('/models/distributed_model')
```

## Deploying TensorFlow Serving

Once you have a trained model, deploy it with TensorFlow Serving for inference:

```yaml
# tf-serving-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tf-serving
  namespace: ml-workloads
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tf-serving
  template:
    metadata:
      labels:
        app: tf-serving
    spec:
      containers:
        - name: tf-serving
          image: tensorflow/serving:2.15.0-gpu
          args:
            - --model_name=cifar10
            - --model_base_path=/models/cifar10/saved_model
            - --port=8500
            - --rest_api_port=8501
          ports:
            - containerPort: 8500
              name: grpc
            - containerPort: 8501
              name: rest
          resources:
            requests:
              cpu: "2"
              memory: 4Gi
              nvidia.com/gpu: 1
            limits:
              nvidia.com/gpu: 1
          volumeMounts:
            - name: models
              mountPath: /models
          readinessProbe:
            httpGet:
              path: /v1/models/cifar10
              port: 8501
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: model-storage
---
apiVersion: v1
kind: Service
metadata:
  name: tf-serving
  namespace: ml-workloads
spec:
  ports:
    - port: 8500
      name: grpc
    - port: 8501
      name: rest
  selector:
    app: tf-serving
```

Test the serving endpoint:

```bash
# Port-forward to test locally
kubectl port-forward -n ml-workloads svc/tf-serving 8501:8501

# Send a prediction request
curl -X POST http://localhost:8501/v1/models/cifar10:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [[[0.1, 0.2, 0.3]]]}'
```

## TensorBoard for Monitoring Training

Deploy TensorBoard to visualize training progress:

```yaml
# tensorboard-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tensorboard
  namespace: ml-workloads
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
          image: tensorflow/tensorflow:2.15.0
          command: ["tensorboard", "--logdir=/models/cifar10/logs", "--bind_all"]
          ports:
            - containerPort: 6006
          volumeMounts:
            - name: models
              mountPath: /models
              readOnly: true
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: model-storage
```

## Performance Tuning Tips

When running TensorFlow on Talos Linux, consider these optimizations:

1. Set `TF_FORCE_GPU_ALLOW_GROWTH=true` to prevent TensorFlow from allocating all GPU memory at startup
2. Use mixed precision training for faster computation on supported GPUs
3. Pin training pods to GPU nodes using nodeSelector
4. Use local NVMe storage for training data to avoid network bottlenecks

```python
# Enable mixed precision for faster training
tf.keras.mixed_precision.set_global_policy('mixed_float16')
```

## Conclusion

TensorFlow on Talos Linux provides a secure, reproducible, and scalable platform for machine learning workloads. The immutable OS eliminates environment inconsistencies that plague ML workflows, while Kubernetes handles scheduling and GPU resource management. From single-GPU training jobs to distributed training and production serving, Talos Linux handles it all with the added benefit of a minimal attack surface for your ML infrastructure.

# How to Use K3s with GPU Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, GPU, NVIDIA, AI, Machine Learning, CUDA, DevOps

Description: Learn how to configure K3s to support NVIDIA GPU workloads for AI/ML training and inference using the NVIDIA device plugin.

## Introduction

Running GPU workloads on K3s requires configuring the NVIDIA Container Toolkit and device plugin so that Kubernetes can schedule pods that request GPU resources. K3s supports GPU access through the same mechanism as standard Kubernetes, making it easy to run AI/ML workloads like TensorFlow training, PyTorch inference, and LLM serving at the edge or in small data centers.

## Prerequisites

- Linux host with NVIDIA GPU
- NVIDIA drivers installed
- K3s node (server or agent) with GPU access

## Step 1: Install NVIDIA Drivers

```bash
# Check if NVIDIA drivers are installed

nvidia-smi

# If not installed, install them (Ubuntu)
apt-get update
apt-get install -y ubuntu-drivers-common
ubuntu-drivers autoinstall

# Reboot and verify
reboot
nvidia-smi
```

Expected output:

```yaml
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.104.05   Driver Version: 535.104.05   CUDA Version: 12.2   |
|-------------------------------|----------------------|----------------------|
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC|
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M.|
|===============================|======================|======================|
|   0  NVIDIA RTX 3090     Off  | 00000000:01:00.0 Off |                  N/A|
| 30%   45C    P8    20W / 350W |      1MiB / 24576MiB |      0%      Default|
+-----------------------------------------------------------------------------+
```

## Step 2: Install NVIDIA Container Toolkit

```bash
# Add NVIDIA Container Toolkit repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update
apt-get install -y nvidia-container-toolkit

# Verify the NVIDIA runtime is on the host PATH for K3s
which nvidia-container-runtime
```

## Step 3: Configure K3s to Use NVIDIA Runtime

```bash
# Install K3s with NVIDIA as the default runtime
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--default-runtime nvidia" sh -s -

# Or, on an existing cluster, add 'default-runtime: nvidia' to /etc/rancher/k3s/config.yaml
# and restart K3s
systemctl restart k3s

# Verify that K3s detected the NVIDIA runtime
grep nvidia /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

## Step 4: Deploy the NVIDIA Device Plugin

The device plugin advertises GPUs as Kubernetes resources:

```bash
# Deploy NVIDIA device plugin via DaemonSet
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.19.0/deployments/static/nvidia-device-plugin.yml

# Wait for device plugin to be ready
kubectl rollout status daemonset/nvidia-device-plugin-daemonset -n kube-system

# Verify GPU resource is advertised by the node
kubectl describe node | grep -A 10 "Capacity:"
```

Expected output:

```text
Capacity:
  cpu:                8
  memory:             32Gi
  nvidia.com/gpu:     1    # ← GPU resource available!
  pods:               110
```

### Using k3d with GPU (for development)

```bash
# k3d can pass GPUs through to node containers, but CUDA workloads require
# a custom K3s image with the NVIDIA runtime installed.
k3d cluster create gpu-cluster \
  --image <your-custom-k3s-gpu-image> \
  --gpus all
```

## Step 5: Deploy a GPU-Enabled Workload

```yaml
# gpu-deployment.yaml
---
# CUDA test job
apiVersion: batch/v1
kind: Job
metadata:
  name: cuda-vector-add
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: cuda-test
          image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda11.2.1
          resources:
            limits:
              # Request exactly 1 GPU
              nvidia.com/gpu: 1
          # GPU is not in 'requests' by convention - only in 'limits'
```

```bash
kubectl apply -f gpu-deployment.yaml

# Watch the job
kubectl get jobs
kubectl get pods | grep cuda

# View GPU usage during job
watch -n 1 nvidia-smi

# Check output
kubectl logs job/cuda-vector-add

# Expected output:
# [Vector addition of 50000 elements]
# Copy input data from the host memory to the CUDA device
# CUDA kernel launch with 196 blocks of 256 threads
# Copy output data from the CUDA device to the host memory
# Test PASSED
```

## Step 6: TensorFlow GPU Training Job

```yaml
# tensorflow-training.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: tf-mnist-training
  namespace: default
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: trainer
          image: tensorflow/tensorflow:2.14.0-gpu
          command:
            - python3
            - -c
            - |
              import tensorflow as tf
              print("GPUs available:", tf.config.list_physical_devices('GPU'))
              # Simple training loop
              mnist = tf.keras.datasets.mnist
              (x_train, y_train), (x_test, y_test) = mnist.load_data()
              x_train, x_test = x_train / 255.0, x_test / 255.0
              model = tf.keras.Sequential([
                tf.keras.layers.Flatten(input_shape=(28, 28)),
                tf.keras.layers.Dense(128, activation='relu'),
                tf.keras.layers.Dense(10)
              ])
              model.compile(optimizer='adam',
                          loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                          metrics=['accuracy'])
              model.fit(x_train, y_train, epochs=5)
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 8Gi
            requests:
              memory: 4Gi
```

## Step 7: PyTorch Inference Server

```yaml
# pytorch-inference.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pytorch-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pytorch-inference
  template:
    metadata:
      labels:
        app: pytorch-inference
    spec:
      containers:
        - name: inference
          image: pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime
          command:
            - python3
            - -c
            - |
              import json
              import torch
              from http.server import BaseHTTPRequestHandler, HTTPServer

              device = "cuda" if torch.cuda.is_available() else "cpu"
              model = torch.nn.Linear(4, 2).to(device)
              model.eval()

              class Handler(BaseHTTPRequestHandler):
                  def do_GET(self):
                      with torch.no_grad():
                          output = model(torch.ones(1, 4, device=device))
                      payload = {
                          "cuda_available": torch.cuda.is_available(),
                          "device": device,
                          "gpu_count": torch.cuda.device_count(),
                          "sample_prediction": output.detach().cpu().tolist(),
                      }
                      self.send_response(200)
                      self.send_header("Content-Type", "application/json")
                      self.end_headers()
                      self.wfile.write(json.dumps(payload).encode())

              HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 12Gi
            requests:
              memory: 6Gi
          ports:
            - containerPort: 8080
```

## Step 8: GPU Resource Sharing with Time-Slicing

For sharing a single GPU across multiple pods:

```yaml
# nvidia-time-slicing-config.yaml
version: v1
flags:
  migStrategy: none
sharing:
  timeSlicing:
    resources:
      - name: nvidia.com/gpu
        replicas: 4  # Share one GPU among 4 pods
```

```bash
# Replace the static DaemonSet from Step 4 with the Helm deployment used for plugin config
kubectl delete daemonset nvidia-device-plugin-daemonset -n kube-system

helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update

helm upgrade -i nvdp nvdp/nvidia-device-plugin \
  --namespace nvidia-device-plugin \
  --create-namespace \
  --set-file config.map.config=./nvidia-time-slicing-config.yaml

kubectl rollout status daemonset/nvdp-nvidia-device-plugin -n nvidia-device-plugin

# Now 4 pods can each claim 1 GPU (they share the physical GPU)
kubectl describe node | grep "nvidia.com/gpu"
# Should show: nvidia.com/gpu: 4
```

## Step 9: Monitor GPU Utilization

```bash
# Install dcgm-exporter for Prometheus metrics
kubectl apply -n default -f \
  https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/dcgm-exporter.yaml

# View GPU metrics
kubectl port-forward -n default \
  service/dcgm-exporter 9400:9400 &
curl http://localhost:9400/metrics | grep DCGM_FI_DEV_GPU_UTIL

# Real-time GPU monitoring
watch -n 1 nvidia-smi
```

## Conclusion

K3s supports GPU workloads through the NVIDIA container toolkit and device plugin, making it viable for AI/ML workloads at the edge and in small clusters. The key steps are installing NVIDIA drivers, installing the NVIDIA Container Toolkit, configuring K3s to use the NVIDIA runtime, and deploying the device plugin to expose GPU resources to Kubernetes. Once configured, pods can request GPUs just like any other Kubernetes resource, enabling TensorFlow, PyTorch, and other GPU-accelerated workloads to run seamlessly on K3s.

# How to Deploy AI/ML Models at the Edge with K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, AI/ML, Edge Computing, Kubernetes, NVIDIA, TensorFlow, Model Serving

Description: Learn how to deploy AI and machine learning model inference workloads at the edge using K3s, including GPU configuration, model serving with Triton or TorchServe, and edge-optimized deployment...

---

Running AI inference at the edge reduces latency, preserves privacy, and works offline. K3s's lightweight footprint makes it ideal for edge AI deployments on NVIDIA Jetson, edge servers, and industrial hardware.

---

## Step 1: Install K3s with GPU Support

```bash
# Install the NVIDIA container toolkit on the edge node after the GPU driver is installed

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Install K3s after the NVIDIA runtime is present so K3s can detect it
curl -sfL https://get.k3s.io | sh -

# If K3s was already installed before you added the NVIDIA runtime, restart it instead
# sudo systemctl restart k3s
# sudo systemctl restart k3s-agent

# Confirm K3s detected the NVIDIA runtime
sudo grep nvidia /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

---

## Step 2: Install the NVIDIA Device Plugin

```bash
# Deploy NVIDIA device plugin as a DaemonSet
kubectl apply -f \
  https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.17.1/deployments/static/nvidia-device-plugin.yml

# Verify GPU is visible to Kubernetes
kubectl get nodes -o json | jq '.items[].status.capacity | select(."nvidia.com/gpu")'
```

---

## Step 3: Deploy an AI Inference Server

Deploy NVIDIA Triton Inference Server to serve ML models:

```yaml
# triton-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-inference
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-server
  namespace: ai-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: triton-server
  template:
    metadata:
      labels:
        app: triton-server
    spec:
      runtimeClassName: nvidia
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:25.02-py3  # use the matching -igpu tag on Jetson devices
          args:
            # Path to the model repository (mounted from a PVC or hostPath)
            - --model-repository=/models
          ports:
            - name: http
              containerPort: 8000
            - name: grpc
              containerPort: 8001
            - name: metrics
              containerPort: 8002
          resources:
            limits:
              # Request 1 GPU for inference
              nvidia.com/gpu: "1"
              memory: 8Gi
            requests:
              nvidia.com/gpu: "1"
              memory: 4Gi
          volumeMounts:
            - name: model-store
              mountPath: /models
      volumes:
        - name: model-store
          hostPath:
            path: /data/models
            type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: triton-server
  namespace: ai-inference
spec:
  selector:
    app: triton-server
  ports:
    - name: http
      port: 8000
      targetPort: 8000
    - name: grpc
      port: 8001
      targetPort: 8001
    - name: metrics
      port: 8002
      targetPort: 8002
```

```bash
kubectl apply -f triton-deployment.yaml
```

---

## Step 4: Load a Model

The exact filename depends on the backend. For an ONNX model, the model repository looks like this:

```text
# Model repository structure
/data/models/
  my-model/
    1/                    # model version
      model.onnx          # ONNX model file
    config.pbtxt          # Triton model configuration
```

```bash
mkdir -p /data/models/my-model/1

# Copy model.onnx into /data/models/my-model/1/ before creating config.pbtxt
# config.pbtxt example
cat > /data/models/my-model/config.pbtxt <<EOF
name: "my-model"
platform: "onnxruntime_onnx"
max_batch_size: 8
input [{ name: "input", data_type: TYPE_FP32, dims: [3, 224, 224] }]
output [{ name: "output", data_type: TYPE_FP32, dims: [1000] }]
EOF
```

---

## Step 5: Run Inference

```bash
# In a separate terminal, port-forward for local testing
kubectl port-forward svc/triton-server 8000:8000 -n ai-inference

# Send a test inference request with a zero-filled input tensor
jq -n '{inputs:[{name:"input",shape:[1,3,224,224],datatype:"FP32",data:([range(0;150528)] | map(0))}],outputs:[{name:"output"}]}' \
| curl -s -X POST http://localhost:8000/v2/models/my-model/infer \
  -H "Content-Type: application/json" \
  -d @-
```

---

## Best Practices

- Cache models in a persistent volume claim backed by Longhorn - avoid pulling large models over a slow edge connection on every restart.
- Use **model versioning** in Triton to roll out new model versions without service disruption.
- Set **CPU fallback** for non-GPU edge nodes using TensorFlow Lite or ONNX Runtime CPU execution providers.
- Monitor GPU utilization and temperature using the DCGM exporter and alert when utilization drops unexpectedly.

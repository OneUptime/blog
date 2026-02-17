# How to Use GPU-Enabled Containers in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, GPU, Machine Learning, Deep Learning, NVIDIA, Cloud Computing

Description: How to deploy GPU-enabled containers in Azure Container Instances for machine learning inference, video processing, and other GPU-accelerated workloads.

---

Some workloads need a GPU. Machine learning inference, video transcoding, scientific simulations, and image processing all benefit enormously from GPU acceleration. Azure Container Instances supports GPU-enabled containers, letting you run these workloads without managing VMs or Kubernetes clusters.

This post covers how to deploy GPU containers in ACI, which GPU types are available, how to build GPU-compatible images, and the practical considerations for running GPU workloads.

## GPU Options in ACI

ACI supports NVIDIA GPUs. The available GPU types depend on the region:

- **NVIDIA Tesla K80** - Older generation, good for basic ML inference and development
- **NVIDIA Tesla P100** - Higher performance, suitable for training and inference
- **NVIDIA Tesla V100** - Top-tier performance for demanding ML workloads

Not all regions support GPU containers. At the time of writing, GPU support is available in regions like East US, West US 2, West Europe, and Southeast Asia. Check the latest availability in the Azure documentation.

Each container group can request 1 to 4 GPUs, depending on the SKU and region.

## Deploying a GPU Container

### Using Azure CLI

```bash
# Deploy a container with 1 NVIDIA V100 GPU
az container create \
    --resource-group my-resource-group \
    --name gpu-container \
    --image myregistry.azurecr.io/ml-inference:latest \
    --cpu 4 \
    --memory 16 \
    --gpu-count 1 \
    --gpu-sku V100 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --ports 8080 \
    --ip-address Public
```

### Using YAML

The YAML format gives you more control over the configuration:

```yaml
# gpu-container.yaml - Container with GPU resources
apiVersion: '2021-09-01'
location: eastus
name: ml-inference
properties:
  containers:
    - name: inference-server
      properties:
        image: myregistry.azurecr.io/ml-inference:latest
        resources:
          requests:
            cpu: 4.0
            memoryInGb: 16.0
            # GPU configuration
            gpu:
              count: 1
              sku: V100
        ports:
          - port: 8080
            protocol: TCP
        environmentVariables:
          - name: MODEL_PATH
            value: '/models/my-model'
          - name: NVIDIA_VISIBLE_DEVICES
            value: 'all'
          # Use mixed precision for faster inference
          - name: USE_FP16
            value: 'true'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

## Building GPU-Compatible Docker Images

Your Docker image needs the NVIDIA CUDA runtime to use the GPU. NVIDIA provides official base images that include the necessary drivers and libraries.

Here is a Dockerfile for a PyTorch inference service:

```dockerfile
# Dockerfile - GPU-enabled PyTorch inference server
# Start from NVIDIA's CUDA base image with Python
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch with CUDA support
# The index URL ensures we get the CUDA-enabled version
RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install other dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy model files and application code
COPY models/ /models/
COPY app/ /app/

# Expose the inference API port
EXPOSE 8080

# Start the inference server
CMD ["python3", "server.py"]
```

And here is a simple inference server:

```python
# server.py - Simple ML inference server using Flask and PyTorch
import torch
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

# Check if GPU is available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Print GPU info if available
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

# Load the model once at startup
model_path = os.environ.get('MODEL_PATH', '/models/my-model')
model = torch.load(model_path, map_location=device)
model.eval()

@app.route('/predict', methods=['POST'])
def predict():
    # Get input data from the request
    data = request.json
    input_tensor = torch.tensor(data['input']).to(device)

    # Run inference on the GPU
    with torch.no_grad():
        output = model(input_tensor)

    # Return the prediction
    return jsonify({
        'prediction': output.cpu().numpy().tolist(),
        'device': str(device)
    })

@app.route('/health', methods=['GET'])
def health():
    # Check that the GPU is accessible
    gpu_ok = torch.cuda.is_available()
    return jsonify({
        'status': 'healthy' if gpu_ok else 'degraded',
        'gpu_available': gpu_ok,
        'gpu_name': torch.cuda.get_device_name(0) if gpu_ok else 'none'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## TensorFlow Example

If you are using TensorFlow instead of PyTorch:

```dockerfile
# Dockerfile - TensorFlow GPU inference
FROM tensorflow/tensorflow:2.15.0-gpu

WORKDIR /app

# Install additional dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy model and application
COPY saved_model/ /models/
COPY app.py .

EXPOSE 8080

CMD ["python", "app.py"]
```

```python
# app.py - TensorFlow GPU inference server
import tensorflow as tf
from flask import Flask, request, jsonify

app = Flask(__name__)

# Verify GPU is detected
gpus = tf.config.list_physical_devices('GPU')
print(f"GPUs available: {len(gpus)}")
for gpu in gpus:
    print(f"  {gpu}")

# Optionally limit GPU memory growth to avoid taking all memory
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# Load the SavedModel
model = tf.saved_model.load('/models/')
infer = model.signatures['serving_default']

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    input_tensor = tf.constant(data['input'], dtype=tf.float32)

    # Run inference - automatically uses GPU
    result = infer(input_tensor)

    return jsonify({
        'prediction': result['output'].numpy().tolist()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Multi-Container with GPU

You can combine a GPU container with non-GPU sidecars:

```yaml
# gpu-with-sidecar.yaml - GPU inference with a non-GPU API gateway
apiVersion: '2021-09-01'
location: eastus
name: ml-service
properties:
  containers:
    # GPU container for inference
    - name: inference
      properties:
        image: myregistry.azurecr.io/ml-model:latest
        resources:
          requests:
            cpu: 4.0
            memoryInGb: 12.0
            gpu:
              count: 1
              sku: V100
        ports:
          - port: 8081
            protocol: TCP

    # Non-GPU sidecar for request handling and batching
    - name: api-gateway
      properties:
        image: myregistry.azurecr.io/api-gateway:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 80
            protocol: TCP
        environmentVariables:
          - name: INFERENCE_URL
            value: 'http://localhost:8081'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

The API gateway handles incoming requests, batches them for efficiency, and forwards them to the inference container on `localhost:8081`.

## Verifying GPU Access

After deploying, verify that the container can see and use the GPU:

```bash
# Check GPU availability from inside the container
az container exec \
    --resource-group my-resource-group \
    --name gpu-container \
    --container-name inference-server \
    --exec-command "nvidia-smi"

# You should see output like:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 525.60.13    Driver Version: 525.60.13    CUDA Version: 12.0     |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Tesla V100-SXM2...  On   | 00000001:00:00.0 Off |                    0 |
# | N/A   31C    P0    24W / 300W |      0MiB / 16384MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

## Cost Considerations

GPU containers in ACI are significantly more expensive than CPU-only containers. Pricing depends on the GPU SKU and the region. Rough estimates:

- K80: Around $0.90/hour per GPU
- P100: Around $1.80/hour per GPU
- V100: Around $3.00/hour per GPU

Since ACI bills per second, you only pay for the time the container group exists. For batch workloads, create the container, run the job, and delete it immediately:

```bash
# Run a batch job on GPU and clean up
az container create --resource-group rg --file gpu-batch.yaml

# Wait for it to finish
az container wait --resource-group rg --name gpu-batch --created

# Delete when done
az container delete --resource-group rg --name gpu-batch --yes
```

## Performance Tips

1. **Use mixed precision (FP16)** - Most inference workloads run just as accurately with half-precision floating point, which is much faster on NVIDIA GPUs.
2. **Batch your requests** - Processing multiple inputs at once is significantly more efficient on GPUs than processing them one at a time.
3. **Optimize your model** - Use ONNX Runtime or TensorRT to optimize your model for inference. This can provide 2-5x speedups.
4. **Pre-load models** - Load your model at container startup, not on the first request. The first request should not pay the model loading cost.
5. **Monitor GPU memory** - GPU memory is limited. Make sure your model and batch sizes fit within the available GPU memory.

## Summary

GPU containers in ACI give you on-demand access to NVIDIA GPUs without managing infrastructure. They are ideal for ML inference, video processing, and other GPU-accelerated workloads that need the simplicity of serverless containers. Build your image on the NVIDIA CUDA base, deploy with the GPU SKU you need, and delete the container when you are done to keep costs under control.

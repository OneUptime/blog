# How to Deploy AI/ML Models at the Edge with K3s - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, AI, Machine Learning, Edge Computing, GPU, NVIDIA Jetson, IoT

Description: Learn how to deploy and serve AI/ML inference models at the edge using K3s on GPU-capable hardware like NVIDIA Jetson devices.

## Introduction

Edge AI/ML brings machine learning inference close to the data source, reducing latency, bandwidth costs, and privacy concerns. K3s enables containerized AI/ML workload deployment on edge devices like NVIDIA Jetson (Nano, Xavier, Orin), providing orchestration for model serving, updating, and monitoring. This guide covers deploying AI/ML inference at the edge with K3s.

## Hardware for Edge AI/ML

| Device | GPU | TOPS | Power | RAM |
|--------|-----|------|-------|-----|
| NVIDIA Jetson Nano | 128 CUDA cores | 0.5 | 5-10W | 4GB |
| NVIDIA Jetson Xavier NX | 384 CUDA cores | 21 | 10-20W | 8GB |
| NVIDIA Jetson AGX Orin 64GB | 2048 CUDA cores | 275 | 15-60W | 64GB |
| Coral Dev Board | Google Edge TPU | 4 | 2-5W | 1GB |
| Intel NUC + Iris Xe | Integrated GPU | - | 28-65W | 16GB |

## Step 1: Set Up K3s on NVIDIA Jetson

```bash
# On NVIDIA Jetson Xavier NX

# Verify CUDA is available

nvcc --version
tegrastats --interval 1000  # Ctrl+C to stop

# Install jetson-stats for monitoring
pip3 install -U jetson-stats
jtop  # Interactive Jetson monitor

# Install K3s with NVIDIA support
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="
    --disable traefik
    --node-label node-type=jetson
    --node-label hardware=nvidia-xavier
    --node-label ai-capable=true
  " \
  sh -
```

## Step 2: Install NVIDIA Device Plugin

Enable GPU access from Kubernetes pods:

```bash
# Confirm NVIDIA container runtime packages are present
# (these are typically installed with JetPack)
dpkg -l | grep -E 'nvidia-container|libnvidia-container'

# Restart K3s so it re-detects available runtimes
systemctl restart k3s

# Verify the NVIDIA runtime was added to containerd
grep nvidia /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

Deploy the NVIDIA device plugin:

```yaml
# /var/lib/rancher/k3s/server/manifests/nvidia-device-plugin.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      runtimeClassName: nvidia
      tolerations:
        - key: CriticalAddonsOnly
          operator: Exists
      priorityClassName: system-node-critical
      nodeSelector:
        ai-capable: "true"
      containers:
        - image: nvcr.io/nvidia/k8s-device-plugin:v0.17.1
          name: nvidia-device-plugin-ctr
          securityContext:
            allowPrivilegeEscalation: false
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
```

## Step 3: Deploy TensorFlow Serving for Model Inference

The official TensorFlow Serving GPU image targets x86_64 nodes with NVIDIA GPUs. On Jetson, use Triton in Step 4 for TensorFlow models instead.

```yaml
# tf-serving.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: ai-edge
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: tf-serving-config
  namespace: ai-edge
data:
  model_config.pbtxt: |
    model_config_list {
      config {
        name: "object-detector"
        base_path: "/models/object-detector"
        model_platform: "tensorflow"
      }
      config {
        name: "image-classifier"
        base_path: "/models/image-classifier"
        model_platform: "tensorflow"
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tf-serving
  namespace: ai-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tf-serving
  template:
    metadata:
      labels:
        app: tf-serving
    spec:
      runtimeClassName: nvidia
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
        - name: tf-serving
          image: tensorflow/serving:2.19.1-gpu
          imagePullPolicy: IfNotPresent
          args:
            - "--port=8500"
            - "--rest_api_port=8501"
            - "--model_config_file=/etc/tf-serving/model_config.pbtxt"
          ports:
            - containerPort: 8500  # gRPC
            - containerPort: 8501  # REST
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 4Gi
            requests:
              nvidia.com/gpu: 1
              memory: 2Gi
          volumeMounts:
            - name: models
              mountPath: /models
            - name: config
              mountPath: /etc/tf-serving
      volumes:
        - name: models
          hostPath:
            path: /data/ml-models
            type: DirectoryOrCreate
        - name: config
          configMap:
            name: tf-serving-config
---
apiVersion: v1
kind: Service
metadata:
  name: tf-serving-svc
  namespace: ai-edge
spec:
  selector:
    app: tf-serving
  ports:
    - name: grpc
      port: 8500
      targetPort: 8500
    - name: rest
      port: 8501
      targetPort: 8501
```

## Step 4: Deploy Triton Inference Server

NVIDIA Triton provides a universal model serving framework. On Jetson, use a JetPack-compatible Triton image. NVIDIA publishes `-igpu` container tags for JetPack 6.0 and later; if you are on JetPack 5.1.2, use the Jetson build based on `r23.06-update-1-jp` instead.

```yaml
# triton-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
  namespace: ai-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: triton
  template:
    metadata:
      labels:
        app: triton
    spec:
      runtimeClassName: nvidia
      nodeSelector:
        ai-capable: "true"
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:23.12-py3-igpu
          imagePullPolicy: IfNotPresent
          command:
            - tritonserver
            - --model-repository=/models
            - --log-verbose=1
            - --allow-grpc=true
            - --allow-http=true
            - --grpc-port=8001
            - --http-port=8000
            - --metrics-port=8002
          ports:
            - containerPort: 8000  # HTTP
            - containerPort: 8001  # gRPC
            - containerPort: 8002  # Metrics
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 6Gi
            requests:
              nvidia.com/gpu: 1
              memory: 3Gi
          livenessProbe:
            httpGet:
              path: /v2/health/live
              port: 8000
            initialDelaySeconds: 30
          volumeMounts:
            - name: model-repo
              mountPath: /models
      volumes:
        - name: model-repo
          hostPath:
            path: /data/triton-models
            type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: triton-svc
  namespace: ai-edge
spec:
  selector:
    app: triton
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

## Step 5: Automated Model Updates

```yaml
# model-updater-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: model-updater
  namespace: ai-edge
spec:
  # Check for model updates every 6 hours
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            ai-capable: "true"
          containers:
            - name: model-updater
              image: myregistry/model-updater:v1
              imagePullPolicy: IfNotPresent
              env:
                - name: MODEL_REGISTRY_URL
                  value: "https://model-registry.hq.example.com"
                - name: LOCAL_MODEL_DIR
                  value: "/data/triton-models"
                - name: MODEL_VERSION_CACHE
                  value: "/data/model-versions.json"
              volumeMounts:
                - name: models
                  mountPath: /data/triton-models
          volumes:
            - name: models
              hostPath:
                path: /data/triton-models
          restartPolicy: OnFailure
```

## Step 6: Edge Inference Pipeline

Deploy a complete inference pipeline:

```yaml
# video-analytics-pipeline.yaml
---
# Video capture service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-capture
  namespace: ai-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: video-capture
  template:
    metadata:
      labels:
        app: video-capture
    spec:
      nodeSelector:
        ai-capable: "true"
      containers:
        - name: capture
          image: myregistry/video-capture:v1
          imagePullPolicy: IfNotPresent
          env:
            - name: CAMERA_RTSP_URL
              value: "rtsp://192.168.1.100:554/stream"
            - name: INFERENCE_SERVICE_URL
              value: "http://triton-svc:8000"
            - name: OUTPUT_MQTT_TOPIC
              value: "edge/detections"
          securityContext:
            privileged: true  # For camera access
          volumeMounts:
            - name: video-device
              mountPath: /dev/video0
      volumes:
        - name: video-device
          hostPath:
            path: /dev/video0
            type: CharDevice
```

## Step 7: Monitor Inference Performance

```bash
# Check GPU utilization on Jetson
jtop
tegrastats --interval 1000

# In another shell, port-forward TensorFlow Serving
sudo k3s kubectl -n ai-edge port-forward svc/tf-serving-svc 8501:8501

# Check model inference latency
curl -X POST \
  http://127.0.0.1:8501/v1/models/object-detector:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [[...image data...]]}' \
  -w "\nTime: %{time_total}s\n"

# In another shell, port-forward Triton metrics
sudo k3s kubectl -n ai-edge port-forward svc/triton-svc 8002:8002

# View Triton metrics
curl http://127.0.0.1:8002/metrics | grep nv_inference
```

## Conclusion

K3s on NVIDIA Jetson and other AI-capable edge hardware enables powerful edge AI/ML inference workloads with full Kubernetes orchestration. Key advantages include automatic GPU resource allocation via device plugins, containerized model isolation, automated model updates, and the ability to run multiple models simultaneously. The combination of K3s's lightweight orchestration and GPU acceleration enables sophisticated AI/ML use cases - from real-time video analytics to sensor fusion - at the edge with minimal infrastructure overhead.

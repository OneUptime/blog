# How to Deploy Computer Vision Applications at the Edge with MicroShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Edge, Computer Vision, Kubernetes, Containers

Description: Deploy containerized computer vision workloads on edge devices running MicroShift on RHEL, using GPU passthrough and optimized container images.

---

MicroShift on RHEL provides a lightweight Kubernetes platform for running AI/ML workloads at the edge. This guide covers deploying a computer vision inference application on an edge device with MicroShift.

## Prerequisites

You need MicroShift installed on a RHEL 9 system with a supported GPU or neural processing unit. For NVIDIA GPUs, install the NVIDIA container toolkit.

## Install NVIDIA Container Support

```bash
# Add the NVIDIA container toolkit repo
curl -s -L https://nvidia.github.io/libnvidia-container/rhel9.0/libnvidia-container.repo \
  | sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

# Install the toolkit
sudo dnf install -y nvidia-container-toolkit

# Configure CRI-O to use the NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=crio
sudo systemctl restart crio
sudo systemctl restart microshift
```

## Create the Deployment Manifest

Create a Kubernetes deployment for an object detection model:

```yaml
# vision-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: object-detection
  namespace: vision
spec:
  replicas: 1
  selector:
    matchLabels:
      app: object-detection
  template:
    metadata:
      labels:
        app: object-detection
    spec:
      containers:
        - name: detector
          image: quay.io/example/yolo-inference:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              nvidia.com/gpu: 1  # Request one GPU
              memory: "2Gi"
            requests:
              memory: "1Gi"
          volumeMounts:
            - name: video-input
              mountPath: /dev/video0
          securityContext:
            privileged: true  # Needed for device access
      volumes:
        - name: video-input
          hostPath:
            path: /dev/video0
---
apiVersion: v1
kind: Service
metadata:
  name: object-detection
  namespace: vision
spec:
  type: NodePort
  selector:
    app: object-detection
  ports:
    - port: 8080
      nodePort: 30080
```

## Deploy

```bash
# Create the namespace and deploy
oc create namespace vision
oc apply -f vision-app.yaml

# Check pod status
oc get pods -n vision -w

# View logs from the inference container
oc logs -n vision deployment/object-detection
```

## Accessing the Inference Endpoint

```bash
# Test the inference API
curl http://localhost:30080/predict \
  -X POST \
  -F "image=@test-image.jpg"
```

For production edge deployments, use RHEL for Edge (rpm-ostree) with MicroShift embedded in the OS image for atomic, reliable updates.

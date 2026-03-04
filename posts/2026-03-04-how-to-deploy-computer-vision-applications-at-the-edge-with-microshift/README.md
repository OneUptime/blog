# How to Deploy Computer Vision Applications at the Edge with MicroShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, MicroShift

Description: Step-by-step guide on deploy computer vision applications at the edge with microshift with practical examples and commands.

---

MicroShift enables running computer vision applications at the edge on RHEL 9. This guide covers deploying CV workloads with MicroShift for real-time inference at edge locations.

## Prerequisites

- RHEL 9 with MicroShift installed and running
- GPU or CPU-capable hardware for inference
- Container images with your CV model
- At least 4 GB RAM for CV workloads

## Prepare the Edge Device

Ensure MicroShift is running:

```bash
sudo systemctl status microshift
oc get nodes
```

## Create a Namespace for CV Workloads

```bash
oc create namespace computer-vision
```

## Build a Computer Vision Container

Create a Containerfile for your CV application:

```dockerfile
FROM registry.access.redhat.com/ubi9/python-311

USER root
RUN dnf install -y mesa-libGL && dnf clean all

USER 1001
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

CMD ["python", "app/inference_server.py"]
```

Build with Podman:

```bash
podman build -t localhost/cv-inference:latest .
```

## Deploy the CV Application

```yaml
# cv-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cv-inference
  namespace: computer-vision
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cv-inference
  template:
    metadata:
      labels:
        app: cv-inference
    spec:
      containers:
      - name: inference
        image: localhost/cv-inference:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2"
        volumeMounts:
        - name: camera-device
          mountPath: /dev/video0
      volumes:
      - name: camera-device
        hostPath:
          path: /dev/video0
          type: CharDevice
```

Apply the deployment:

```bash
oc apply -f cv-deployment.yaml
```

## Expose the Inference Service

```yaml
# cv-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cv-inference
  namespace: computer-vision
spec:
  selector:
    app: cv-inference
  ports:
  - port: 8080
    targetPort: 8080
  type: NodePort
```

```bash
oc apply -f cv-service.yaml
```

## Monitor Edge CV Workloads

```bash
oc -n computer-vision get pods
oc -n computer-vision logs deployment/cv-inference
oc -n computer-vision top pods
```

## Configure Resource Limits

For edge devices with limited resources, set resource quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cv-quota
  namespace: computer-vision
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
```

## Conclusion

MicroShift on RHEL 9 provides a lightweight Kubernetes platform for deploying computer vision applications at the edge. This approach allows you to run inference workloads close to data sources with minimal infrastructure overhead.


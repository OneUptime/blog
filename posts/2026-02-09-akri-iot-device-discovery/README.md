# How to Deploy Akri on Kubernetes for Automatic Discovery of Edge IoT Leaf Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IoT, Edge Computing

Description: Learn how to deploy Akri on Kubernetes to automatically discover and manage edge IoT leaf devices like USB cameras, Bluetooth sensors, and OPC UA devices, enabling dynamic device-as-resource allocation for edge workloads.

---

Edge deployments often involve dynamic hardware that comes and goes: USB cameras plugged into kiosks, Bluetooth sensors moving through warehouses, or industrial equipment connecting via OPC UA. Manually configuring each device is tedious and error-prone. Akri automates IoT device discovery and exposes devices as Kubernetes resources that pods can request.

In this guide, you'll deploy Akri on an edge Kubernetes cluster, configure device discovery protocols, and build applications that automatically consume discovered devices.

## Understanding Akri Architecture

Akri (A Kubernetes Resource Interface) discovers IoT devices and represents them as custom Kubernetes resources. When devices are found, Akri creates:

- Device CRs representing physical devices
- Configuration CRs defining discovery protocols
- Instance CRs linking devices to pods

Pods request devices through resource limits, and Kubernetes schedules them on nodes where devices are present.

## Installing Akri

Install Akri using Helm:

```bash
# Add Akri Helm repository
helm repo add akri-helm-charts https://project-akri.github.io/akri/
helm repo update

# Install Akri with discovery handlers
helm install akri akri-helm-charts/akri \
  --set agent.enabled=true \
  --set controller.enabled=true \
  --set udev.discovery.enabled=true \
  --set opcua.discovery.enabled=true \
  --namespace akri --create-namespace
```

Verify installation:

```bash
kubectl get pods -n akri
kubectl get crds | grep akri
```

You should see akri-agent pods on each node and akri-controller running.

## Discovering USB Cameras with ONVIF

Configure Akri to discover IP cameras using ONVIF protocol:

```yaml
# onvif-configuration.yaml
apiVersion: akri.sh/v0
kind: Configuration
metadata:
  name: onvif-cameras
spec:
  discoveryHandler:
    name: onvif
    discoveryDetails: |+
      ipAddresses:
        action: Include
        items:
        - 192.168.1.0/24
      macAddresses:
        action: Exclude
        items: []
  brokerPodSpec:
    containers:
    - name: camera-broker
      image: nginx:alpine
      resources:
        requests:
          "{{PLACEHOLDER}}": "1"
        limits:
          "{{PLACEHOLDER}}": "1"
  instanceServiceSpec:
    type: ClusterIP
    ports:
    - name: rtsp
      port: 8554
      protocol: TCP
      targetPort: 8554
  capacity: 1  # How many pods can share each device
```

Apply the configuration:

```bash
kubectl apply -f onvif-configuration.yaml -n akri
```

Akri discovers ONVIF cameras on the network and creates Instance resources.

## Discovering USB Devices with udev

Configure USB device discovery:

```yaml
# usb-camera-configuration.yaml
apiVersion: akri.sh/v0
kind: Configuration
metadata:
  name: usb-cameras
spec:
  discoveryHandler:
    name: udev
    discoveryDetails: |+
      udevRules:
      - 'KERNEL=="video[0-9]*"'
  brokerPodSpec:
    containers:
    - name: usb-broker
      image: your-registry/camera-broker:v1
      securityContext:
        privileged: true
      volumeMounts:
      - name: dev-video
        mountPath: /dev/video0
      resources:
        requests:
          "{{PLACEHOLDER}}": "1"
        limits:
          "{{PLACEHOLDER}}": "1"
    volumes:
    - name: dev-video
      hostPath:
        path: "{{PLACEHOLDER}}"
  capacity: 2  # Two pods can share USB camera
```

Apply:

```bash
kubectl apply -f usb-camera-configuration.yaml -n akri
```

## Discovering OPC UA Devices

For industrial equipment using OPC UA:

```yaml
# opcua-configuration.yaml
apiVersion: akri.sh/v0
kind: Configuration
metadata:
  name: opcua-devices
spec:
  discoveryHandler:
    name: opcua
    discoveryDetails: |+
      discoveryUrls:
      - "opc.tcp://192.168.1.100:4840"
      - "opc.tcp://192.168.1.101:4840"
      applicationNames:
        action: Include
        items:
        - "PLC-Controller"
        - "Temperature-Sensor"
  brokerPodSpec:
    containers:
    - name: opcua-broker
      image: your-registry/opcua-broker:v1
      env:
      - name: OPCUA_ENDPOINT
        value: "{{PLACEHOLDER}}"
      resources:
        requests:
          "{{PLACEHOLDER}}": "1"
        limits:
          "{{PLACEHOLDER}}": "1"
  instanceServiceSpec:
    type: ClusterIP
    ports:
    - name: metrics
      port: 9090
  capacity: 1
```

## Building a Device-Aware Application

Create an application that requests discovered devices:

```yaml
# camera-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: camera-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: camera-processor
  template:
    metadata:
      labels:
        app: camera-processor
    spec:
      containers:
      - name: processor
        image: your-registry/camera-processor:v1
        resources:
          requests:
            akri.sh/usb-cameras: "1"  # Request USB camera
          limits:
            akri.sh/usb-cameras: "1"
        env:
        - name: CAMERA_ENDPOINT
          valueFrom:
            configMapKeyRef:
              name: akri-usb-cameras-svc
              key: CAMERA_SVC_URL
```

Kubernetes automatically schedules pods only on nodes with available cameras.

## Accessing Device Services

Akri creates services for each discovered device:

```bash
# List device services
kubectl get services -n akri -l akri.sh/configuration=usb-cameras

# Access device from application
CAMERA_SVC=$(kubectl get svc -n akri -l akri.sh/instance=usb-camera-abc -o jsonpath='{.items[0].metadata.name}')
curl http://$CAMERA_SVC.akri.svc:8554/stream
```

## Implementing Custom Discovery Handler

For proprietary devices, create a custom discovery handler:

```dockerfile
# custom-discovery-handler/Dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/my-discovery-handler /usr/local/bin/
CMD ["my-discovery-handler"]
```

Register the handler:

```yaml
# custom-handler-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-discovery-handler
  namespace: akri
spec:
  selector:
    matchLabels:
      app: my-discovery-handler
  template:
    metadata:
      labels:
        app: my-discovery-handler
    spec:
      containers:
      - name: handler
        image: your-registry/my-discovery-handler:v1
        securityContext:
          privileged: true
        volumeMounts:
        - name: discovery-socket
          mountPath: /var/lib/akri
      volumes:
      - name: discovery-socket
        hostPath:
          path: /var/lib/akri
```

## Monitoring Device Discovery

Watch for device changes:

```bash
# Watch discovered instances
kubectl get akrii -n akri -w

# Check device details
kubectl describe akrii -n akri
```

Create alerts for device failures:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: akri-alerts
spec:
  groups:
  - name: akri-devices
    rules:
    - alert: DeviceLost
      expr: akri_instance_count < 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Expected device not discovered"
```

## Handling Device Failover

When devices disconnect, Akri automatically reschedules pods:

```yaml
# Deployment with automatic failover
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-camera-app
spec:
  replicas: 5  # More replicas than cameras for failover
  selector:
    matchLabels:
      app: camera-app
  template:
    spec:
      containers:
      - name: app
        image: camera-app:v1
        resources:
          requests:
            akri.sh/usb-cameras: "1"
```

When a camera disconnects, affected pods terminate and Kubernetes reschedules them to nodes with working cameras.

## Implementing Device Priority

Prioritize certain devices:

```yaml
apiVersion: akri.sh/v0
kind: Configuration
metadata:
  name: priority-cameras
  annotations:
    priority: "high"
spec:
  discoveryHandler:
    name: onvif
    discoveryDetails: |+
      ipAddresses:
        items:
        - 192.168.1.100  # Critical camera
  capacity: 1  # Exclusive access
```

## Creating Device Broker Images

Build broker containers that interface with devices:

```python
# camera-broker.py
from flask import Flask, Response
import cv2

app = Flask(__name__)

@app.route('/stream')
def stream():
    camera = cv2.VideoCapture(0)

    def generate():
        while True:
            success, frame = camera.read()
            if not success:
                break
            ret, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' +
                   bytearray(buffer) + b'\r\n')

    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8554)
```

## Scaling Device Usage

For high-availability device access:

```yaml
spec:
  capacity: 5  # Allow 5 pods per device
  brokerPodSpec:
    containers:
    - name: shared-broker
      image: device-broker:v1
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
```

## Conclusion

Akri transforms IoT device management by treating devices as Kubernetes resources with automatic discovery and lifecycle management. This approach eliminates manual device configuration, enables dynamic scaling, and provides consistent device access patterns across edge deployments.

Start with a few well-defined device types, validate discovery and failover behavior, then expand to your complete device catalog. The combination of automatic discovery and Kubernetes scheduling creates flexible edge architectures that adapt to changing hardware topology.

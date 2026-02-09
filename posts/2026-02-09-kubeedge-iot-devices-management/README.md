# How to Deploy KubeEdge for Managing IoT Devices from a Central Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IoT, Edge Computing

Description: Learn how to deploy KubeEdge to manage IoT devices and edge nodes from a central Kubernetes cluster, enabling cloud-native device management with offline capabilities and efficient resource utilization.

---

Managing thousands of IoT devices across distributed edge locations is complex. Traditional approaches require custom protocols, device-specific management tools, and complex synchronization logic. KubeEdge solves this by extending Kubernetes to the edge, allowing you to manage IoT devices using standard Kubernetes APIs.

In this guide, you'll set up KubeEdge to manage IoT devices from a central cloud cluster, configure device twins for state synchronization, and deploy applications that interact with edge devices.

## Understanding KubeEdge Architecture

KubeEdge consists of two main components:

1. **CloudCore**: Runs in your Kubernetes cluster, extends the API server to edge nodes
2. **EdgeCore**: Runs on edge nodes, manages containers and device interactions

KubeEdge also includes device management through the Device Twin pattern, allowing you to model physical devices as Kubernetes custom resources and sync their state bidirectionally.

This architecture lets you use `kubectl` to deploy applications to edge nodes and manage IoT devices, even when edge nodes are intermittently connected.

## Prerequisites

You need:

- A Kubernetes cluster (v1.24+) for the cloud side
- Edge nodes running Linux with container runtime (Docker or containerd)
- Network connectivity between cloud and edge (can be intermittent)
- At least 1GB RAM per edge node

## Installing KubeEdge Cloud Components

First, install CloudCore in your Kubernetes cluster using keadm:

```bash
# Download keadm
wget https://github.com/kubeedge/kubeedge/releases/download/v1.16.0/keadm-v1.16.0-linux-amd64.tar.gz
tar -xzf keadm-v1.16.0-linux-amd64.tar.gz
sudo cp keadm-v1.16.0-linux-amd64/keadm/keadm /usr/local/bin/
sudo chmod +x /usr/local/bin/keadm

# Install CloudCore
keadm init --advertise-address=<your-k8s-api-ip> --kubeedge-version=1.16.0
```

This creates the CloudCore deployment and required CRDs. Verify installation:

```bash
kubectl get pods -n kubeedge
```

You should see cloudcore pods running.

Generate a token for edge nodes to join:

```bash
keadm gettoken
```

Save this token for edge node registration.

## Installing Device CRDs

KubeEdge manages IoT devices through custom resources. Install the device model CRDs:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_device.yaml
kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_devicemodel.yaml
```

These CRDs allow you to define device types and instances in Kubernetes.

## Deploying EdgeCore on Edge Nodes

On each edge node, install EdgeCore:

```bash
# Install container runtime if not present
sudo apt update
sudo apt install -y containerd

# Install EdgeCore
wget https://github.com/kubeedge/kubeedge/releases/download/v1.16.0/keadm-v1.16.0-linux-amd64.tar.gz
tar -xzf keadm-v1.16.0-linux-amd64.tar.gz
sudo cp keadm-v1.16.0-linux-amd64/keadm/keadm /usr/local/bin/

# Join the cloud cluster
sudo keadm join \
  --cloudcore-ipport=<cloudcore-ip>:10000 \
  --edgenode-name=edge-node-01 \
  --token=<token-from-gettoken> \
  --kubeedge-version=1.16.0
```

The edge node registers with CloudCore and appears in your cluster:

```bash
kubectl get nodes
```

You'll see the edge node listed with the role `agent`.

## Defining a Device Model

Device models describe the capabilities and properties of device types. Create a temperature sensor model:

```yaml
# temperature-sensor-model.yaml
apiVersion: devices.kubeedge.io/v1beta1
kind: DeviceModel
metadata:
  name: temperature-sensor-model
  namespace: default
spec:
  properties:
    - name: temperature
      description: Current temperature reading
      type:
        int:
          accessMode: ReadOnly
          unit: celsius
    - name: humidity
      description: Current humidity percentage
      type:
        int:
          accessMode: ReadOnly
          unit: percent
    - name: sampling-rate
      description: Sampling interval in seconds
      type:
        int:
          accessMode: ReadWrite
          defaultValue: 60
```

Apply the model:

```bash
kubectl apply -f temperature-sensor-model.yaml
```

## Creating Device Instances

Define actual device instances using the model:

```yaml
# temperature-sensor-instance.yaml
apiVersion: devices.kubeedge.io/v1beta1
kind: Device
metadata:
  name: temp-sensor-01
  namespace: default
spec:
  deviceModelRef:
    name: temperature-sensor-model
  nodeName: edge-node-01  # Which edge node this device is attached to
  protocol:
    modbus:
      slaveID: 1
    common:
      com:
        serialPort: /dev/ttyUSB0
        baudRate: 9600
        dataBits: 8
        parity: none
        stopBits: 1
  propertyVisitors:
    - propertyName: temperature
      modbus:
        register: holding
        offset: 0
        limit: 1
        scale: 0.1
        isSwap: false
    - propertyName: humidity
      modbus:
        register: holding
        offset: 1
        limit: 1
        scale: 0.1
        isSwap: false
    - propertyName: sampling-rate
      modbus:
        register: holding
        offset: 2
        limit: 1
```

Apply the device:

```bash
kubectl apply -f temperature-sensor-instance.yaml
```

KubeEdge creates a device twin that syncs state between the cloud and the physical device.

## Deploying a Device Mapper

Device mappers translate between device protocols and KubeEdge APIs. Deploy a Modbus mapper for our sensors:

```yaml
# modbus-mapper.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: modbus-mapper
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: modbus-mapper
  template:
    metadata:
      labels:
        app: modbus-mapper
    spec:
      nodeName: edge-node-01  # Run on the edge node
      hostNetwork: true
      containers:
        - name: mapper
          image: kubeedge/modbus-mapper:latest
          env:
            - name: LOG_LEVEL
              value: "info"
          volumeMounts:
            - name: device-config
              mountPath: /etc/kubeedge/config
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
      volumes:
        - name: device-config
          configMap:
            name: modbus-config
```

Apply the mapper:

```bash
kubectl apply -f modbus-mapper.yaml
```

The mapper reads device data and updates the device twin in the cloud.

## Reading Device Twin Data

Query device state from the cloud:

```bash
# Get device status
kubectl get device temp-sensor-01 -o yaml

# Watch for property updates
kubectl get device temp-sensor-01 -o jsonpath='{.status.twins}' -w
```

The device twin shows current property values:

```yaml
status:
  twins:
    - propertyName: temperature
      desired:
        metadata:
          type: int
        value: "0"
      reported:
        metadata:
          timestamp: "1707494400000"
          type: int
        value: "22"
    - propertyName: humidity
      reported:
        value: "65"
```

## Updating Device Configuration

Modify device properties from the cloud:

```bash
# Update sampling rate
kubectl patch device temp-sensor-01 --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/propertyVisitors/2/desiredValue",
    "value": "30"
  }
]'
```

KubeEdge syncs this change to the edge node, and the mapper writes it to the physical device.

## Deploying Edge Applications

Deploy applications that consume device data:

```yaml
# temperature-monitor-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temperature-monitor
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: temp-monitor
  template:
    metadata:
      labels:
        app: temp-monitor
    spec:
      nodeName: edge-node-01
      containers:
        - name: monitor
          image: python:3.11-slim
          command:
            - python
            - -c
            - |
              import time
              import json
              from kubernetes import client, config, watch

              # Load in-cluster config
              config.load_incluster_config()
              api = client.CustomObjectsApi()

              print("Monitoring temperature sensor...")

              # Watch device twin updates
              w = watch.Watch()
              for event in w.stream(
                api.list_namespaced_custom_object,
                group="devices.kubeedge.io",
                version="v1beta1",
                namespace="default",
                plural="devices",
                field_selector="metadata.name=temp-sensor-01"
              ):
                device = event['object']
                twins = device.get('status', {}).get('twins', [])

                for twin in twins:
                  if twin['propertyName'] == 'temperature':
                    temp = int(twin.get('reported', {}).get('value', 0))
                    print(f"Temperature: {temp}C")

                    if temp > 30:
                      print("WARNING: High temperature detected!")
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
```

Apply the application:

```bash
kubectl apply -f temperature-monitor-app.yaml
```

This app runs at the edge, reacting to device data with minimal latency.

## Configuring Offline Autonomy

KubeEdge edge nodes continue operating when disconnected from the cloud. Configure offline behavior:

```yaml
# Edit EdgeCore config on edge nodes
sudo vi /etc/kubeedge/config/edgecore.yaml

# Update modules:
modules:
  edged:
    enable: true
    podSandboxImage: kubeedge/pause:3.1
    # Cache timeout for offline operation
    imageGCHighThreshold: 80
    imageGCLowThreshold: 40
  metaManager:
    enable: true
    # Metadata sync settings
    metaServer:
      enable: true
```

Restart EdgeCore:

```bash
sudo systemctl restart edgecore
```

Now, edge nodes cache workload definitions and continue running applications during network outages.

## Setting Up Device Data Routing

Route device data to cloud services using KubeEdge router:

```yaml
# device-router-rule.yaml
apiVersion: rules.kubeedge.io/v1
kind: Rule
metadata:
  name: temp-data-to-cloud
  namespace: default
spec:
  source: "temp-sensor-01"
  sourceResource:
    path: "status.twins"
  target: "http://cloud-analytics.default.svc:8080/ingest"
  targetResource:
    resource: "http"
```

Apply the rule:

```bash
kubectl apply -f device-router-rule.yaml
```

Device data automatically forwards to cloud analytics services.

## Monitoring Edge Nodes and Devices

Monitor KubeEdge components:

```bash
# Check edge node health
kubectl get nodes -l node-role.kubernetes.io/edge

# View device status
kubectl get devices

# Check mapper logs
kubectl logs -l app=modbus-mapper

# View EdgeCore logs on edge nodes
sudo journalctl -u edgecore -f
```

Create alerts for offline nodes:

```yaml
# edge-node-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: edge-node-alerts
spec:
  groups:
    - name: edge-nodes
      rules:
        - alert: EdgeNodeOffline
          expr: up{job="kubeedge-node"} == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Edge node offline"
```

## Scaling to Many Devices

For large-scale deployments with thousands of devices:

```yaml
# Use label selectors for batch operations
kubectl get devices -l location=warehouse-a

# Automate device registration
apiVersion: batch/v1
kind: CronJob
metadata:
  name: device-discovery
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: discovery
              image: your-registry/device-discoverer:latest
              command: ["python", "/app/discover_devices.py"]
```

## Conclusion

KubeEdge transforms IoT device management by bringing Kubernetes abstractions to the edge. By modeling devices as Kubernetes resources, you gain consistent APIs, built-in state synchronization, and cloud-native tooling for managing distributed IoT fleets.

Start with a handful of devices to validate your setup, test offline scenarios thoroughly, and gradually expand to your full device fleet. The combination of device twins, mappers, and edge autonomy creates a robust foundation for large-scale IoT deployments.

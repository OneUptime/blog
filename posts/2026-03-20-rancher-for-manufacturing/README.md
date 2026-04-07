# How to Set Up Rancher for Manufacturing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Manufacturing, OT, IIoT, Edge, Industry 4.0, Kubernetes

Description: Configure Rancher for manufacturing Industry 4.0 environments with OT/IT convergence, edge computing for factory floor systems, air-gapped deployments, and integration with industrial protocols...

## Introduction

Manufacturing Kubernetes deployments bridge IT and OT (Operational Technology) networks. Workloads include industrial IoT data collection, real-time machine monitoring, predictive maintenance ML models, and MES (Manufacturing Execution System) integration. Rancher manages the Kubernetes layer across cloud, on-premises data centers, and factory floor edge nodes.

## Manufacturing Architecture

```text
Cloud
┌───────────────────────────────────────┐
│  Digital Twin Platform                │
│  ML Inference (predictive maintenance)│
│  Enterprise MES Integration           │
└──────────────────┬────────────────────┘
                   │ VPN / SD-WAN
On-Premises Plant IT Network
┌──────────────────┴────────────────────┐
│  Rancher Management                   │
│  SCADA Integration                    │
└──────────────────┬────────────────────┘
                   │ DMZ / Firewall
OT Network (Air-Gapped)
┌──────────────────┴────────────────────┐
│  Factory Floor K3s Clusters           │
│  MQTT Broker, OPC-UA Adapter          │
│  PLC Data Collection                  │
└───────────────────────────────────────┘
```

## Step 1: Deploy Factory Floor Edge Clusters

```bash
# K3s on industrial PCs (ruggedized hardware)

# Often air-gapped, requires private registry

# Install K3s with air-gapped private registry
cat > /etc/rancher/k3s/registries.yaml << 'EOF'
mirrors:
  "docker.io":
    endpoint:
      - "https://registry.plant.internal:5000"
  "registry.rancher.com":
    endpoint:
      - "https://registry.plant.internal:5000"
EOF

curl -sfL https://get.k3s.io | sh -
# K3s automatically reads /etc/rancher/k3s/registries.yaml at startup
```

## Step 2: Deploy Industrial IoT Data Collection

```yaml
# MQTT broker for PLC/sensor data ingestion
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto-broker
  namespace: iiot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mosquitto-broker
  template:
    metadata:
      labels:
        app: mosquitto-broker
    spec:
      containers:
        - name: mosquitto
          image: eclipse-mosquitto:2.0
          ports:
            - containerPort: 1883    # MQTT
            - containerPort: 8883    # MQTT over TLS
          volumeMounts:
            - name: config
              mountPath: /mosquitto/config
---
# OPC-UA to MQTT adapter
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opcua-adapter
  namespace: iiot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opcua-adapter
  template:
    metadata:
      labels:
        app: opcua-adapter
    spec:
      containers:
        - name: adapter
          image: myregistry/opcua-mqtt-adapter:1.2.0
          env:
            - name: OPCUA_ENDPOINT
              value: "opc.tcp://plc-line-1.ot.plant.internal:4840"
            - name: MQTT_BROKER
              value: "mosquitto-broker.iiot.svc.cluster.local"
            - name: POLLING_INTERVAL_MS
              value: "100"    # 100ms polling for real-time data
```

## Step 3: Real-Time Machine Monitoring Dashboard

```yaml
# TimescaleDB for time-series machine data
helm install timescaledb timescale/timescaledb-single \
  --namespace iiot \
  --set replicaCount=1 \
  --set persistence.size=500Gi \
  --set persistence.storageClass=local-ssd

# Grafana dashboard for factory floor
apiVersion: v1
kind: ConfigMap
metadata:
  name: factory-dashboard
  namespace: iiot
  labels:
    grafana_dashboard: "1"
data:
  factory.json: |
    {
      "title": "Factory Line 1 - Real Time",
      "panels": [
        {"type": "stat", "title": "OEE", "targets": [...]},
        {"type": "timeseries", "title": "Machine Speed (RPM)"},
        {"type": "alert", "title": "Fault Alarms"}
      ]
    }
```

## Step 4: Predictive Maintenance ML

```yaml
# Deploy ML inference for anomaly detection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-maintenance
  namespace: iiot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: predictive-maintenance
  template:
    metadata:
      labels:
        app: predictive-maintenance
    spec:
      containers:
        - name: inference
          image: myregistry/pm-model:v1.3.0
          resources:
            limits:
              memory: "2Gi"
              cpu: "2"
          env:
            - name: MODEL_PATH
              value: "/models/vibration-anomaly-v3.pkl"
            - name: MQTT_SUBSCRIBE
              value: "sensors/vibration/#"
            - name: ALERT_WEBHOOK
              value: "http://alertmanager.monitoring.svc:9093"
```

## Step 5: OT/IT Network Segmentation

```yaml
# NetworkPolicy to enforce OT/IT boundary
# Only specific pods can communicate with OT network
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ot-access-restricted
  namespace: iiot
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    # Only MQTT adapter can reach OT network
    - to:
        - podSelector:
            matchLabels:
              role: ot-connector
    # DNS allowed
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
```

## Step 6: Resilient Edge Operations

```yaml
# PodDisruptionBudget for critical factory applications
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-manufacturing-pdb
  namespace: iiot
spec:
  minAvailable: 1
  selector:
    matchLabels:
      criticality: high

# Local data buffering during connectivity loss
# MQTT retained messages + local TimescaleDB
# ensures no sensor data is lost during network outages
```

## Manufacturing-Specific Considerations

- **Real-time requirements**: Use node affinity to pin latency-sensitive workloads to isolated nodes
- **24/7 operations**: Use PodDisruptionBudgets to prevent disruption during maintenance windows
- **Compliance**: IEC 62443 for industrial cybersecurity; integrate with security scanning
- **Long hardware lifecycles**: K3s runs on older hardware; air-gapped updates via USB

## Conclusion

Rancher with K3s enables Industry 4.0 digital transformation by bringing cloud-native tooling to factory floors. The architecture bridges OT and IT networks safely, with IoT data collection via MQTT and OPC-UA adapters, real-time dashboards in Grafana, and ML inference for predictive maintenance. Fleet manages consistent deployments across all factory edge clusters from a central Rancher instance, reducing the operational burden of managing distributed manufacturing IT.

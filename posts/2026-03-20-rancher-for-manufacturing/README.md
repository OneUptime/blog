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

# After pushing the required K3s images to the plant registry and copying
# the K3s binary plus install.sh onto the node:
mkdir -p /etc/rancher/k3s

cat > /etc/rancher/k3s/registries.yaml << 'EOF'
mirrors:
  "docker.io":
    endpoint:
      - "https://registry.plant.internal:5000"
  "registry.rancher.com":
    endpoint:
      - "https://registry.plant.internal:5000"
EOF

INSTALL_K3S_SKIP_DOWNLOAD=true \
  INSTALL_K3S_EXEC="server --disable-default-registry-endpoint" \
  ./install.sh
# K3s automatically reads /etc/rancher/k3s/registries.yaml at startup
```

## Step 2: Deploy Industrial IoT Data Collection

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: iiot
---
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
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto-broker
  namespace: iiot
spec:
  selector:
    app: mosquitto-broker
  ports:
    - name: mqtt
      port: 1883
      targetPort: 1883
    - name: mqtts
      port: 8883
      targetPort: 8883
---
# OPC UA to MQTT adapter
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
          image: registry.plant.internal:5000/opcua-mqtt-adapter:1.2.0
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
apiVersion: v1
kind: Secret
metadata:
  name: timescaledb-auth
  namespace: iiot
type: Opaque
stringData:
  POSTGRES_PASSWORD: change-me
---
apiVersion: v1
kind: Service
metadata:
  name: timescaledb
  namespace: iiot
spec:
  selector:
    app: timescaledb
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
  namespace: iiot
spec:
  serviceName: timescaledb
  replicas: 1
  selector:
    matchLabels:
      app: timescaledb
  template:
    metadata:
      labels:
        app: timescaledb
    spec:
      containers:
        - name: timescaledb
          image: timescale/timescaledb:latest-pg17
          env:
            - name: POSTGRES_USER
              value: postgres
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-auth
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              value: iiot
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-ssd
        resources:
          requests:
            storage: 500Gi

---
# Grafana dashboard for factory floor (Grafana Helm sidecar provisioning)
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
      "uid": "factory-line-1",
      "title": "Factory Line 1 - Real Time",
      "schemaVersion": 39,
      "version": 1,
      "refresh": "5s",
      "panels": [
        {
          "id": 1,
          "type": "stat",
          "title": "OEE",
          "gridPos": {"h": 6, "w": 8, "x": 0, "y": 0},
          "targets": []
        },
        {
          "id": 2,
          "type": "timeseries",
          "title": "Machine Speed (RPM)",
          "gridPos": {"h": 8, "w": 16, "x": 8, "y": 0},
          "targets": []
        },
        {
          "id": 3,
          "type": "alertlist",
          "title": "Fault Alarms",
          "gridPos": {"h": 8, "w": 24, "x": 0, "y": 6}
        }
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
          image: registry.plant.internal:5000/pm-model:v1.3.0
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
              value: "http://alertmanager.monitoring.svc:9093/api/v2/alerts"
```

## Step 5: OT/IT Network Segmentation

```yaml
# NetworkPolicy to restrict OT connector egress
# Connector pods can reach the OT subnet and DNS only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ot-access-restricted
  namespace: iiot
spec:
  podSelector:
    matchLabels:
      role: ot-connector
  policyTypes: [Egress]
  egress:
    - to:
        - ipBlock:
            cidr: 10.20.30.0/24
      ports:
        - port: 1883
          protocol: TCP
        - port: 4840
          protocol: TCP
    # DNS allowed
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
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
# Use local broker persistence + local TimescaleDB
# to buffer data during WAN outages
```

## Manufacturing-Specific Considerations

- **Real-time requirements**: Use node affinity to pin latency-sensitive workloads to isolated nodes
- **24/7 operations**: Use PodDisruptionBudgets to limit voluntary disruption during maintenance windows
- **Compliance**: IEC 62443 for industrial cybersecurity; integrate with security scanning
- **Long hardware lifecycles**: K3s runs on older hardware; air-gapped updates via USB

## Conclusion

Rancher with K3s enables Industry 4.0 digital transformation by bringing cloud-native tooling to factory floors. The architecture bridges OT and IT networks safely, with IoT data collection via MQTT and OPC-UA adapters, real-time dashboards in Grafana, and ML inference for predictive maintenance. Fleet manages consistent deployments across all factory edge clusters from a central Rancher instance, reducing the operational burden of managing distributed manufacturing IT.

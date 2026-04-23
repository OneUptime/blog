# How to Set Up Rancher for Manufacturing - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Manufacturing, IoT, Edge, Kubernetes, Industry4

Description: A guide to deploying Rancher for manufacturing environments, covering IIoT data collection, OT/IT integration, edge cluster management, and production floor monitoring.

## Overview

Manufacturing organizations are adopting Industry 4.0 principles, deploying containerized applications at the edge to collect IIoT sensor data, run ML inference on production lines, and integrate OT (Operational Technology) networks with IT systems. Rancher provides the multi-cluster management capabilities needed to manage factory-floor edge clusters at scale. This guide covers the key configurations for manufacturing environments.

## Architecture

```text
Enterprise Data Center
└── Rancher Management (RKE2 HA)
    ├── MES (Manufacturing Execution System)
    ├── SCADA integration
    └── ERP connectors

Factory Floor (per facility)
└── RKE2 Cluster (3 nodes)
    ├── OPC-UA Gateway
    ├── Data historian
    └── ML inference engines

Production Line (per line)
└── K3s Cluster (1-2 nodes)
    ├── PLC interface
    ├── Quality inspection (CV)
    └── Predictive maintenance
```

## Step 1: Deploy Edge Clusters on Production Lines

K3s clusters on production line hardware:

```bash
# Install K3s on production line server
# Disable the bundled Traefik ingress controller in the OT zone
# Use the OT network interface for flannel traffic

curl -sfL https://get.k3s.io | sh -s - \
  --node-label="location=factory-floor" \
  --node-label="facility=plant-01" \
  --node-label="line=line-a" \
  --node-label="zone=ot" \
  --disable=traefik \
  --flannel-iface=eth0
```

## Step 2: OPC-UA Gateway Deployment

Interface with PLCs and SCADA systems via OPC-UA:

```yaml
# OPC-UA to Kafka bridge deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opcua-gateway
  namespace: iot-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opcua-gateway
  template:
    metadata:
      labels:
        app: opcua-gateway
    spec:
      containers:
        - name: opcua-bridge
          image: registry.factory.internal/opcua-kafka-bridge:v2.1.0
          env:
            - name: OPCUA_ENDPOINT
              value: "opc.tcp://plc-line-a.ot.factory.internal:4840"
            - name: KAFKA_BROKERS
              value: "kafka.factory.internal:9092"
            - name: POLL_INTERVAL_MS
              value: "100"   # 100ms polling for real-time data
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
          # Real-time priority
          securityContext:
            capabilities:
              add: ["SYS_NICE"]   # Allow setting process priority
```

## Step 3: Computer Vision Quality Inspection

```yaml
# GPU-accelerated quality inspection deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quality-inspection
  namespace: manufacturing-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: quality-inspection
  template:
    metadata:
      labels:
        app: quality-inspection
    spec:
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
        - name: cv-inspector
          image: registry.factory.internal/quality-cv:v1.3.0
          env:
            - name: MODEL_PATH
              value: "/models/defect-detection-v3.onnx"
            - name: CONFIDENCE_THRESHOLD
              value: "0.95"
            - name: CAMERA_URL
              value: "rtsp://camera-line-a.ot.factory.internal:554"
          resources:
            requests:
              memory: "4Gi"
              nvidia.com/gpu: 1
            limits:
              memory: "8Gi"
              nvidia.com/gpu: 1
```

## Step 4: OT/IT Network Segmentation

Manufacturing environments require strict OT/IT network separation:

```yaml
# NetworkPolicy: default-deny ingress and restrict OT egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ot-zone-isolation
  namespace: iot-edge
spec:
  podSelector: {}
  egress:
    # Pods in this namespace can only talk to the data aggregator
    - to:
        - namespaceSelector:
            matchLabels:
              zone: data-aggregation
      ports:
        - port: 9092    # Kafka only
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
  policyTypes:
    - Egress
    - Ingress
```

## Step 5: Predictive Maintenance Application

```yaml
# Predictive maintenance deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-maintenance
  namespace: manufacturing-ai
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
        - name: pred-maintenance
          image: registry.factory.internal/pred-maintenance:v2.0.0
          env:
            - name: SENSOR_TOPIC
              value: "factory.sensors.vibration"
            - name: ALERT_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: maintenance-secrets
                  key: alert-webhook
            - name: MODEL_UPDATE_INTERVAL
              value: "3600"   # Re-train model hourly
```

## Step 6: Fleet Management for Factory Updates

```yaml
# Fleet: Separate target for line A and a broader factory-floor target
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: production-line-apps
  namespace: fleet-default
spec:
  repo: https://git.factory.internal/production-apps
  branch: production
  targets:
    # Dedicated target for line A
    - name: test-line
      clusterSelector:
        matchLabels:
          line: line-a
    # Broader factory-floor target
    - name: all-production-lines
      clusterSelector:
        matchLabels:
          location: factory-floor
```

## Step 7: Industrial Monitoring with Prometheus

```yaml
# PrometheusRule for production KPI monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: manufacturing-kpis
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: oee-metrics
      rules:
        # Overall Equipment Effectiveness (OEE) alert
        - alert: LowOEE
          expr: manufacturing_oee_percentage < 0.75
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "OEE below 75% on line {{ $labels.production_line }}"
        # Defect rate alert
        - alert: HighDefectRate
          expr: manufacturing_defect_rate > 0.02
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Defect rate exceeded 2% - triggering quality hold"
```

## Step 8: Longhorn Storage for Edge Data

```yaml
# StorageClass for local sensor data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-local
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "1"      # Single replica on edge (no HA for local cache)
  staleReplicaTimeout: "2880"
reclaimPolicy: Retain        # Retain the PV and backing volume after PVC deletion for recovery
```

## Conclusion

Rancher provides a compelling platform for manufacturing environments with its edge-first K3s distribution, Fleet centralized management, and support for GPU workloads. The ability to manage hundreds of production line clusters from a single Rancher UI, enforce configurations via GitOps with Fleet, and monitor production KPIs with Prometheus provides a solid Industry 4.0 infrastructure. OT/IT security boundaries must be carefully enforced through network policies and separate namespaces, and always coordinate with your OT security team when connecting to PLC and SCADA systems.

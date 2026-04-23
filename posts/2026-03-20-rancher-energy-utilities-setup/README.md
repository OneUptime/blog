# How to Set Up Rancher for Energy and Utilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Energy, Utilities, SCADA, Edge, Kubernetes, Nerc-cip

Description: A guide to deploying Rancher for energy and utilities organizations, covering SCADA integration, NERC CIP compliance, grid management, and renewable energy monitoring.

## Overview

Energy and utility companies manage complex IT/OT convergence challenges: grid management systems, SCADA interfaces, renewable energy monitoring, and regulatory compliance with NERC CIP (North American Electric Reliability Corporation Critical Infrastructure Protection). Rancher's edge capabilities, strict network isolation support, and compliance tooling make it suitable for energy sector deployments. This guide covers the key configurations.

## Prerequisites

- Clear IT/OT network segmentation (DMZ architecture)
- NERC CIP compliance requirements identified
- Redundant network connectivity at substations
- Hardware Security Modules (HSM) for cryptographic operations
- Air-gap capability for critical OT systems

## Architecture

```text
Enterprise IT Zone (Rancher-managed)
├── Historian Cluster (data aggregation)
├── Business Intelligence Platform
├── Customer Portal (web-facing)
└── Analytics & Reporting

Operations Technology (OT) DMZ
├── SCADA Gateway
└── Advanced Metering Infrastructure (AMI)

Control Zone (Isolated - NERC CIP)
└── K3s clusters (air-gapped at substations)
    ├── Protection relay interfaces
    └── Real-time grid monitoring
```

## Step 1: IT/OT Network Segmentation

```yaml
# Strict network isolation for OT DMZ namespace

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ot-dmz-isolation
  namespace: ot-dmz
spec:
  podSelector: {}
  ingress: []
  egress:
    # Allow outbound only to the historian service in the IT zone
    - to:
        - namespaceSelector:
            matchLabels:
              zone: it
          podSelector:
            matchLabels:
              app: historian
      ports:
        - protocol: TCP
          port: 5432
  policyTypes:
    - Ingress
    - Egress
```

## Step 2: SCADA Integration

```yaml
# Modbus/DNP3 protocol gateway deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scada-gateway
  namespace: ot-dmz
spec:
  replicas: 2    # HA for grid operations
  selector:
    matchLabels:
      app: scada-gateway
  template:
    metadata:
      labels:
        app: scada-gateway
    spec:
      containers:
        - name: protocol-gateway
          image: registry.utility.internal/scada-gateway:v2.0.0
          env:
            - name: DNP3_ENDPOINT
              value: "10.10.0.100:20000"   # OT network IP
            - name: HISTORIAN_URL
              value: "postgresql://historian.it-zone.svc:5432/scada"
            - name: POLLING_INTERVAL_MS
              value: "500"   # 500ms polling
            - name: PROTOCOL
              value: "DNP3"
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
          # High-availability readiness probe
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Step 3: Smart Meter Data Processing (AMI)

```yaml
# Advanced Metering Infrastructure data pipeline
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ami-processor
  namespace: smart-grid
spec:
  replicas: 20    # Scale for millions of meters
  selector:
    matchLabels:
      app: ami-processor
  template:
    metadata:
      labels:
        app: ami-processor
    spec:
      containers:
        - name: meter-processor
          image: registry.utility.internal/ami-processor:v3.0.0
          env:
            - name: KAFKA_BROKERS
              value: "kafka.smart-grid.svc:9092"
            - name: METER_DATA_TOPIC
              value: "meter.readings.raw"
            - name: BILLING_TOPIC
              value: "meter.readings.billing"
            - name: READINGS_PER_SECOND
              value: "10000"    # Handle 10K readings/sec per pod
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

## Step 4: NERC CIP Compliance Configuration

NERC CIP requires strict access control and security event monitoring for Bulk Electric System (BES) assets. Kubernetes audit logging can support evidence collection for those controls, but it does not by itself satisfy the full standard:

```yaml
# Strict audit logging for NERC CIP compliance
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - "RequestReceived"
rules:
  # Log metadata for access to sensitive core resources without recording secret values
  - level: Metadata
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["pods", "secrets", "configmaps"]
  # Log API discovery and health-check access metadata
  - level: Metadata
    nonResourceURLs:
      - /api*
      - /apis*
      - /healthz
      - /livez
      - /readyz
```

```yaml
# NERC CIP RBAC: Strict least-privilege
# Operators get read-only access to OT namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ot-operator-readonly
  namespace: ot-dmz
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ot-operator-readonly-binding
  namespace: ot-dmz
subjects:
  - kind: Group
    name: ot-operators
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ot-operator-readonly
```

## Step 5: Renewable Energy Monitoring

```yaml
# Wind farm monitoring deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wind-farm-monitor
  namespace: renewable-energy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wind-farm-monitor
  template:
    metadata:
      labels:
        app: wind-farm-monitor
    spec:
      containers:
        - name: wind-monitor
          image: registry.utility.internal/wind-monitor:v1.5.0
          env:
            - name: TURBINE_COUNT
              value: "150"
            - name: MODBUS_GATEWAY
              value: "10.20.100.1:502"
            - name: METRICS_ENDPOINT
              value: "prometheus-pushgateway.cattle-monitoring-system:9091"
            - name: SCADA_INTEGRATION
              value: "true"
```

```yaml
# Solar panel monitoring
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solar-farm-monitor
  namespace: renewable-energy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: solar-farm-monitor
  template:
    metadata:
      labels:
        app: solar-farm-monitor
    spec:
      containers:
        - name: solar-monitor
          image: registry.utility.internal/solar-monitor:v2.0.0
          env:
            - name: INVERTER_PROTOCOL
              value: "SunSpec-Modbus"
            - name: PANEL_COUNT
              value: "50000"
            - name: IRRADIANCE_SENSOR_URL
              value: "http://weather-station.ot.internal/api/v1"
```

## Step 6: Grid State Estimation

```yaml
# Real-time grid state estimation job
apiVersion: batch/v1
kind: CronJob
metadata:
  name: grid-state-estimation
  namespace: ot-dmz
spec:
  schedule: "*/1 * * * *"   # Every minute
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: state-estimator
              image: registry.utility.internal/grid-state-estimator:v4.1.0
              env:
                - name: TOPOLOGY_FILE
                  value: "/grid/topology/current-topology.xml"
                - name: SCADA_SNAPSHOT_API
                  value: "http://historian.it-zone.svc/api/v1/snapshot"
          restartPolicy: OnFailure
```

## Step 7: Substation Edge Clusters

Deploy K3s at substations for local grid control, then import the clusters into Rancher for centralized management:

```bash
# Join an additional substation node to the local K3s server (air-gapped)
# Copy the K3s binary, install script, and air-gap images to the substation server
# Then install offline:
INSTALL_K3S_SKIP_DOWNLOAD=true \
K3S_URL=https://k3s-server.substation.utility.internal:6443 \
K3S_TOKEN=${SUBSTATION_TOKEN} \
./install.sh agent \
  --node-label="site-type=substation" \
  --node-label="substation-id=SUB-001" \
  --node-label="region=north"
```

## Step 8: Monitoring Grid KPIs

```yaml
# PrometheusRule for grid reliability metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: grid-reliability-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: grid-ops
      rules:
        - alert: SCADAConnectionLost
          expr: scada_gateway_connection_status == 0
          for: 30s
          labels:
            severity: critical
          annotations:
            summary: "SCADA connection lost - grid data unavailable"
        - alert: HighFrequencyDeviation
          expr: abs(grid_frequency_hz - 60) > 0.5
          for: 10s
          labels:
            severity: critical
          annotations:
            summary: "Grid frequency deviation above 0.5 Hz"
```

## Conclusion

Rancher provides the foundational infrastructure management capabilities required for energy and utility deployments. The combination of strict network isolation via NetworkPolicies, Kubernetes audit logging that supports NERC CIP evidence collection, K3s edge deployments at substations, and centralized Fleet management provides a secure and manageable platform. Always involve your OT security and grid operations teams in any design decisions involving connections between IT and OT zones, and ensure all NERC CIP compliance requirements are validated with your compliance team before deployment.

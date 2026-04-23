# How to Set Up Rancher for Energy and Utilities - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Energy, Utilities, SCADA, Grid, Edge, Kubernetes, IEC-62351

Description: Configure Rancher for energy and utilities workloads including smart grid management, SCADA system integration, renewable energy monitoring, demand forecasting ML, and edge computing for substations.

## Introduction

Energy and utilities organizations face unique operational requirements: NERC-CIP compliance for grid security, integration with legacy SCADA systems, real-time monitoring of distributed assets (solar farms, wind turbines, substations), and demand forecasting for grid balancing. Rancher manages Kubernetes clusters from central operations centers to substation edge deployments.

## Energy Platform Architecture

```text
Control Center
┌─────────────────────────────────────────────────────┐
│  Rancher Management                                  │
│  SCADA Integration Layer                            │
│  Demand Forecasting (ML)                            │
│  Energy Trading Platform                            │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐  ┌────▼───────┐  ┌──▼──────────────┐
│ Substation   │  │ Wind Farm  │  │ Solar Farm      │
│ Edge (K3s)   │  │ Edge (K3s) │  │ Edge (K3s)      │
└──────────────┘  └────────────┘  └─────────────────┘
IED/RTU data         Turbine data     Inverter data
Grid protection      SCADA            SCADA
```

## Step 1: NERC-CIP Security Controls

```yaml
# NERC-CIP requires strict access control for BES Cyber Systems

# Kubernetes deployed in CIP-compliant environments needs:

# 1. Network segmentation controls that can support an Electronic Security Perimeter (ESP)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: esp-isolation
  namespace: grid-control
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    # Only authorized workstations can access grid control
    - from:
        - ipBlock:
            cidr: 10.100.50.0/24    # Operations workstation subnet
      ports:
        - port: 8443
  egress:
    # Can communicate with SCADA systems
    - to:
        - ipBlock:
            cidr: 10.200.0.0/16    # SCADA network
      ports:
        - port: 2404    # IEC 60870-5-104 (telecontrol)
        - port: 102     # IEC 61850 MMS
```

## Step 2: SCADA Integration

```yaml
# DNP3/IEC 60870 protocol adapter
apiVersion: apps/v1
kind: Deployment
metadata:
  name: protocol-adapter
  namespace: grid-control
spec:
  selector:
    matchLabels:
      app: protocol-adapter
  template:
    metadata:
      labels:
        app: protocol-adapter
    spec:
      containers:
        - name: dnp3-adapter
          image: myregistry/dnp3-k8s-adapter:2.1.0
          env:
            - name: OUTSTATION_IP
              value: "10.200.10.5"    # RTU IP address
            - name: OUTSTATION_PORT
              value: "20000"
            - name: DATA_POINT_MAP
              value: "/config/point-map.json"
            - name: KAFKA_TOPIC
              value: "grid-measurements"
            - name: KAFKA_BOOTSTRAP
              value: "kafka.grid-data.svc:9092"
          volumeMounts:
            - name: point-map
              mountPath: /config
      volumes:
        - name: point-map
          configMap:
            name: protocol-adapter-point-map
```

## Step 3: Real-Time Grid Monitoring

```bash
# TimescaleDB for time-series grid measurements
# Measurements: voltage, current, frequency, power factor
kubectl create namespace grid-data

kubectl -n grid-data create secret generic timescale-secret \
  --from-literal=password='change-me' \
  --from-literal=url='postgresql://gridops:change-me@timescaledb.grid-data.svc:5432/grid'

kubectl apply -n grid-data -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: timescaledb-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Ti
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
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
          image: timescale/timescaledb-ha:pg18
          env:
            - name: POSTGRES_USER
              value: gridops
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescale-secret
                  key: password
            - name: POSTGRES_DB
              value: grid
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
              name: postgres
          volumeMounts:
            - name: timescaledb-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: timescaledb-storage
          persistentVolumeClaim:
            claimName: timescaledb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: timescaledb
spec:
  selector:
    app: timescaledb
  ports:
    - protocol: TCP
      port: 5432
      targetPort: postgres
  type: ClusterIP
EOF
```

```yaml
# Grafana dashboard for grid operations
# Example ConfigMap for clusters that use a Grafana sidecar to import labeled dashboards
apiVersion: v1
kind: ConfigMap
metadata:
  name: grid-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  grid-ops.json: |
    {
      "title": "Grid Operations Center",
      "schemaVersion": 17,
      "version": 1,
      "refresh": "1s",
      "time": {"from": "now-1h", "to": "now"},
      "panels": [
        {"id": 1, "title": "Grid Frequency (Hz)", "type": "stat", "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}},
        {"id": 2, "title": "Substation Voltage Profile", "type": "timeseries", "gridPos": {"h": 8, "w": 12, "x": 6, "y": 0}},
        {"id": 3, "title": "Load Demand (MW)", "type": "gauge", "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}},
        {"id": 4, "title": "Generation Mix (Renewable %)", "type": "piechart", "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}}
      ]
    }
```

## Step 4: Demand Forecasting ML

```yaml
# ML model for next-24h demand forecasting
apiVersion: v1
kind: Secret
metadata:
  name: timescale-secret
  namespace: grid-analytics
type: Opaque
stringData:
  url: postgresql://gridops:change-me@timescaledb.grid-data.svc:5432/grid
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demand-forecaster
  namespace: grid-analytics
spec:
  selector:
    matchLabels:
      app: demand-forecaster
  template:
    metadata:
      labels:
        app: demand-forecaster
    spec:
      containers:
        - name: forecaster
          image: myregistry/demand-forecast-model:v1.2.0
          env:
            - name: HISTORICAL_DATA_DB
              valueFrom:
                secretKeyRef:
                  name: timescale-secret
                  key: url
            - name: WEATHER_API_KEY
              valueFrom:
                secretKeyRef:
                  name: weather-api-secret
                  key: key
            - name: FORECAST_HORIZON_HOURS
              value: "24"
            - name: MODEL_UPDATE_CRON
              value: "0 * * * *"    # Retrain hourly
```

## Step 5: Substation Edge with K3s

```bash
# K3s on hardened edge compute (DIN-rail industrial PC)
# Power substation: must operate through network outages

cat > /etc/rancher/k3s/config.yaml << 'EOF'
# Air-gapped image pulls
private-registry: /etc/rancher/k3s/registries.yaml
disable-default-registry-endpoint: true

# Initialize a self-contained server with embedded etcd
cluster-init: true

# Substation metadata
node-label:
  - "site-type=substation"
  - "voltage-level=138kV"
  - "site-id=SUB-042"
EOF

# Substation edge workloads:
# - IED data aggregation (IEC 61850)
# - Protection relay monitoring
# - Local historian (offline buffer)
# - Remote diagnostics
```

## Step 6: Renewable Energy Asset Monitoring

```yaml
# Wind turbine monitoring (Modbus TCP)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: turbine-monitor
  namespace: wind-farm
spec:
  selector:
    matchLabels:
      app: turbine-monitor
  template:
    metadata:
      labels:
        app: turbine-monitor
    spec:
      containers:
        - name: modbus-collector
          image: myregistry/modbus-collector:1.5.0
          env:
            - name: TURBINE_IDS
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: MODBUS_PORT
              value: "502"
            - name: POLLING_INTERVAL_SECONDS
              value: "1"    # 1-second polling
            - name: METRICS_PORT
              value: "9090"
          ports:
            - containerPort: 9090
              name: metrics
```

## Energy Sector Compliance Summary

| Standard | Requirement | Implementation |
|---|---|---|
| NERC-CIP | ESP, Access Control | Network segmentation, RBAC, audit logging |
| IEC 62351 | Protocol security controls | Protocol-specific TLS, authentication, and integrity controls where supported |
| IEC 61850 | Substation automation | Protocol adapters in K8s |
| SOC 2 | Audit logging | Kubernetes audit + SIEM |

## Conclusion

Rancher provides the management layer for energy utilities' digital transformation, from central control centers to substation edge K3s deployments. NERC-CIP objectives can be supported with network segmentation, strict RBAC, and comprehensive audit logging, but compliance still depends on broader operational and procedural controls. SCADA integration uses protocol adapters (DNP3, IEC 61850) running as Kubernetes deployments, while ML demand forecasting improves grid efficiency. Edge K3s clusters at substations and renewable assets can continue running local workloads through WAN outages, with Rancher management operations resuming when connectivity returns.

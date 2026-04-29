# How to Set Up K3s for Factory Floor IoT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, IoT, Manufacturing, Industry 4.0, OPC-UA, MQTT, Edge Computing

Description: Learn how to deploy K3s in manufacturing environments for industrial IoT workloads including OPC-UA integration, machine monitoring, and predictive maintenance.

## Introduction

Industry 4.0 and IIoT (Industrial Internet of Things) are transforming manufacturing through real-time machine monitoring, predictive maintenance, and automated quality control. K3s provides the container orchestration layer for managing these diverse industrial workloads on factory floor hardware, integrating with industrial protocols like OPC-UA, Modbus, and MQTT while maintaining the reliability standards manufacturing environments demand.

## Factory Floor Architecture

Industrial environments have unique requirements:
- **Deterministic performance**: Critical control systems need predictable latency
- **Industrial protocol support**: OPC-UA, Modbus, PROFINET, EtherNet/IP
- **Hardware access**: PLCs, sensors, cameras via serial/industrial Ethernet
- **High availability**: Zero downtime for production systems
- **Security isolation**: IT/OT network separation

## Step 1: Hardware Requirements for Factory Floor

```bash
# Industrial-grade hardware options:

# - Advantech UNO industrial computers
# - Siemens SIMATIC IPC
# - Beckhoff CX series
# - Raspberry Pi CM4 (industrial carrier boards)

# Minimum requirements for factory K3s node:
# - 4 core CPU (x86 or ARM)
# - 4GB RAM
# - 32GB industrial-grade SSD
# - -40°C to +70°C operating temperature
# - DIN rail mountable (preferred)

# Check real-time kernel capability
uname -r | grep -i rt || echo "Standard kernel (RT kernel recommended for control workloads)"

# On Debian x86_64, install the PREEMPT_RT kernel metapackage
apt-get install linux-image-rt-amd64
```

## Step 2: Configure K3s for Industrial Environment

```yaml
# /etc/rancher/k3s/config.yaml
# Factory floor K3s configuration

disable:
  - traefik  # Use MetalLB + custom ingress for OT network

node-label:
  - "role=industrial-edge"
  - "plant=plant-a"
  - "production-line=line-3"
  - "opc-ua-gateway=true"

kubelet-arg:
  - "max-pods=30"
  - "system-reserved=cpu=500m,memory=1Gi"  # Reserve more for OS stability
  - "kube-reserved=cpu=200m,memory=512Mi"
  - "cpu-manager-policy=static"  # Dedicated CPUs for critical workloads
  - "topology-manager-policy=single-numa-node"  # Optimize NUMA for real-time
```

## Step 3: Deploy OPC-UA Gateway

OPC-UA is the primary industrial communication protocol:

```yaml
# opcua-gateway.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opcua-gateway
  namespace: industrial
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
      nodeSelector:
        opc-ua-gateway: "true"
      hostNetwork: true  # Direct access to OT network
      dnsPolicy: ClusterFirstWithHostNet  # Preserve cluster DNS with host networking
      containers:
        - name: opcua-gateway
          image: myregistry/opcua-gateway:v2.0
          imagePullPolicy: IfNotPresent
          env:
            # OPC-UA server endpoints on the factory floor
            - name: OPCUA_SERVERS
              value: "opc.tcp://192.168.200.10:4840,opc.tcp://192.168.200.11:4840"
            - name: POLLING_INTERVAL_MS
              value: "1000"
            - name: MQTT_BROKER_URL
              value: "mqtt://local-mqtt-broker:1883"
            - name: MQTT_TOPIC_PREFIX
              value: "factory/line-3"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          securityContext:
            capabilities:
              add:
                - NET_ADMIN  # For industrial network interface management
```

## Step 4: Deploy Modbus Bridge

For older PLCs using Modbus protocol:

```yaml
# modbus-bridge.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: modbus-bridge
  namespace: industrial
spec:
  replicas: 1
  selector:
    matchLabels:
      app: modbus-bridge
  template:
    metadata:
      labels:
        app: modbus-bridge
    spec:
      nodeSelector:
        plant: plant-a
      containers:
        - name: modbus-bridge
          image: myregistry/modbus-bridge:v1.5
          imagePullPolicy: IfNotPresent
          env:
            # Modbus RTU over serial (RS-485)
            - name: MODBUS_MODE
              value: "RTU"
            - name: SERIAL_PORT
              value: "/dev/ttyS0"
            - name: BAUD_RATE
              value: "9600"
            # Slave device addresses
            - name: MODBUS_SLAVES
              value: "1,2,3,4,5"
            - name: MQTT_OUTPUT_TOPIC
              value: "factory/modbus"
          securityContext:
            privileged: true
          volumeMounts:
            - name: serial-port
              mountPath: /dev/ttyS0
      volumes:
        - name: serial-port
          hostPath:
            path: /dev/ttyS0
            type: CharDevice
```

## Step 5: Deploy Time-Series Database for Machine Data

```yaml
# timescaledb-industrial.yaml
---
apiVersion: v1
kind: Service
metadata:
  name: timescaledb
  namespace: industrial
spec:
  clusterIP: None
  selector:
    app: timescaledb
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
  namespace: industrial
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
      nodeSelector:
        plant: plant-a
      containers:
        - name: timescaledb
          image: timescale/timescaledb:latest-pg15
          imagePullPolicy: IfNotPresent
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-secret
                  key: postgres-password
            - name: POSTGRES_DB
              value: industrial_iot
          resources:
            requests:
              memory: 1Gi
            limits:
              memory: 4Gi
          volumeMounts:
            - name: timescaledb-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: timescaledb-data
          hostPath:
            path: /data/timescaledb
            type: DirectoryOrCreate
```

## Step 6: Deploy Predictive Maintenance ML Pipeline

```yaml
# predictive-maintenance.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-maintenance
  namespace: industrial
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
      nodeSelector:
        plant: plant-a
      containers:
        - name: pred-maint
          image: myregistry/predictive-maintenance:v1.2
          imagePullPolicy: IfNotPresent
          env:
            - name: DATA_SOURCE_URL
              value: "postgresql://timescaledb:5432/industrial_iot"
            - name: MODEL_PATH
              value: "/models/bearing-failure-detector"
            - name: PREDICTION_INTERVAL_MINUTES
              value: "5"
            - name: ALERT_THRESHOLD
              value: "0.7"
            - name: ALERT_WEBHOOK_URL
              value: "https://cmms.factory.example.com/api/alerts"
          resources:
            limits:
              memory: 512Mi
          volumeMounts:
            - name: ml-models
              mountPath: /models
      volumes:
        - name: ml-models
          hostPath:
            path: /data/ml-models
            type: DirectoryOrCreate
```

## Step 7: Production Line Monitoring Dashboard

```yaml
# factory-grafana.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: grafana-factory
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: grafana
  version: "7.0.0"
  targetNamespace: industrial
  createNamespace: true
  valuesContent: |-
    adminPassword: "factory-admin-secret"
    plugins:
      - grafana-piechart-panel
      - grafana-worldmap-panel
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          - name: TimescaleDB
            type: postgres
            url: timescaledb:5432
            database: industrial_iot
            user: grafana_user
            isDefault: true
    resources:
      limits:
        memory: 512Mi
```

## Step 8: OEE (Overall Equipment Effectiveness) Tracking

```yaml
# oee-calculator.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: oee-calculator
  namespace: industrial
spec:
  schedule: "0 * * * *"  # Calculate OEE every hour
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: oee-calc
              image: myregistry/oee-calculator:v1
              imagePullPolicy: IfNotPresent
              env:
                - name: DB_URL
                  value: "postgresql://timescaledb:5432/industrial_iot"
                - name: CALCULATION_WINDOW_HOURS
                  value: "1"
                - name: MES_API_URL
                  value: "https://mes.factory.example.com/api/oee"
          restartPolicy: OnFailure
```

## Step 9: Implement Quality Control with Computer Vision

```yaml
# quality-inspection.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quality-inspection
  namespace: industrial
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
        plant: plant-a
      containers:
        - name: vision-inspector
          image: myregistry/quality-vision:v2.1
          imagePullPolicy: IfNotPresent
          env:
            - name: CAMERA_URL
              value: "rtsp://192.168.200.100/stream1"
            - name: DEFECT_MODEL_PATH
              value: "/models/defect-detector-v3"
            - name: DEFECT_THRESHOLD
              value: "0.85"
            - name: CONVEYOR_SPEED_CM_S
              value: "50"
          resources:
            limits:
              memory: 1Gi
```

## Conclusion

K3s on factory floors enables Industry 4.0 workloads with container orchestration while respecting the strict reliability and real-time requirements of manufacturing environments. The key integrations are OPC-UA and Modbus bridges for connecting to existing PLC infrastructure, time-series databases for machine data, and ML pipelines for predictive maintenance and quality control. Unlike consumer IoT, industrial deployments require deterministic performance and often benefit from real-time Linux kernels alongside K3s for latency-sensitive workloads.

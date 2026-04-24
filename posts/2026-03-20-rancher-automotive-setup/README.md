# How to Set Up Rancher for Automotive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Automotive, Connected-vehicles, Edge, Kubernetes, Ota-updates

Description: A guide to configuring Rancher for automotive environments, covering connected vehicle data pipelines, OTA update management, manufacturing edge clusters, and fleet tracking.

## Overview

Automotive organizations are deploying Kubernetes across multiple domains: connected vehicle data ingestion and analytics, factory automation and quality control, dealer/service network management, and over-the-air (OTA) software update distribution. Rancher's Fleet management capabilities and K3s edge support make it well-suited for the distributed, high-availability requirements of the automotive industry.

## Architecture

```text
OEM Cloud Platform (Rancher-managed)
├── Connected Vehicle Platform (RKE2 HA)
│   ├── Vehicle data ingestion (Kafka)
│   ├── Telematics analytics
│   └── OTA update management
├── Manufacturing Plants (RKE2 per plant)
│   ├── Production line quality inspection
│   └── Robotics control integration
└── Dealer Network (K3s per location)
    ├── Service scheduling
    └── Parts inventory
```

## Step 1: Vehicle Data Ingestion Platform

```yaml
# KRaft-based Kafka cluster for vehicle telemetry data
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: vehicle-telemetry
  namespace: connected-vehicle
  labels:
    strimzi.io/cluster: vehicle-telemetry
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 500Gi
        class: longhorn-fast
        kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: vehicle-telemetry
  namespace: connected-vehicle
spec:
  kafka:
    version: 4.2.0
    metadataVersion: 4.2-IV1
    listeners:
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Step 2: Connected Vehicle Data Processing

```yaml
# Stream processing for vehicle telemetry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telemetry-processor
  namespace: connected-vehicle
spec:
  replicas: 10    # Scale for millions of vehicles
  selector:
    matchLabels:
      app: telemetry-processor
  template:
    metadata:
      labels:
        app: telemetry-processor
    spec:
      containers:
        - name: processor
          image: registry.oem.internal/telemetry-processor:v3.1.0
          env:
            - name: KAFKA_BOOTSTRAP
              value: "vehicle-telemetry-kafka-bootstrap:9093"
            - name: CONSUMER_GROUP
              value: "telemetry-processing-group"
            - name: OUTPUT_TIMESERIES_DB
              value: "influxdb.connected-vehicle.svc:8086"
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
```

## Step 3: OTA Update Management

Configure a centralized OTA update distribution system:

```yaml
# OTA update server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ota-update-server
  namespace: ota-management
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ota-update-server
  template:
    metadata:
      labels:
        app: ota-update-server
    spec:
      containers:
        - name: ota-server
          image: registry.oem.internal/ota-server:v2.0.0
          env:
            - name: S3_BUCKET
              value: "oem-ota-packages"
            - name: SIGNING_KEY_ARN
              valueFrom:
                secretKeyRef:
                  name: ota-credentials
                  key: signing-key-arn
            - name: UPDATE_MANIFEST_URL
              value: "https://updates.oem.com/v2/manifest"
          ports:
            - containerPort: 8443
              name: https
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

```yaml
# Kubernetes Job for creating OTA update package
apiVersion: batch/v1
kind: Job
metadata:
  name: create-ota-package-v4-2-1
  namespace: ota-management
spec:
  template:
    spec:
      containers:
        - name: ota-packager
          image: registry.oem.internal/ota-tools:latest
          env:
            - name: SIGNING_KEY_ARN
              valueFrom:
                secretKeyRef:
                  name: ota-credentials
                  key: signing-key-arn
          command:
            - /bin/sh
            - -c
            - |
              # Sign and package the firmware update
              ota-sign \
                --firmware /updates/firmware-4.2.1.bin \
                --key ${SIGNING_KEY_ARN} \
                --output /packages/firmware-4.2.1-signed.bin

              # Upload to distribution CDN
              ota-publish \
                --package /packages/firmware-4.2.1-signed.bin \
                --version "4.2.1" \
                --vehicle-models "EV-2025,EV-2026" \
                --rollout-strategy canary \
                --canary-percentage 5
      restartPolicy: OnFailure
```

## Step 4: Fleet Management for Dealer Network

```yaml
# Fleet GitRepo for dealer network applications
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: dealer-applications
  namespace: fleet-default
spec:
  repo: https://git.oem.internal/dealer-apps
  branch: production
  targets:
    - name: all-dealers
      clusterSelector:
        matchLabels:
          location: dealership
  paths:
    - apps/dealer-portal
    - apps/service-scheduler
    - apps/parts-inventory
```

## Step 5: Manufacturing Quality Inspection

```yaml
# Computer vision for paint defect detection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paint-defect-inspector
  namespace: manufacturing-qa
spec:
  replicas: 2
  selector:
    matchLabels:
      app: paint-defect-inspector
  template:
    metadata:
      labels:
        app: paint-defect-inspector
    spec:
      nodeSelector:
        accelerator: nvidia-gpu
        zone: paint-shop
      containers:
        - name: cv-inspector
          image: registry.oem.internal/paint-cv:v1.5.0
          env:
            - name: DEFECT_THRESHOLD
              value: "0.001"    # 0.1% defect rate threshold
            - name: CAMERA_FEEDS
              value: "rtsp://cam-01:554,rtsp://cam-02:554,rtsp://cam-03:554"
            - name: ALERT_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: qa-webhooks
                  key: paint-shop-alert
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: "8Gi"
```

## Step 6: Vehicle Tracking Dashboard

```yaml
# Real-time vehicle fleet tracking service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fleet-tracker
  namespace: connected-vehicle
spec:
  replicas: 5
  selector:
    matchLabels:
      app: fleet-tracker
  template:
    metadata:
      labels:
        app: fleet-tracker
    spec:
      containers:
        - name: tracker
          image: registry.oem.internal/fleet-tracker:v2.3.0
          env:
            - name: MQTT_BROKER
              value: "mqtt.connected-vehicle.svc:1883"
            - name: WEBSOCKET_PORT
              value: "8080"
            - name: MAX_VEHICLES_PER_INSTANCE
              value: "50000"   # 50K vehicles per tracker instance
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

## Step 7: CAN Bus Data Processing

```yaml
# CAN bus data decoder deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canbus-decoder
  namespace: connected-vehicle
spec:
  replicas: 8
  selector:
    matchLabels:
      app: canbus-decoder
  template:
    metadata:
      labels:
        app: canbus-decoder
    spec:
      containers:
        - name: decoder
          image: registry.oem.internal/canbus-decoder:v1.0.0
          env:
            - name: DBC_FILES_PATH
              value: "/dbc"
            - name: KAFKA_TOPIC_ENCRYPTED
              value: "vehicle.canbus.raw"
            - name: KAFKA_TOPIC_DECODED
              value: "vehicle.canbus.decoded"
          volumeMounts:
            - name: dbc-definitions
              mountPath: /dbc
      volumes:
        - name: dbc-definitions
          configMap:
            name: vehicle-dbc-files    # CAN bus DBC definition files
```

## Step 8: Automotive-Grade Monitoring

```yaml
# PrometheusRule for connected vehicle platform
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: automotive-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: connected-vehicle
      rules:
        - alert: HighVehicleDataLatency
          expr: vehicle_data_ingestion_p99_latency_ms > 500
          for: 2m
          labels:
            severity: warning
        - alert: OTAUpdateFailureRate
          expr: ota_update_failure_rate > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "OTA update failure rate above 5%"
```

## Conclusion

Rancher provides a strong foundation for automotive industry Kubernetes deployments. Its multi-cluster management capabilities span from cloud-based connected vehicle platforms to edge deployments in manufacturing plants and dealer networks. Fleet's GitOps capabilities enable consistent application deployments across thousands of dealer locations. The ability to manage OTA update distribution, vehicle data ingestion, and quality inspection workloads from a unified platform significantly reduces operational complexity for automotive organizations.

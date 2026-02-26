# ArgoCD for Manufacturing: IoT Platform Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Manufacturing, IoT

Description: Learn how to use ArgoCD to deploy and manage IoT platforms in manufacturing environments, including sensor data pipelines, edge processing, SCADA integration, and predictive maintenance systems.

---

Manufacturing floors are increasingly running Kubernetes-based IoT platforms to collect sensor data, monitor equipment health, run predictive maintenance models, and integrate with legacy SCADA systems. These deployments span factory-floor edge nodes, plant-level data centers, and cloud analytics clusters. ArgoCD provides the GitOps backbone to manage these heterogeneous environments consistently.

This guide covers deploying manufacturing IoT platforms with ArgoCD, from sensor gateways to cloud analytics.

## Manufacturing IoT Architecture

A typical manufacturing IoT platform has several layers:

```mermaid
graph TD
    A[Sensors and PLCs] --> B[IoT Gateway Pods]
    B --> C[Edge Processing - K3s on Factory Floor]
    C --> D[Plant Data Center - K8s Cluster]
    D --> E[Cloud Analytics - EKS/GKE]

    C --> F[Real-Time Alerts]
    D --> G[Historian Database]
    E --> H[ML Models]
    E --> I[Business Intelligence]
```

ArgoCD manages everything from the edge processing layer upward. The sensor and PLC layer uses industrial protocols (MQTT, OPC-UA, Modbus) that the IoT gateway pods translate into cloud-native data streams.

## Edge Node Configuration

Factory floor edge nodes are typically small form-factor computers running K3s. Deploy the IoT gateway stack to these nodes:

```yaml
# applicationsets/factory-edge-gateways.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: factory-iot-gateways
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          tier: factory-edge
          iot-enabled: "true"
  template:
    metadata:
      name: 'iot-gateway-{{name}}'
    spec:
      project: manufacturing-iot
      source:
        repoURL: https://git.manufacturing.com/iot/edge-stack.git
        targetRevision: HEAD
        path: gateway
        helm:
          values: |
            facility: "{{metadata.labels.facility}}"
            productionLine: "{{metadata.labels.production-line}}"

            # MQTT broker for sensor data collection
            mqtt:
              enabled: true
              replicas: 1
              persistence:
                size: 10Gi
                storageClass: local-path

            # OPC-UA connector for PLC integration
            opcua:
              enabled: true
              endpoints:
              - name: plc-line-1
                url: "opc.tcp://192.168.1.100:4840"
              - name: plc-line-2
                url: "opc.tcp://192.168.1.101:4840"

            # Resource limits for edge hardware
            resources:
              requests:
                cpu: 250m
                memory: 256Mi
              limits:
                cpu: "1"
                memory: 1Gi
      destination:
        server: '{{server}}'
        namespace: iot-gateway
      syncPolicy:
        automated:
          selfHeal: true
        retry:
          limit: 20
          backoff:
            duration: 1m
            factor: 2
            maxDuration: 1h
```

## MQTT Broker Deployment

The MQTT broker is the central nervous system of factory IoT. Deploy it with high availability:

```yaml
# mqtt/mosquitto-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mosquitto
  namespace: iot-gateway
spec:
  serviceName: mosquitto
  replicas: 1  # Single instance per edge node
  selector:
    matchLabels:
      app: mosquitto
  template:
    metadata:
      labels:
        app: mosquitto
    spec:
      containers:
      - name: mosquitto
        image: eclipse-mosquitto:2.0
        ports:
        - containerPort: 1883
          name: mqtt
        - containerPort: 8883
          name: mqtts
        volumeMounts:
        - name: config
          mountPath: /mosquitto/config
        - name: data
          mountPath: /mosquitto/data
        - name: tls
          mountPath: /mosquitto/certs
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: config
        configMap:
          name: mosquitto-config
      - name: tls
        secret:
          secretName: mosquitto-tls
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-path
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
  namespace: iot-gateway
data:
  mosquitto.conf: |
    listener 1883
    listener 8883
    certfile /mosquitto/certs/tls.crt
    keyfile /mosquitto/certs/tls.key
    cafile /mosquitto/certs/ca.crt
    require_certificate false
    persistence true
    persistence_location /mosquitto/data/
    # Bridge to plant-level MQTT for data forwarding
    connection plant-bridge
    address mqtt.plant-datacenter.internal:8883
    topic sensors/# out 1
    bridge_cafile /mosquitto/certs/ca.crt
```

## Sensor Data Pipeline

Process sensor data at the edge before sending it to the cloud. Deploy stream processing with ArgoCD:

```yaml
# data-pipeline/stream-processor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sensor-stream-processor
  namespace: iot-processing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stream-processor
  template:
    metadata:
      labels:
        app: stream-processor
    spec:
      containers:
      - name: processor
        image: manufacturing/stream-processor:v2.5.0
        env:
        - name: MQTT_BROKER
          value: "tcp://mosquitto.iot-gateway:1883"
        - name: SUBSCRIBE_TOPICS
          value: "sensors/temperature/#,sensors/vibration/#,sensors/pressure/#"
        - name: TIMESCALEDB_URL
          value: "postgresql://iot:$(DB_PASSWORD)@timescaledb.iot-storage:5432/sensordata"
        - name: ALERT_THRESHOLD_TEMPERATURE
          value: "85.0"
        - name: ALERT_THRESHOLD_VIBRATION
          value: "12.5"
        - name: KAFKA_BROKERS
          value: "kafka.plant-datacenter:9092"
        - name: KAFKA_TOPIC
          value: "sensor-events-raw"
        envFrom:
        - secretRef:
            name: iot-db-credentials
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: "2"
            memory: 2Gi
```

## Predictive Maintenance Model Serving

Deploy ML models for predictive maintenance using ArgoCD. These models analyze sensor patterns to predict equipment failures:

```yaml
# ml-serving/predictive-maintenance.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: predictive-maintenance
  namespace: argocd
spec:
  project: manufacturing-iot
  source:
    repoURL: https://git.manufacturing.com/iot/ml-models.git
    targetRevision: HEAD
    path: predictive-maintenance
    helm:
      values: |
        modelServer:
          image: manufacturing/pred-maint-server:v1.12.0
          replicas: 2
          resources:
            requests:
              cpu: "2"
              memory: 4Gi
            limits:
              cpu: "4"
              memory: 8Gi

          # Model artifacts stored in S3-compatible storage
          modelStore:
            endpoint: "https://minio.plant-datacenter:9000"
            bucket: "ml-models"
            modelPath: "predictive-maintenance/v1.12"

          # Inference endpoint configuration
          inference:
            batchSize: 100
            timeout: 5s

        # Feature store for model inputs
        featureStore:
          enabled: true
          source: "timescaledb.iot-storage:5432"
          refreshInterval: "30s"
          features:
          - name: vibration_rolling_avg_1h
            query: "SELECT avg(value) FROM sensor_data WHERE sensor_type='vibration' AND time > now() - interval '1 hour'"
          - name: temperature_trend_24h
            query: "SELECT regr_slope(value, extract(epoch from time)) FROM sensor_data WHERE sensor_type='temperature' AND time > now() - interval '24 hours'"
  destination:
    server: https://kubernetes.default.svc
    namespace: ml-serving
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## SCADA Integration Layer

Legacy SCADA systems need adapters to work with cloud-native infrastructure:

```yaml
# scada/adapter-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scada-adapter
  namespace: iot-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: scada-adapter
  template:
    metadata:
      labels:
        app: scada-adapter
    spec:
      containers:
      - name: adapter
        image: manufacturing/scada-adapter:v3.1.0
        ports:
        - containerPort: 502
          name: modbus
          protocol: TCP
        env:
        - name: SCADA_HOST
          value: "192.168.1.50"
        - name: SCADA_PORT
          value: "502"
        - name: MODBUS_REGISTERS
          value: "/config/registers.yaml"
        - name: OUTPUT_MQTT_BROKER
          value: "tcp://mosquitto.iot-gateway:1883"
        - name: OUTPUT_TOPIC_PREFIX
          value: "scada/plant-1"
        - name: POLL_INTERVAL_MS
          value: "1000"
        volumeMounts:
        - name: register-config
          mountPath: /config
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      # Host network for direct SCADA access
      hostNetwork: true
      volumes:
      - name: register-config
        configMap:
          name: scada-registers
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: scada-registers
  namespace: iot-gateway
data:
  registers.yaml: |
    registers:
      - address: 40001
        name: motor_speed_rpm
        type: holding
        dataType: float32
        topic: sensors/motor/speed
      - address: 40003
        name: motor_temperature
        type: holding
        dataType: float32
        topic: sensors/motor/temperature
      - address: 40005
        name: conveyor_state
        type: holding
        dataType: uint16
        topic: sensors/conveyor/state
      - address: 10001
        name: emergency_stop
        type: discrete
        dataType: bool
        topic: sensors/safety/estop
```

## Plant-Wide Dashboard Deployment

Deploy monitoring dashboards that plant operators use to track production:

```yaml
# dashboards/grafana-operator.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: plant-dashboards
  namespace: argocd
spec:
  project: manufacturing-iot
  source:
    repoURL: https://git.manufacturing.com/iot/dashboards.git
    targetRevision: HEAD
    path: grafana
    helm:
      values: |
        grafana:
          replicas: 2
          datasources:
          - name: TimescaleDB
            type: postgres
            url: timescaledb.iot-storage:5432
            database: sensordata
          - name: Prometheus
            type: prometheus
            url: http://prometheus.monitoring:9090

          dashboards:
            production-overview:
              enabled: true
              title: "Production Line Overview"
            equipment-health:
              enabled: true
              title: "Equipment Health Monitoring"
            energy-consumption:
              enabled: true
              title: "Energy Consumption Tracker"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Handling Maintenance Windows

Manufacturing plants have scheduled maintenance windows. Use ArgoCD sync windows to prevent deployments during production hours:

```yaml
# argocd-project with sync windows
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: manufacturing-iot
  namespace: argocd
spec:
  description: Manufacturing IoT Platform
  syncWindows:
  # Only allow syncs during maintenance windows
  - kind: allow
    schedule: "0 2 * * 6"  # Saturday at 2 AM
    duration: 4h
    applications:
    - "*"
    manualSync: true
  # Block syncs during production hours
  - kind: deny
    schedule: "0 6 * * 1-5"  # Mon-Fri 6 AM
    duration: 16h  # Until 10 PM
    applications:
    - "*"
```

For monitoring your manufacturing IoT platform and getting alerts when sensor pipelines fail or edge nodes go offline, integrate with OneUptime for end-to-end visibility across cloud and factory floor.

## Conclusion

ArgoCD brings order to the inherently complex world of manufacturing IoT deployments. By managing everything from MQTT brokers and SCADA adapters at the edge to ML model serving and analytics in the cloud, ArgoCD ensures that your entire IoT stack is version-controlled, auditable, and reproducible. The key patterns for manufacturing are: using ApplicationSets to deploy across multiple factory edge nodes, configuring generous retry policies for intermittent connectivity, enforcing sync windows that respect production schedules, and maintaining separate ArgoCD projects for different tiers of the IoT architecture. This approach lets manufacturing teams update their IoT platform with confidence, knowing that every change is tracked in Git and can be rolled back if it affects production.

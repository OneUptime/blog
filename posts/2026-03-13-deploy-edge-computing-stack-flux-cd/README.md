# How to Deploy Edge Computing Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, MQTT, InfluxDB, Node-RED

Description: Deploy a complete edge computing stack using Flux CD, including data collection, local processing, storage, and remote connectivity components.

---

## Introduction

A complete edge computing stack is not just a single application - it is an interconnected set of services for data ingestion, local processing, temporary storage, and connectivity to the cloud. A typical industrial edge stack includes an MQTT broker for device communication, a stream processing engine, a time-series database, and a dashboard for local visualization.

Managing all these components consistently across dozens of edge sites is exactly where Flux CD shines. Each component is defined in Git with site-specific configuration applied through Kustomize overlays, ensuring every site runs the correct version of every service and can be updated from a central Git repository.

This guide deploys a complete edge computing stack - Mosquitto MQTT broker, Node-RED for data processing, InfluxDB for time-series storage, and Grafana for dashboards - all managed by Flux CD.

## Prerequisites

- Edge Kubernetes cluster (K3s recommended) with at least 2GB RAM
- Flux CD bootstrapped on the cluster
- Persistent storage available (local-path or hostpath storage class)
- DNS or static IP for the cluster's ingress
- Git repository for fleet configuration

## Step 1: Repository Structure for Edge Stack

```plaintext
apps/
  base/
    edge-stack/
      mqtt-broker/
        helmrelease.yaml
        configmap.yaml
      node-red/
        deployment.yaml
        configmap.yaml
      influxdb/
        helmrelease.yaml
        pvc.yaml
      grafana/
        helmrelease.yaml
        dashboards/
  overlays/
    edge-industrial/        # Industrial edge profile
      kustomization.yaml
      site-config.yaml
    edge-retail/            # Retail edge profile
      kustomization.yaml
      site-config.yaml
infrastructure/
  base/
    edge/
      helm-repositories.yaml
      namespaces.yaml
```

## Step 2: Deploy the MQTT Broker

```yaml
# apps/base/edge-stack/mqtt-broker/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mosquitto
  namespace: edge-stack
spec:
  interval: 10m
  chart:
    spec:
      chart: mosquitto
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: edge-charts
        namespace: flux-system
  values:
    persistence:
      enabled: true
      storageClass: local-path
      size: 2Gi
    config:
      # MQTT broker configuration
      persistence: "true"
      persistence_location: "/mosquitto/data/"
      log_dest: "stdout"
      listener: "1883"
      allow_anonymous: "false"
      password_file: "/mosquitto/config/passwd"
    existingSecretRef:
      name: mosquitto-credentials
```

```yaml
# apps/base/edge-stack/mqtt-broker/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
  namespace: edge-stack
data:
  mosquitto.conf: |
    persistence true
    persistence_location /mosquitto/data/
    log_dest stdout
    listener 1883
    allow_anonymous false
    password_file /mosquitto/config/passwd
    # TLS for production
    listener 8883
    cafile /mosquitto/certs/ca.crt
    certfile /mosquitto/certs/server.crt
    keyfile /mosquitto/certs/server.key
```

## Step 3: Deploy InfluxDB for Time-Series Storage

```yaml
# apps/base/edge-stack/influxdb/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: influxdb
  namespace: edge-stack
spec:
  interval: 10m
  chart:
    spec:
      chart: influxdb2
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: influxdata-charts
        namespace: flux-system
  values:
    adminUser:
      existingSecret: influxdb-admin-secret
    persistence:
      enabled: true
      storageClass: local-path
      size: "${INFLUXDB_STORAGE_SIZE}"   # Substituted per site
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    env:
      - name: INFLUXD_STORAGE_CACHE_MAX_MEMORY_SIZE
        value: "134217728"  # 128MB cache for edge
```

## Step 4: Deploy Node-RED for Edge Data Processing

```yaml
# apps/base/edge-stack/node-red/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-red
  namespace: edge-stack
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node-red
  template:
    metadata:
      labels:
        app: node-red
    spec:
      containers:
        - name: node-red
          image: nodered/node-red:3.1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 1880
          env:
            - name: FLOWS
              value: /data/flows.json
            - name: MQTT_BROKER
              value: mosquitto.edge-stack.svc.cluster.local
            - name: INFLUXDB_URL
              value: http://influxdb.edge-stack.svc.cluster.local:8086
          volumeMounts:
            - name: node-red-data
              mountPath: /data
            - name: node-red-flows
              mountPath: /data/flows.json
              subPath: flows.json
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: node-red-data
          persistentVolumeClaim:
            claimName: node-red-pvc
        - name: node-red-flows
          configMap:
            name: node-red-flows
```

## Step 5: Site-Specific Overlays

```yaml
# apps/overlays/edge-industrial/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/edge-stack
patches:
  - path: site-config.yaml
    target:
      kind: HelmRelease
      name: influxdb
```

```yaml
# apps/overlays/edge-industrial/site-config.yaml
# Industrial sites need more storage for high-frequency sensor data
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: influxdb
  namespace: edge-stack
spec:
  values:
    persistence:
      size: 50Gi  # Industrial sites generate more data
    resources:
      limits:
        memory: 2Gi  # More memory for industrial load
```

## Step 6: Deploy the Complete Stack Kustomization

```yaml
# clusters/edge-industrial-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: edge-stack
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/edge-industrial
  prune: true
  dependsOn:
    - name: infrastructure  # Ensure namespaces and storage exist first
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      SITE_ID: "industrial-001"
      INFLUXDB_STORAGE_SIZE: "50Gi"
      MQTT_SITE_PREFIX: "plant/line-a"
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: node-red
      namespace: edge-stack
    - apiVersion: apps/v1
      kind: StatefulSet
      name: influxdb
      namespace: edge-stack
```

## Best Practices

- Use `dependsOn` to ensure infrastructure (namespaces, storage classes) is ready before applications.
- Store Node-RED flows in Git as ConfigMaps for version-controlled data pipelines.
- Configure InfluxDB retention policies to prevent disk exhaustion on edge devices.
- Use site-specific Kustomize overlays for storage sizes rather than hardcoded base values.
- Set resource limits on all edge stack components to prevent any one service from starving others.
- Include Grafana dashboards in Git so they are version-controlled alongside the data stack.

## Conclusion

A complete edge computing stack - MQTT broker, stream processing, time-series database, and dashboards - can be fully managed through Flux CD with minimal operational overhead. Kustomize overlays handle the differences between industrial and retail edge profiles while sharing a common base configuration. When a new site is deployed, bootstrapping Flux and pointing it at the correct overlay path is all that is needed to bring up the entire stack automatically.

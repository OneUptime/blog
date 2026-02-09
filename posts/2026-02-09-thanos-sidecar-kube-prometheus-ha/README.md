# How to Implement Thanos Sidecar with kube-prometheus-stack for HA Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Thanos, Prometheus, High Availability, Kubernetes, Monitoring

Description: Learn how to deploy Thanos sidecar alongside Prometheus in kube-prometheus-stack to achieve high availability and long-term metric storage.

---

Prometheus provides excellent metrics collection but has limitations for high availability and long-term storage. Thanos extends Prometheus by adding global query views, unlimited retention, and high availability through deduplication. The Thanos sidecar runs alongside Prometheus, uploading blocks to object storage and providing a query interface. This enables scalable, reliable observability across multiple clusters.

## Understanding Thanos Architecture

Thanos consists of several components:
- **Sidecar**: Runs alongside Prometheus, uploads blocks to object storage, serves StoreAPI
- **Query**: Provides global query interface across all Prometheus instances
- **Store Gateway**: Serves metrics from object storage
- **Compactor**: Downsamples and compacts blocks in object storage
- **Ruler**: Evaluates recording and alerting rules on historical data

The sidecar is the foundation, connecting Prometheus to the Thanos ecosystem.

## Prerequisites

You need:
- A running Kubernetes cluster with kube-prometheus-stack
- Object storage (S3, GCS, Azure Blob, or MinIO)
- Sufficient storage for metrics (plan for 3x raw Prometheus storage)

## Configuring Object Storage

Create an S3 bucket and configuration:

```yaml
# thanos-storage-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: "prometheus-metrics"
      endpoint: "s3.amazonaws.com"
      region: "us-east-1"
      access_key: "YOUR_ACCESS_KEY"
      secret_key: "YOUR_SECRET_KEY"
```

For GCS:

```yaml
stringData:
  objstore.yml: |
    type: GCS
    config:
      bucket: "prometheus-metrics"
      service_account: |-
        {
          "type": "service_account",
          "project_id": "your-project",
          "private_key_id": "...",
          "private_key": "...",
          "client_email": "...",
          "client_id": "...",
          "auth_uri": "https://accounts.google.com/o/oauth2/auth",
          "token_uri": "https://oauth2.googleapis.com/token"
        }
```

Apply the secret:

```bash
kubectl apply -f thanos-storage-config.yaml
```

## Enabling Thanos Sidecar in kube-prometheus-stack

Configure kube-prometheus-stack with Thanos sidecar:

```yaml
# prometheus-thanos-values.yaml
prometheus:
  prometheusSpec:
    # External labels identify this Prometheus instance
    externalLabels:
      cluster: production
      region: us-east-1
      replica: $(POD_NAME)

    # Enable Thanos sidecar
    thanos:
      # Thanos sidecar image
      image: quay.io/thanos/thanos:v0.34.0

      # Sidecar version
      version: v0.34.0

      # Object storage configuration
      objectStorageConfig:
        name: thanos-objstore-config
        key: objstore.yml

      # Resource limits
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

      # Volume for shared data
      volumeMounts:
        - name: prometheus-data
          mountPath: /prometheus

    # Prometheus settings for Thanos
    retention: 2d  # Local retention (Thanos keeps long-term)
    walCompression: true

    # Enable TSDB blocks
    disableCompaction: false

    # Replicas for HA
    replicas: 2

    # Pod anti-affinity for HA
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                    - prometheus
            topologyKey: kubernetes.io/hostname

  # Expose Thanos sidecar service
  thanosService:
    enabled: true
    port: 10901

  # Thanos service monitor
  thanosServiceMonitor:
    enabled: true
```

Deploy with Helm:

```bash
helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-thanos-values.yaml
```

## Deploying Thanos Query

Deploy Thanos Query to aggregate metrics across Prometheus instances:

```yaml
# thanos-query-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query
  template:
    metadata:
      labels:
        app: thanos-query
    spec:
      containers:
        - name: thanos-query
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - query
            - --http-address=0.0.0.0:10902
            - --grpc-address=0.0.0.0:10901
            - --log.level=info
            - --log.format=logfmt
            - --query.replica-label=replica
            - --query.replica-label=prometheus_replica
            # Auto-discover Prometheus sidecars
            - --endpoint=dnssrv+_grpc._tcp.prometheus-operated.monitoring.svc.cluster.local
            # Optionally add Store Gateway
            - --endpoint=thanos-store.monitoring.svc.cluster.local:10901
          ports:
            - name: http
              containerPort: 10902
            - name: grpc
              containerPort: 10901
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /-/healthy
              port: 10902
            initialDelaySeconds: 30
          readinessProbe:
            httpGet:
              path: /-/ready
              port: 10902
            initialDelaySeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  selector:
    app: thanos-query
  ports:
    - name: http
      port: 10902
      targetPort: 10902
    - name: grpc
      port: 10901
      targetPort: 10901
```

Apply the deployment:

```bash
kubectl apply -f thanos-query-deployment.yaml
```

## Deploying Thanos Store Gateway

Store Gateway serves historical data from object storage:

```yaml
# thanos-store-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  serviceName: thanos-store
  replicas: 1
  selector:
    matchLabels:
      app: thanos-store
  template:
    metadata:
      labels:
        app: thanos-store
    spec:
      containers:
        - name: thanos-store
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - store
            - --data-dir=/var/thanos/store
            - --grpc-address=0.0.0.0:10901
            - --http-address=0.0.0.0:10902
            - --log.level=info
            - --objstore.config-file=/etc/thanos/objstore.yml
            # Index cache for performance
            - --index-cache-size=2GB
            - --chunk-pool-size=2GB
          ports:
            - name: http
              containerPort: 10902
            - name: grpc
              containerPort: 10901
          volumeMounts:
            - name: objstore-config
              mountPath: /etc/thanos
              readOnly: true
            - name: data
              mountPath: /var/thanos/store
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      volumes:
        - name: objstore-config
          secret:
            secretName: thanos-objstore-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  selector:
    app: thanos-store
  ports:
    - name: http
      port: 10902
      targetPort: 10902
    - name: grpc
      port: 10901
      targetPort: 10901
```

Deploy:

```bash
kubectl apply -f thanos-store-deployment.yaml
```

## Deploying Thanos Compactor

Compactor downsamples and compacts blocks for efficient storage:

```yaml
# thanos-compactor-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  serviceName: thanos-compactor
  replicas: 1
  selector:
    matchLabels:
      app: thanos-compactor
  template:
    metadata:
      labels:
        app: thanos-compactor
    spec:
      containers:
        - name: thanos-compactor
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - compact
            - --data-dir=/var/thanos/compactor
            - --http-address=0.0.0.0:10902
            - --log.level=info
            - --objstore.config-file=/etc/thanos/objstore.yml
            # Retention for downsampled data
            - --retention.resolution-raw=30d
            - --retention.resolution-5m=90d
            - --retention.resolution-1h=1y
            # Compaction settings
            - --compact.concurrency=1
            - --delete-delay=48h
            - --wait
          ports:
            - name: http
              containerPort: 10902
          volumeMounts:
            - name: objstore-config
              mountPath: /etc/thanos
              readOnly: true
            - name: data
              mountPath: /var/thanos/compactor
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 8Gi
      volumes:
        - name: objstore-config
          secret:
            secretName: thanos-objstore-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

Deploy:

```bash
kubectl apply -f thanos-compactor-deployment.yaml
```

## Configuring Grafana with Thanos Query

Add Thanos Query as a Grafana datasource:

```yaml
# grafana-thanos-datasource.yaml
grafana:
  additionalDataSources:
    - name: Thanos
      type: prometheus
      access: proxy
      url: http://thanos-query.monitoring.svc.cluster.local:10902
      isDefault: true
      jsonData:
        timeInterval: 30s
        queryTimeout: 300s

    - name: Prometheus Local
      type: prometheus
      access: proxy
      url: http://prometheus-operated.monitoring.svc.cluster.local:9090
      isDefault: false
```

## Verifying Thanos Deployment

Check all components are running:

```bash
# Check Prometheus with sidecar
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus

# Check Thanos Query
kubectl get pods -n monitoring -l app=thanos-query

# Check Store Gateway
kubectl get pods -n monitoring -l app=thanos-store

# Check Compactor
kubectl get pods -n monitoring -l app=thanos-compactor
```

Access Thanos Query UI:

```bash
kubectl port-forward -n monitoring svc/thanos-query 10902:10902

# Open http://localhost:10902
```

Verify stores are connected:

```bash
# Check Thanos Query stores
curl http://localhost:10902/api/v1/stores | jq
```

## Monitoring Thanos

Create ServiceMonitors for Thanos components:

```yaml
# thanos-servicemonitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: thanos-query
  endpoints:
    - port: http
      interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: thanos-store
  endpoints:
    - port: http
      interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: thanos-compactor
  endpoints:
    - port: http
      interval: 30s
```

Create alerts for Thanos:

```yaml
# thanos-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: thanos-alerts
  namespace: monitoring
spec:
  groups:
    - name: thanos
      interval: 30s
      rules:
        - alert: ThanosSidecarDown
          expr: up{job="prometheus-thanos-sidecar"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Thanos sidecar is down"

        - alert: ThanosCompactorNotRunning
          expr: up{job="thanos-compactor"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Thanos compactor is down"

        - alert: ThanosObjectStoreUploadFailures
          expr: rate(thanos_objstore_bucket_operation_failures_total[5m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Thanos object store upload failures"
```

## Best Practices

1. Set appropriate retention periods for each resolution level
2. Use object storage with versioning enabled
3. Run compactor only once per object storage bucket
4. Enable deduplication in Thanos Query with replica labels
5. Monitor object storage costs and optimize retention
6. Use separate object storage buckets per environment
7. Enable TSDB compression in Prometheus
8. Set appropriate resource limits based on metrics volume
9. Implement backup strategies for object storage
10. Regularly test disaster recovery procedures

## Conclusion

Thanos sidecar transforms Prometheus into a highly available, globally queryable monitoring system with unlimited retention. By uploading blocks to object storage and providing a unified query interface, Thanos enables scalable observability across multiple Kubernetes clusters. Combined with downsampling and compaction, Thanos delivers cost-effective long-term metric storage while maintaining query performance.

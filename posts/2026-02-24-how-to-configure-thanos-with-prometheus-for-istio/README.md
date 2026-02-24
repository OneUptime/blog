# How to Configure Thanos with Prometheus for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Thanos, Prometheus, Long-Term Storage, Monitoring

Description: Step-by-step guide to deploying Thanos alongside Prometheus to get scalable, long-term storage and multi-cluster querying for Istio service mesh metrics.

---

Thanos is the go-to solution for extending Prometheus with long-term storage and multi-cluster querying. If you run Istio and your Prometheus retention is not enough, or you need to query Istio metrics across clusters from a single place, Thanos fills that gap. This guide walks through a complete Thanos setup specifically tuned for Istio metrics.

## Thanos Components Overview

Thanos has several components, and you do not need all of them. Here is what each one does in the context of Istio monitoring:

- **Sidecar**: Runs next to Prometheus, uploads TSDB blocks to object storage, and provides a gRPC endpoint for real-time data
- **Store Gateway**: Serves historical metric blocks from object storage
- **Querier**: Merges data from Sidecar and Store Gateway to answer queries
- **Compactor**: Compacts and downsamples blocks in object storage
- **Ruler** (optional): Evaluates recording and alerting rules against Thanos data

The minimal setup is: Sidecar + Store Gateway + Querier + Compactor.

## Prerequisites

You need:
- A running Prometheus instance scraping Istio metrics
- An object storage bucket (S3, GCS, or Azure Blob)
- The Prometheus Operator (recommended but not required)

## Step 1: Configure Object Storage

Create a secret with your object storage configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore
  namespace: istio-system
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: istio-thanos-metrics
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      access_key: "AKIAIOSFODNN7EXAMPLE"
      secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

For GCS:

```yaml
stringData:
  objstore.yml: |
    type: GCS
    config:
      bucket: istio-thanos-metrics
```

With GCS, use workload identity or a service account key mounted as a file.

## Step 2: Add Thanos Sidecar to Prometheus

If you use the Prometheus Operator, adding the Thanos sidecar is a single configuration change:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  replicas: 2
  retention: 4h  # Short local retention since Thanos handles long-term
  thanos:
    version: v0.34.1
    objectStorageConfig:
      key: objstore.yml
      name: thanos-objstore
  externalLabels:
    cluster: "production"
    region: "us-east-1"
```

The `externalLabels` are critical. They identify this Prometheus instance in the global Thanos view. Without them, metrics from different clusters would be indistinguishable.

The short `retention: 4h` means Prometheus only keeps recent data locally. Thanos uploads completed blocks (typically 2 hours old) to object storage.

## Step 3: Deploy the Store Gateway

The Store Gateway reads blocks from object storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-store
  namespace: istio-system
spec:
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
        image: quay.io/thanos/thanos:v0.34.1
        args:
        - store
        - --data-dir=/data
        - --objstore.config-file=/etc/thanos/objstore.yml
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:10902
        ports:
        - name: grpc
          containerPort: 10901
        - name: http
          containerPort: 10902
        volumeMounts:
        - name: objstore-config
          mountPath: /etc/thanos
        - name: data
          mountPath: /data
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-store
  namespace: istio-system
spec:
  selector:
    app: thanos-store
  ports:
  - name: grpc
    port: 10901
  - name: http
    port: 10902
```

## Step 4: Deploy the Querier

The Querier merges data from the Sidecar (recent data) and Store Gateway (historical data):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: istio-system
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
        image: quay.io/thanos/thanos:v0.34.1
        args:
        - query
        - --http-address=0.0.0.0:9090
        - --grpc-address=0.0.0.0:10901
        - --store=dnssrv+_grpc._tcp.thanos-store.istio-system.svc.cluster.local
        - --store=dnssrv+_grpc._tcp.prometheus-operated.istio-system.svc.cluster.local
        - --query.auto-downsampling
        ports:
        - name: http
          containerPort: 9090
        - name: grpc
          containerPort: 10901
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query
  namespace: istio-system
spec:
  selector:
    app: thanos-query
  ports:
  - name: http
    port: 9090
  - name: grpc
    port: 10901
```

The `--store` flags point to the gRPC endpoints of the Store Gateway and the Prometheus Sidecar. The `dnssrv+` prefix tells Thanos to use DNS SRV records for service discovery.

## Step 5: Deploy the Compactor

The Compactor runs as a singleton and handles compaction and downsampling:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-compact
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: thanos-compact
  template:
    metadata:
      labels:
        app: thanos-compact
    spec:
      containers:
      - name: thanos-compact
        image: quay.io/thanos/thanos:v0.34.1
        args:
        - compact
        - --data-dir=/data
        - --objstore.config-file=/etc/thanos/objstore.yml
        - --retention.resolution-raw=30d
        - --retention.resolution-5m=180d
        - --retention.resolution-1h=365d
        - --wait
        volumeMounts:
        - name: objstore-config
          mountPath: /etc/thanos
        - name: data
          mountPath: /data
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

The retention flags control how long each resolution level is kept:
- Raw (15s) data: 30 days
- 5-minute downsampled: 180 days
- 1-hour downsampled: 365 days

## Step 6: Configure Grafana

Point your Grafana data source to the Thanos Querier:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
data:
  thanos.yaml: |
    apiVersion: 1
    datasources:
    - name: Thanos
      type: prometheus
      url: http://thanos-query.istio-system.svc:9090
      isDefault: true
```

All your Istio dashboards now query through Thanos, which seamlessly merges recent data from Prometheus with historical data from object storage.

## Verifying the Setup

Check that all Thanos components can see each other:

```bash
# Check Querier stores
kubectl port-forward -n istio-system svc/thanos-query 9090:9090 &
curl -s localhost:9090/api/v1/stores | jq .
```

Query historical Istio metrics:

```bash
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(istio_requests_total[1h])) by (destination_service)'
```

Check the Compactor status:

```bash
kubectl logs -n istio-system -l app=thanos-compact --tail=50
```

## Performance Tuning for Istio

Istio generates high-cardinality metrics. Here are tuning tips specific to Istio + Thanos:

Set a store API series limit to prevent runaway queries:

```
--store.grpc.series-max-size=50000
```

Enable index caching on the Store Gateway for faster lookups:

```
--index-cache-size=1GB
```

Use recording rules in Prometheus to pre-aggregate Istio metrics before they hit Thanos, reducing the volume of raw data stored.

Thanos with Prometheus gives you the best of both worlds for Istio monitoring: fast recent queries from Prometheus and cost-effective long-term storage in object storage. The setup takes some effort upfront, but it runs reliably once deployed.

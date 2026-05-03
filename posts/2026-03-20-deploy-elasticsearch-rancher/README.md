# How to Deploy Elasticsearch on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Rancher, Kubernetes, Helm, StatefulSet, Search, Database, SUSE Rancher, Observability

Description: Learn how to deploy a production-ready Elasticsearch cluster on a Rancher-managed Kubernetes cluster using the Elastic Helm chart with persistent storage, security, and Kibana.

---

Elasticsearch on Kubernetes provides a scalable search and analytics engine. Deployed on Rancher, it benefits from persistent volume management, rolling updates, and integration with the broader SUSE observability ecosystem.

---

## Step 1: Add the Elastic Helm Repository

```bash
# Add the official Elastic Helm repository

helm repo add elastic https://helm.elastic.co
helm repo update

# Check available versions
helm search repo elastic/elasticsearch --versions | head -10
```

---

## Step 2: Configure System Prerequisites

Elasticsearch requires a higher `vm.max_map_count` value on all cluster nodes:

```bash
# Apply to all nodes via a DaemonSet (preferred for Kubernetes)
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: max-map-count-setter
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: max-map-count-setter
  template:
    metadata:
      labels:
        app: max-map-count-setter
    spec:
      initContainers:
        - name: set-max-map-count
          image: busybox
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.10
      tolerations:
        - operator: Exists
EOF
```

---

## Step 3: Create a Values File

```yaml
# elasticsearch-values.yaml
clusterName: "production-es"

replicas: 3            # 3 master-eligible + data nodes for small clusters
minimumMasterNodes: 2  # Quorum for 3-node cluster

# Resource requests for each Elasticsearch pod
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi

# JVM heap size - set to half of container memory limit
esJavaOpts: "-Xmx2g -Xms2g"

# Persistent storage
volumeClaimTemplate:
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi

# Enable security (X-Pack)
esConfig:
  elasticsearch.yml: |
    xpack.security.enabled: true
    xpack.security.transport.ssl.enabled: true

# Network host configuration
networkHost: "0.0.0.0"

# Pod disruption budget
maxUnavailable: 1
```

---

## Step 4: Deploy Elasticsearch

```bash
# Create the namespace
kubectl create namespace elasticsearch

# Deploy Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace elasticsearch \
  --values elasticsearch-values.yaml \
  --wait \
  --timeout 15m

# Check pod status
kubectl get pods -n elasticsearch
kubectl get pvc -n elasticsearch
```

---

## Step 5: Verify the Cluster Health

```bash
# Port-forward to access Elasticsearch
kubectl port-forward -n elasticsearch svc/elasticsearch-master 9200:9200 &

# Check cluster health
curl -u elastic:$(
  kubectl get secret elasticsearch-master-credentials \
    -n elasticsearch \
    -o jsonpath='{.data.password}' | base64 -d
) http://localhost:9200/_cluster/health?pretty

# Expected output:
# "status" : "green"
# "number_of_nodes" : 3
# "active_primary_shards" : ...
```

---

## Step 6: Deploy Kibana

```yaml
# kibana-values.yaml
elasticsearchHosts: "http://elasticsearch-master.elasticsearch.svc.cluster.local:9200"

kibanaConfig:
  kibana.yml: |
    server.basePath: ""
    elasticsearch.username: "elastic"

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: kibana.example.com
      paths:
        - path: /
```

```bash
helm install kibana elastic/kibana \
  --namespace elasticsearch \
  --values kibana-values.yaml \
  --wait
```

---

## Step 7: Create an Index and Test

```bash
# Get the elastic user password
ELASTIC_PASSWORD=$(kubectl get secret elasticsearch-master-credentials \
  -n elasticsearch \
  -o jsonpath='{.data.password}' | base64 -d)

# Create a test index
curl -u elastic:$ELASTIC_PASSWORD \
  -X PUT http://localhost:9200/my-index \
  -H 'Content-Type: application/json' \
  -d '{"settings":{"number_of_shards":1,"number_of_replicas":1}}'

# Index a document
curl -u elastic:$ELASTIC_PASSWORD \
  -X POST http://localhost:9200/my-index/_doc \
  -H 'Content-Type: application/json' \
  -d '{"title":"test document","timestamp":"2026-03-20"}'

# Search
curl -u elastic:$ELASTIC_PASSWORD \
  http://localhost:9200/my-index/_search?pretty
```

---

## Step 8: Monitor with Prometheus

The `elasticsearch-exporter` exposes Elasticsearch metrics for Prometheus:

```bash
helm install elasticsearch-exporter \
  prometheus-community/prometheus-elasticsearch-exporter \
  --namespace elasticsearch \
  --set es.uri="http://elastic:${ELASTIC_PASSWORD}@elasticsearch-master:9200" \
  --set serviceMonitor.enabled=true
```

Key metrics to monitor:

```promql
# Cluster health (0=green, 1=yellow, 2=red)
elasticsearch_cluster_health_status{color="green"}

# JVM heap usage
elasticsearch_jvm_memory_used_bytes{area="heap"}

# Indexing rate
rate(elasticsearch_indices_indexing_index_total[5m])

# Search latency
elasticsearch_indices_search_fetch_time_seconds
```

---

## Best Practices

- Always set `esJavaOpts` heap to 50% of the container memory limit - Elasticsearch needs the other 50% for OS file cache.
- Use `minimumMasterNodes` equal to `(replicas / 2) + 1` to prevent split-brain scenarios.
- Enable Elasticsearch security (`xpack.security.enabled: true`) even in development - it is much harder to add later without cluster downtime.

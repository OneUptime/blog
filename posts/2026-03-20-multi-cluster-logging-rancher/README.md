# How to Set Up Multi-Cluster Logging in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Logging, Multi-Cluster, Kubernetes, Fluentd, Elasticsearch, Observability

Description: Learn how to configure centralized multi-cluster logging in Rancher using the Logging operator to aggregate logs from all managed clusters into a single backend.

---

Centralizing logs from multiple Kubernetes clusters into one place is essential for troubleshooting and compliance. Rancher's Logging app, powered by Banzai Cloud's Logging Operator, makes this easy to configure across all managed clusters.

---

## Step 1: Install Rancher Logging Per Cluster

Enable the Logging app on each cluster via the Rancher UI (**Apps > Charts > Logging**) or Helm:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-logging \
  rancher-charts/rancher-logging \
  --namespace cattle-logging-system \
  --create-namespace
```

---

## Step 2: Configure a ClusterFlow

A `ClusterFlow` selects which logs to collect cluster-wide. This example collects all container logs:

```yaml
# clusterflow-all.yaml

apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  filters:
    - record_transformer:
        records:
          # Inject the cluster name so logs are identifiable after aggregation
          cluster: production-us-east
  match:
    - select: {}   # Match all pods
  globalOutputRefs:
    - central-elasticsearch
```

---

## Step 3: Configure a ClusterOutput for Elasticsearch

A `ClusterOutput` defines where the logs are sent. Point all clusters to the same Elasticsearch endpoint:

```yaml
# clusteroutput-elasticsearch.yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: central-elasticsearch
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    # Use a different index per cluster for easy filtering
    index_name: k8s-logs-production-us-east
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elasticsearch-creds
          key: password
    buffer:
      flush_interval: 10s
      chunk_limit_size: 8MB
```

---

## Step 4: Configure a ClusterOutput for Splunk (Alternative)

If your organization uses Splunk instead of Elasticsearch:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: central-splunk
  namespace: cattle-logging-system
spec:
  splunkHec:
    hec_host: splunk.example.com
    hec_port: 8088
    insecure_ssl: false
    hec_token:
      valueFrom:
        secretKeyRef:
          name: splunk-token
          key: token
    # Set the source to include the cluster name
    source: kubernetes-production-us-east
```

---

## Step 5: Namespace-Scoped Flows

For teams that only need their own namespace logs, use `Flow` and `Output` (not cluster-scoped):

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: my-team-logs
  namespace: my-team
spec:
  filters:
    - tag_normaliser: {}
  match:
    - select:
        labels:
          team: my-team
  localOutputRefs:
    - my-team-loki
```

---

## Step 6: Verify Log Collection

```bash
# Check that the Fluentd/Fluentbit pods are running
kubectl get pods -n cattle-logging-system

# Tail Fluentd logs for errors
kubectl logs -n cattle-logging-system \
  -l app.kubernetes.io/name=fluentd \
  --tail=50
```

---

## Best Practices

- Add a `cluster` field to every log record via `record_transformer` so you can filter by cluster in Kibana or Grafana Loki.
- Use **buffering** in ClusterOutputs to absorb spikes and prevent log loss during network hiccups.
- Set retention policies in Elasticsearch per environment - keep production logs longer than staging.
- Deploy a **log router** (e.g., Vector) in the central cluster to fan-out to multiple destinations.

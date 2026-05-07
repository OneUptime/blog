# How to Send Logs to Loki from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Loki

Description: Configure Rancher to send Kubernetes logs to Grafana Loki for cost-effective log aggregation integrated with Grafana.

Grafana Loki is a horizontally scalable log aggregation system designed to be cost-effective and easy to operate. Unlike Elasticsearch, Loki indexes only metadata (labels) rather than the full text of log lines, making it significantly more resource-efficient. Combined with Grafana, it provides a powerful logging solution. This guide covers sending Kubernetes logs from Rancher to Loki.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- A Loki instance (self-hosted or Grafana Cloud).
- Cluster admin permissions.

## Step 1: Deploy Loki in the Cluster

If you do not have Loki running, install it via Helm:

```bash
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
```

```yaml
# values-loki-dev.yaml
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    type: filesystem
  useTestSchema: true

deploymentMode: Monolithic

singleBinary:
  replicas: 1

backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0
```

```bash
helm install loki grafana-community/loki \
  --namespace logging \
  --create-namespace \
  -f values-loki-dev.yaml
```

For production, use object storage and multiple replicas:

```yaml
# values-loki-prod.yaml
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 3
  schemaConfig:
    configs:
      - from: "2024-04-01"
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h
  storage:
    type: s3
    bucketNames:
      chunks: my-loki-chunks
      ruler: my-loki-ruler
      admin: my-loki-admin
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      accessKeyId: <your-access-key-id>
      secretAccessKey: <your-secret-access-key>
      s3ForcePathStyle: false

deploymentMode: Monolithic

singleBinary:
  replicas: 3

backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0
```

```bash
helm install loki grafana-community/loki \
  --namespace logging \
  --create-namespace \
  -f values-loki-prod.yaml
```

## Step 2: Create a ClusterOutput for Loki

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: loki-output
  namespace: cattle-logging-system
spec:
  loki:
    url: http://loki-gateway.logging.svc.cluster.local
    labels:
      cluster: production
    remove_keys:
      - logtag
      - kubernetes
    configure_kubernetes_labels: true
    buffer:
      type: file
      path: /buffers/loki
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 5s
      flush_thread_count: 2
      retry_max_interval: 30s
      retry_forever: true
```

## Step 3: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-loki
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        suppress_parse_error_log: true

  globalOutputRefs:
    - loki-output
```

## Step 4: Configure Labels for Loki

Loki uses labels for indexing, so proper label configuration is crucial for query performance:

```yaml
spec:
  loki:
    url: http://loki-gateway.logging.svc.cluster.local
    labels:
      cluster: production
      job: kubernetes
    extra_labels:
      environment: production
    configure_kubernetes_labels: true
    drop_single_key: true
```

Important label guidelines:
- Keep the number of unique label combinations (cardinality) low.
- Good labels: cluster, namespace, application/service, environment.
- Pod names and most Kubernetes labels can be useful for troubleshooting, but use them sparingly because they increase cardinality.
- Avoid high-cardinality labels: request IDs, timestamps, user IDs.

## Step 5: Configure for Grafana Cloud Loki

For Grafana Cloud:

```bash
kubectl create secret generic grafana-cloud-secret \
  --namespace cattle-logging-system \
  --from-literal=username='your-grafana-cloud-user-id' \
  --from-literal=password='your-grafana-cloud-api-key'
```

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: grafana-cloud-loki
  namespace: cattle-logging-system
spec:
  loki:
    url: https://<your-logs-endpoint>
    username:
      valueFrom:
        secretKeyRef:
          name: grafana-cloud-secret
          key: username
    password:
      valueFrom:
        secretKeyRef:
          name: grafana-cloud-secret
          key: password
    labels:
      cluster: production
    configure_kubernetes_labels: true
    buffer:
      type: file
      path: /buffers/grafana-cloud
      chunk_limit_size: 8MB
      flush_interval: 10s
      retry_forever: true
```

## Step 6: Configure Loki as a Grafana Data Source

Add Loki as a data source in Grafana:

1. Open Grafana from **Monitoring > Grafana**.
2. Go to **Connections > Add new connection**.
3. Search for **Loki**.
4. Select **Loki**.
5. Set the URL to `http://loki-gateway.logging.svc.cluster.local`.
6. Click **Save & test**.

Or configure it through the monitoring chart:

```yaml
grafana:
  additionalDataSources:
    - name: Loki
      type: loki
      url: http://loki-gateway.logging.svc.cluster.local
      access: proxy
      isDefault: false
```

## Step 7: Query Logs in Grafana

Use LogQL to query logs in Grafana's Explore view:

```logql
# All logs from a namespace

{namespace="production"}

# Filter by pod name
{namespace="production", pod=~"api-server.*"}

# Search for error messages
{namespace="production"} |= "ERROR"

# Parse JSON logs and filter
{namespace="production"} | json | level="error"

# Count errors over time
count_over_time({namespace="production"} |= "ERROR" [5m])

# Top error-producing pods
topk(10, sum by (pod) (count_over_time({namespace="production"} |= "ERROR" [1h])))
```

## Step 8: Set Up Log-Based Alerts in Grafana

Create alerts based on log patterns:

1. In Grafana, go to **Alerting > Alert rules**.
2. Click **New alert rule**.
3. Select Loki as the data source.
4. Enter a LogQL query:

```logql
sum(count_over_time({namespace="production"} |= "ERROR" [5m])) > 50
```

5. Set the evaluation interval and conditions.
6. Configure contact points or notification policies.

## Step 9: Configure Loki Retention

Configure retention in Loki's configuration:

```yaml
# Loki config
limits_config:
  retention_period: 720h  # 30 days

compactor:
  working_directory: /var/loki/compactor
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: filesystem  # use s3/gcs/azure to match your backend
```

Retention with the Compactor requires a 24h index period, which the Helm values above set via TSDB.

## Step 10: Verify Log Delivery

Check Fluentd logs:

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd | grep -i loki
```

Query Loki directly:

In a separate terminal, start a port-forward to the Loki gateway:

```bash
kubectl port-forward -n logging svc/loki-gateway 3100:80
```

Then query Loki:

```bash
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={cluster="production"}' \
  --data-urlencode 'limit=5' \
  --data-urlencode 'since=1h' | jq '.data.result'
```

Check Loki health:

In a separate terminal, start a port-forward to the Loki service:

```bash
kubectl port-forward -n logging svc/loki 3101:3100
```

Then check the readiness and metrics endpoints:

```bash
curl -s http://localhost:3101/ready
curl -s http://localhost:3101/metrics | grep loki_ingester_streams_created_total
```

## Troubleshooting

- **Connection refused**: Verify Loki URL and port. Check if Loki pod is running.
- **Rate limiting**: Loki may reject logs if ingestion rate exceeds limits. Adjust `ingestion_rate_mb` in Loki config.
- **High cardinality errors**: Reduce the number of unique label combinations.
- **Query timeout**: Reduce the query time range or add more specific label filters.
- **No logs appearing**: Check that labels match your query. Verify the ClusterFlow is routing correctly.

## Summary

Sending logs to Loki from Rancher provides a cost-effective logging solution that integrates seamlessly with Grafana. Configure a ClusterOutput with Loki connection details, manage labels carefully to keep cardinality low, and use LogQL in Grafana for powerful log querying. Loki's label-based indexing makes it significantly cheaper to operate than full-text indexing solutions for most Kubernetes logging use cases.

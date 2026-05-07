# How to Send Logs to Elasticsearch from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Elasticsearch

Description: Configure Rancher to send Kubernetes cluster logs to Elasticsearch for centralized log storage and search.

Elasticsearch is one of the most popular log storage backends for Kubernetes environments. Combined with Kibana for visualization, it provides powerful full-text search and analytics capabilities for your cluster logs. This guide covers configuring Rancher's logging stack to send logs to Elasticsearch.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- An Elasticsearch cluster (self-hosted or managed service like Elastic Cloud, Amazon OpenSearch).
- Cluster admin permissions.

## Step 1: Prepare Elasticsearch

Ensure your Elasticsearch cluster is accessible from the Kubernetes cluster. If running Elasticsearch inside the cluster:

```bash
# Check Elasticsearch service

kubectl get svc -n logging elasticsearch

# Verify connectivity
kubectl run curl-test --rm -it --image=curlimages/curl -- \
  curl -s https://elasticsearch.logging.svc.cluster.local:9200 -u elastic:password -k
```

## Step 2: Create Elasticsearch Credentials Secret

```bash
kubectl create secret generic elasticsearch-credentials \
  --namespace cattle-logging-system \
  --from-literal=username=elastic \
  --from-literal=password='your-elasticsearch-password'
```

If using TLS with custom certificates:

```bash
kubectl create secret generic elasticsearch-tls \
  --namespace cattle-logging-system \
  --from-file=ca.crt=/path/to/ca.crt
```

## Step 3: Create a ClusterOutput for Elasticsearch

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: elasticsearch-output
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    ssl_verify: true
    ca_file:
      mountFrom:
        secretKeyRef:
          name: elasticsearch-tls
          key: ca.crt
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elasticsearch-credentials
          key: password
    logstash_format: true
    logstash_prefix: kubernetes
    logstash_dateformat: "%Y.%m.%d"
    include_tag_key: true
    tag_key: "@log_name"
    reconnect_on_error: true
    reload_on_failure: true
    reload_connections: false
    request_timeout: 30s
    buffer:
      type: file
      path: /buffers/elasticsearch
      chunk_limit_size: 8MB
      total_limit_size: 5GB
      flush_interval: 5s
      flush_thread_count: 4
      retry_max_interval: 60
      retry_forever: true
      overflow_action: block
      flush_at_shutdown: true
```

## Step 4: Configure Index Settings

### Time-Based Indices

Using logstash format creates daily indices like `kubernetes-2026.03.19`:

```yaml
spec:
  elasticsearch:
    logstash_format: true
    logstash_prefix: kubernetes
    logstash_dateformat: "%Y.%m.%d"
```

### Custom Index per Namespace

Route logs to different indices based on namespace:

```yaml
# ClusterFlow
spec:
  filters:
    - record_transformer:
        enable_ruby: true
        records:
          - target_index: "kubernetes-${record.dig(\"kubernetes\", \"namespace_name\")}"
---
# ClusterOutput
spec:
  elasticsearch:
    logstash_format: false
    target_index_key: target_index
```

### Index Templates

Create an Elasticsearch index template for daily `kubernetes-*` indices. Use the Elasticsearch API or Kibana:

```json
{
  "index_patterns": ["kubernetes-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "kubernetes-logs-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "log": { "type": "text" },
        "kubernetes": {
          "properties": {
            "namespace_name": { "type": "keyword" },
            "pod_name": { "type": "keyword" },
            "container_name": { "type": "keyword" },
            "host": { "type": "keyword" }
          }
        }
      }
    }
  }
}
```

## Step 5: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-elasticsearch
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false

    - record_transformer:
        records:
          - cluster_name: "production"

  globalOutputRefs:
    - elasticsearch-output
```

## Step 6: Configure for Amazon OpenSearch

If your Amazon OpenSearch Service domain uses the internal user database and HTTP basic authentication:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: opensearch-output
  namespace: cattle-logging-system
spec:
  opensearch:
    host: search-my-domain-xxxxxxxxxx.us-east-1.es.amazonaws.com
    port: 443
    scheme: https
    ssl_verify: true
    user: master-user
    password:
      valueFrom:
        secretKeyRef:
          name: opensearch-credentials
          key: password
    logstash_format: true
    logstash_prefix: kubernetes
    buffer:
      type: file
      path: /buffers/opensearch
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 10s
      retry_forever: true
```

## Step 7: Configure for Elastic Cloud

For Elastic Cloud hosted Elasticsearch:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: elastic-cloud-output
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: my-deployment.es.us-central1.gcp.cloud.es.io
    port: 9243
    scheme: https
    ssl_verify: true
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elastic-cloud-credentials
          key: password
    logstash_format: true
    logstash_prefix: kubernetes
    buffer:
      type: file
      path: /buffers/elastic-cloud
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 5s
      retry_forever: true
```

## Step 8: Configure Index Lifecycle Management

Set up ILM policies to manage log retention. For daily `logstash`-style indices, create an ILM policy without rollover:

```json
{
  "policy": {
    "phases": {
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Step 9: Verify Log Delivery

Check Fluentd logs for Elasticsearch output status:

```bash
kubectl get pods -n cattle-logging-system
kubectl logs -n cattle-logging-system <fluentd-pod-name> -c fluentd | grep elasticsearch
```

Verify data in Elasticsearch:

```bash
# Check index count
curl -s https://elasticsearch.logging.svc.cluster.local:9200/_cat/indices/kubernetes-* -u elastic:password -k

# Query recent logs
curl -s https://elasticsearch.logging.svc.cluster.local:9200/kubernetes-*/_search?size=1 -u elastic:password -k | jq '.hits.hits[0]'
```

## Troubleshooting

**Connection refused**: Verify Elasticsearch is reachable and the host/port are correct.

**Authentication errors**: Check the username and password in the secret.

**Certificate errors**: Ensure the CA certificate is correct and mounted. Try `ssl_verify: false` temporarily for debugging.

**Buffer overflow**: Increase `total_limit_size` or reduce `flush_interval`. Check if Elasticsearch is responding slowly.

**Index write errors**: Check Elasticsearch cluster health and disk space. Ensure the index template allows the document structure.

## Summary

Sending logs to Elasticsearch from Rancher involves creating a ClusterOutput with Elasticsearch connection details and a ClusterFlow to route logs. Configure index naming, buffer settings, and TLS for production use. Use Index Lifecycle Management in Elasticsearch to automate log retention and cleanup.

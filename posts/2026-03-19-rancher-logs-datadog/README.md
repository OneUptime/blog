# How to Send Logs to Datadog from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Datadog

Description: Configure Rancher to forward Kubernetes cluster logs to Datadog for unified observability with metrics, traces, and logs.

Datadog is a comprehensive observability platform that combines metrics, traces, and logs in a single interface. Sending Kubernetes logs from Rancher to Datadog enables correlated observability across your entire stack. This guide covers configuring the Rancher logging stack to forward logs to Datadog's log intake API.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- A Datadog account with a valid API key.
- Cluster admin permissions.

## Step 1: Obtain Your Datadog API Key

1. Log in to Datadog.
2. Navigate to **Organization Settings > API Keys**.
3. Copy an existing API key or create a new one.

## Step 2: Create the API Key Secret

```bash
kubectl create secret generic datadog-api-secret \
  --namespace cattle-logging-system \
  --from-literal=api-key='your-datadog-api-key'
```

## Step 3: Create a ClusterOutput for Datadog

Rancher's logging operator supports Datadog through the Fluentd Datadog output plugin:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: datadog-output
  namespace: cattle-logging-system
spec:
  datadog:
    api_key:
      valueFrom:
        secretKeyRef:
          name: datadog-api-secret
          key: api-key
    dd_source: kubernetes
    dd_sourcecategory: kubernetes
    dd_tags: "cluster:production,environment:prod"
    host: http-intake.logs.datadoghq.com
    port: "443"
    ssl_port: "443"
    use_ssl: true
    buffer:
      type: file
      path: /buffers/datadog
      chunk_limit_size: 5MB
      total_limit_size: 2GB
      flush_interval: 5s
      flush_thread_count: 2
      retry_max_interval: 60s
      retry_forever: true
```

For Datadog EU:

```yaml
spec:
  datadog:
    host: http-intake.logs.datadoghq.eu
```

## Step 4: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-datadog
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false

    - record_transformer:
        records:
          - cluster_name: "production"

  match:
    - select: {}

  globalOutputRefs:
    - datadog-output
```

## Step 5: Add Kubernetes Tags for Datadog

If you want to enrich the cluster-wide flow with Kubernetes metadata as Datadog tags, update the `ClusterFlow` from Step 4 instead of creating a second `ClusterFlow`:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-datadog
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false

    - record_transformer:
        enable_ruby: true
        records:
          - cluster_name: "production"
          - ddtags: >-
              cluster:production,
              environment:prod,
              namespace:${record.dig("kubernetes", "namespace_name")},
              pod:${record.dig("kubernetes", "pod_name")},
              container:${record.dig("kubernetes", "container_name")}
          - ddsource: "kubernetes"
          - service: "${record.dig('kubernetes', 'labels', 'app') || record.dig('kubernetes', 'container_name')}"

  match:
    - select: {}

  globalOutputRefs:
    - datadog-output
```

## Step 6: Route Different Logs with Different Tags

If you want separate routing for infrastructure and application logs, replace the single cluster-wide `ClusterFlow` with the following two `ClusterFlow` resources so each log line matches only one flow:

```yaml
# Infrastructure logs

apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: infra-to-datadog
  namespace: cattle-logging-system
spec:
  match:
    - select:
        namespaces:
          - kube-system
          - cattle-system
          - cattle-logging-system
  filters:
    - parser:
        parse:
          type: json
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false
    - record_transformer:
        enable_ruby: true
        records:
          - ddsource: "kubernetes"
          - ddtags: "cluster:production,environment:prod,team:platform,layer:infrastructure"
          - service: "${record.dig('kubernetes', 'labels', 'app') || record.dig('kubernetes', 'container_name')}"
  globalOutputRefs:
    - datadog-output
---
# Application logs
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: app-to-datadog
  namespace: cattle-logging-system
spec:
  match:
    - exclude:
        namespaces:
          - kube-system
          - cattle-system
          - cattle-logging-system
    - select: {}
  filters:
    - parser:
        parse:
          type: json
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false
    - record_transformer:
        enable_ruby: true
        records:
          - ddsource: "kubernetes"
          - ddtags: "cluster:production,environment:prod,team:engineering,layer:application"
          - service: "${record.dig('kubernetes', 'labels', 'app') || record.dig('kubernetes', 'container_name')}"
  globalOutputRefs:
    - datadog-output
```

## Step 7: Configure Log Processing Pipelines in Datadog

After logs arrive in Datadog, set up processing pipelines:

1. In Datadog, go to **Logs > Configuration > Pipelines**.
2. Click **New Pipeline**.
3. Set a filter query like `source:kubernetes`.
4. Add processors:
   - **Grok Parser**: Parse structured log formats.
   - **Category Processor**: Categorize logs by severity.
   - **Attribute Remapper**: Map fields to standard Datadog attributes.

Example pipeline processors:
- Remap `level` to Datadog's `status` attribute.
- Extract `service` from Kubernetes labels.
- Parse JSON payloads from application logs.

## Step 8: Set Up Log-Based Monitors

Create alerts in Datadog based on log patterns:

1. Go to **Monitors > New Monitor**.
2. Select **Log Monitor**.
3. Configure the query:

```plaintext
source:kubernetes status:error service:my-api
```

4. Set thresholds:
   - Alert when error count exceeds 100 in 5 minutes.
   - Warning when error count exceeds 50 in 5 minutes.

5. Configure notification channels and message templates.

## Step 9: Configure Log Archives and Rehydration

Set up log archives for long-term storage:

1. In Datadog, go to **Logs > Configuration > Archives**.
2. Click **New Archive**.
3. Configure storage (S3, GCS, or Azure Blob).
4. Set a filter query and retention period.

Archives allow you to rehydrate historical logs for investigation without keeping them in the live index.

## Step 10: Verify Log Delivery

Check Fluentd logs:

```bash
kubectl get pods -n cattle-logging-system | grep fluentd
kubectl logs -n cattle-logging-system <fluentd-pod-name> -c fluentd | grep -i datadog
```

In Datadog:
1. Go to **Logs > Explorer**.
2. Search for `source:kubernetes`.
3. Verify logs are appearing with correct tags and metadata.

## Troubleshooting

- **403 Forbidden**: The API key is invalid. Verify the key in Datadog.
- **Connection timeout**: Check that the cluster can reach `http-intake.logs.datadoghq.com` on port 443.
- **Missing tags**: Verify the record_transformer filter is setting tags correctly.
- **Duplicate logs**: Ensure only one ClusterFlow matches each log line.
- **Rate limiting**: Datadog may throttle high-volume ingestion. Check Datadog's log intake limits.

## Summary

Sending logs to Datadog from Rancher provides unified observability by combining logs with metrics and traces. Configure a ClusterOutput with your Datadog API key, enrich logs with Kubernetes metadata as Datadog tags, and use Datadog's log processing pipelines and monitors for analysis and alerting. Use log archives for cost-effective long-term retention.

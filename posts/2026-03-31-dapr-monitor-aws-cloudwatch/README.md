# How to Monitor Dapr on AWS with CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, CloudWatch, Monitoring, Metric, Observability

Description: Configure Dapr metrics and logs to flow into AWS CloudWatch using the OpenTelemetry Collector, and create dashboards and alarms to monitor your Dapr services.

---

Dapr exposes Prometheus-format metrics and structured logs that can be shipped to AWS CloudWatch using the OpenTelemetry Collector or FluentBit. This lets you monitor Dapr sidecar health, service invocation latency, and pub/sub throughput alongside other AWS metrics.

## Configure Dapr to Emit Metrics

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  metric:
    enabled: true
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

## Deploy OpenTelemetry Collector for CloudWatch

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
          - job_name: 'dapr-metrics'
            scrape_interval: 15s
            kubernetes_sd_configs:
            - role: pod
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
              action: keep
              regex: "true"
            - source_labels: [__meta_kubernetes_pod_ip]
              target_label: __address__
              replacement: "$1:9090"

    exporters:
      awsemf:
        region: us-east-1
        namespace: Dapr/Metrics
        log_group_name: /dapr/metrics
        log_stream_name: eks-cluster

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          exporters: [awsemf]
```

## Ship Dapr Logs to CloudWatch with FluentBit

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File  parsers.conf

    [INPUT]
        Name          tail
        Path          /var/log/containers/*dapr*.log
        Parser        docker
        Tag           dapr.*
        Refresh_Interval 5

    [FILTER]
        Name  grep
        Match dapr.*
        Regex log .+

    [OUTPUT]
        Name              cloudwatch_logs
        Match             dapr.*
        region            us-east-1
        log_group_name    /dapr/application-logs
        log_stream_prefix dapr-
        auto_create_group true
```

## Create CloudWatch Alarms

```bash
# Alarm on high service invocation error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "DaprHighErrorRate" \
  --metric-name "dapr_http_server_request_count" \
  --namespace "Dapr/Metrics" \
  --dimensions Name=app_id,Value=order-service Name=status,Value=500 \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:dapr-alerts \
  --region us-east-1

# Alarm on high pub/sub processing latency
aws cloudwatch put-metric-alarm \
  --alarm-name "DaprHighPubSubLatency" \
  --metric-name "dapr_component_pubsub_egress_latencies" \
  --namespace "Dapr/Metrics" \
  --extended-statistic p99 \
  --period 60 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:dapr-alerts \
  --region us-east-1
```

## Key Dapr Metrics to Monitor

```bash
# Service invocation metrics
# dapr_http_server_request_count     - total requests by status code
# dapr_http_server_latency           - request latency histogram
# dapr_http_client_request_count     - outbound requests

# Pub/Sub metrics
# dapr_component_pubsub_ingress_count    - messages received
# dapr_component_pubsub_egress_count     - messages published
# dapr_component_pubsub_egress_latencies - publish latency

# State store metrics
# dapr_state_query_total             - state operations
# dapr_runtime_component_init_total  - component initialization
```

## CloudWatch Insights Query

```bash
# Query Dapr logs for errors
aws logs start-query \
  --log-group-name /dapr/application-logs \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message
    | filter @message like /error/
    | sort @timestamp desc
    | limit 50' \
  --region us-east-1
```

## Summary

Dapr's Prometheus metrics endpoint and structured JSON logs integrate with AWS CloudWatch through the OpenTelemetry Collector and FluentBit. CloudWatch alarms on error rates and latency metrics provide proactive alerting, while CloudWatch Insights enables ad-hoc log analysis. This observability stack works for both EKS and ECS deployments with minimal configuration changes.

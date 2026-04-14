# How to Send Dapr Logs to Splunk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Splunk, Logging, Observability, Kubernetes

Description: Learn how to forward Dapr sidecar and application logs to Splunk using the Splunk OpenTelemetry Collector or Fluent Bit with the Splunk HEC output plugin.

---

## Overview

Splunk is a popular log management and SIEM platform widely used in enterprise environments. Sending Dapr logs to Splunk enables correlation with security events, operational dashboards, and compliance reporting across your microservices.

## Enabling JSON Logging in Dapr

Configure Dapr to emit structured JSON logs via pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-port: "8080"
        dapr.io/log-as-json: "true"
        dapr.io/log-level: "info"
```

## Option 1: Using Fluent Bit with Splunk HEC

Deploy Fluent Bit with the Splunk HEC output plugin:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-splunk-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf
        Flush 5
        Daemon Off

    [INPUT]
        Name tail
        Path /var/log/containers/*daprd*.log
        Parser docker
        Tag dapr.*
        DB /var/log/flb_dapr.db

    [FILTER]
        Name kubernetes
        Match dapr.*
        Kube_URL https://kubernetes.default.svc:443
        Merge_Log On

    [OUTPUT]
        Name splunk
        Match dapr.*
        Host splunk-hec.splunk.svc
        Port 8088
        Splunk_Token ${SPLUNK_HEC_TOKEN}
        TLS On
        TLS.Verify Off
        Splunk_Send_Raw Off
        Event_Key _raw
        Event_Sourcetype dapr:json
        Event_Source kubernetes
        Event_Index dapr_logs
```

## Option 2: Using OpenTelemetry Collector

Send Dapr logs via the OpenTelemetry Collector to Splunk:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      filelog:
        include:
          - /var/log/containers/*daprd*.log
        operators:
          - type: json_parser
          - type: move
            from: attributes.msg
            to: body

    processors:
      batch:
        timeout: 5s
      resource:
        attributes:
          - key: service.name
            from_attribute: app_id
            action: insert

    exporters:
      splunk_hec:
        endpoint: https://splunk-hec.example.com:8088/services/collector
        token: "${SPLUNK_HEC_TOKEN}"
        index: dapr_logs
        source: kubernetes
        sourcetype: dapr:json
        tls:
          insecure_skip_verify: false

    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [batch, resource]
          exporters: [splunk_hec]
```

## Splunk Search Queries

Once logs are ingested, use SPL (Search Processing Language) to query Dapr logs:

```text
# Find all errors from the payment service
index=dapr_logs sourcetype="dapr:json" app_id="payment-service" level="error"

# Count errors by service in the last hour
index=dapr_logs sourcetype="dapr:json" level="error"
  | stats count by app_id
  | sort -count

# Find slow operations (high latency log messages)
index=dapr_logs sourcetype="dapr:json"
  | spath output=latency path=latencyMs
  | where latency > 1000
  | table _time, app_id, msg, latency
```

## Creating a Splunk Dashboard for Dapr

Build a Splunk dashboard with key panels:

```text
# Panel 1: Log volume by service
index=dapr_logs | timechart count by app_id

# Panel 2: Error rate
index=dapr_logs level="error"
  | timechart count as errors
  | appendcols [search index=dapr_logs | timechart count as total]
  | eval error_rate = errors/total * 100

# Panel 3: Top warning messages
index=dapr_logs level="warning"
  | top limit=10 msg
```

## Summary

Sending Dapr logs to Splunk can be achieved through Fluent Bit with the Splunk HEC plugin or via the OpenTelemetry Collector. Enable Dapr JSON logging to produce structured events that Splunk can parse efficiently. Use SPL to build dashboards tracking error rates, log volumes by service, and latency anomalies for comprehensive Dapr microservice observability.

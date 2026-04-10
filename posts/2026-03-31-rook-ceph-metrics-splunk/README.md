# How to Set Up Ceph Metrics in Splunk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Splunk, Monitoring, Observability

Description: Learn how to collect and visualize Ceph cluster metrics in Splunk using the Splunk OpenTelemetry Collector and Prometheus receiver.

---

## Overview

Splunk Observability Cloud and Splunk Enterprise both support ingesting Ceph Prometheus metrics. The most common approach uses the Splunk OpenTelemetry Collector with a Prometheus receiver to scrape the Ceph manager endpoint and forward data to Splunk's infrastructure monitoring platform.

## Step 1 - Enable the Ceph Prometheus Exporter

```bash
# Ensure the Ceph manager Prometheus module is running
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus

# Confirm the service endpoint
kubectl -n rook-ceph get svc rook-ceph-mgr
# Look for port 9283
```

## Step 2 - Deploy the Splunk OpenTelemetry Collector

```bash
helm repo add splunk-otel-collector-chart \
  https://signalfx.github.io/splunk-otel-collector-chart
helm repo update

helm install splunk-otel-collector \
  splunk-otel-collector-chart/splunk-otel-collector \
  --namespace splunk-otel --create-namespace \
  --set splunkObservability.accessToken=<YOUR_ACCESS_TOKEN> \
  --set splunkObservability.realm=us1 \
  --set clusterName=my-ceph-cluster \
  --set agent.enabled=true
```

## Step 3 - Configure the Prometheus Receiver

Add a custom Prometheus scrape job to the collector configuration:

```yaml
# splunk-otel-values.yaml
agent:
  config:
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: ceph-mgr
              scrape_interval: 30s
              static_configs:
                - targets:
                    - rook-ceph-mgr.rook-ceph.svc.cluster.local:9283
              metric_relabel_configs:
                - source_labels: [__name__]
                  regex: "ceph_(health_status|osd_up|osd_in|pool_bytes_used|pool_max_avail|mon_quorum_status|osd_apply_latency_ms)"
                  action: keep
    service:
      pipelines:
        metrics:
          receivers: [hostmetrics, kubeletstats, prometheus]
```

Apply with Helm:

```bash
helm upgrade splunk-otel-collector \
  splunk-otel-collector-chart/splunk-otel-collector \
  -f splunk-otel-values.yaml \
  --namespace splunk-otel
```

## Step 4 - Forward Metrics to Splunk Enterprise (HEC)

For on-premises Splunk, use the Splunk HEC exporter with the HTTP Event Collector:

```yaml
exporters:
  splunk_hec:
    token: <HEC_TOKEN>
    endpoint: "https://splunk-enterprise.example.com:8088/services/collector"
    source: ceph
    sourcetype: ceph_metrics
    index: infra_metrics
    tls:
      insecure_skip_verify: false
      ca_file: /etc/ssl/certs/splunk-ca.crt
```

## Step 5 - Create SPL Searches for Ceph

Once metrics arrive in Splunk, use SPL to query them:

```sql
| mstats avg("ceph.health_status") as health WHERE index=infra_metrics span=5m
| eval health_label=case(health=0,"OK",health=1,"WARN",health=2,"ERR")
| timechart avg(health) by health_label

| mstats latest("ceph.pool_bytes_used") as used, latest("ceph.pool_max_avail") as avail
  WHERE index=infra_metrics BY pool_name
| eval pct_used=round(used/(used+avail)*100, 2)
| table pool_name, pct_used
```

## Step 6 - Set Up Splunk Alerts

```bash
# Create a saved search alert via Splunk REST API
curl -u admin:password \
  "https://splunk-enterprise.example.com:8089/servicesNS/admin/search/saved/searches" \
  -d name="Ceph Health Alert" \
  -d search="| mstats avg(ceph.health_status) WHERE index=infra_metrics | where 'avg(ceph.health_status)' > 0" \
  -d is_scheduled=1 \
  -d "cron_schedule=*/5 * * * *" \
  -d alert_type=always \
  -d alert.severity=3 \
  -d actions=email \
  -d "action.email.to=oncall@example.com"
```

## Summary

Shipping Ceph metrics to Splunk uses the Splunk OpenTelemetry Collector's Prometheus receiver to scrape the Ceph manager endpoint and forward data to either Splunk Observability Cloud or Splunk Enterprise via HEC. SPL queries enable rich analysis of health status, OSD availability, and pool capacity utilization for both dashboards and automated alerting.

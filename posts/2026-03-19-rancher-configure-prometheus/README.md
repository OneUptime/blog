# How to Configure Prometheus in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus

Description: Learn how to configure Prometheus settings in Rancher including retention, storage, scrape intervals, and resource allocation.

Prometheus is the backbone of Rancher's monitoring stack. While Rancher installs Prometheus with sensible defaults, most production environments need customized configuration for retention policies, storage sizing, scrape intervals, and resource limits. This guide covers all the key Prometheus configuration options available in Rancher.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- kubectl access to the target cluster.

## Understanding Prometheus in Rancher

Rancher deploys Prometheus using the Prometheus Operator. This means configuration is managed through Custom Resource Definitions (CRDs) rather than raw configuration files. By default, the primary custom resource is the `Prometheus` resource in the `cattle-monitoring-system` namespace.

## Step 1: Access Prometheus Configuration

You can modify Prometheus settings by upgrading the monitoring Helm chart:

1. In the Rancher UI, navigate to **Apps & Marketplace > Installed Apps**.
2. Find `rancher-monitoring` and click the three-dot menu.
3. Select **Upgrade**.
4. Modify the values in the configuration form or switch to YAML mode.

## Step 2: Configure Data Retention

By default, Prometheus retains data for 10 days. Adjust the retention period based on your needs:

```yaml
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: "45GB"
```

The `retention` field sets the time-based retention, while `retentionSize` caps the total disk usage. When either limit is reached, older data is removed first.

## Step 3: Configure Storage

For production deployments, always use persistent storage:

```yaml
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: "gp3"
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
```

Replace `gp3` with your cluster's StorageClass name. Check available storage classes with:

```bash
kubectl get storageclass
```

## Step 4: Adjust Scrape Intervals

The global scrape interval determines how often Prometheus collects metrics from targets. The default is 30 seconds:

```yaml
prometheus:
  prometheusSpec:
    scrapeInterval: "30s"
    evaluationInterval: "30s"
```

Shorter intervals provide more granular data but increase CPU, memory, and storage usage. For most environments, 30 seconds is a good balance. High-frequency monitoring may use 15 seconds, while cost-conscious setups may use 60 seconds.

## Step 5: Configure Resource Limits

Size Prometheus resources based on your cluster's workload count:

```yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi
```

A rough guideline: Prometheus needs approximately 1-2 bytes per time series sample. For a cluster with 100,000 active time series scraped every 30 seconds with 30-day retention, plan for around 50 GB of storage.

## Step 6: Configure External Labels

External labels are added to all metrics and are useful for identifying the source cluster in multi-cluster setups:

```yaml
prometheus:
  prometheusSpec:
    externalLabels:
      cluster: "production-us-east-1"
      environment: "production"
```

## Step 7: Configure Remote Write

To send metrics to a remote storage backend like Thanos, Cortex, or Mimir, configure remote write:

```yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: "https://mimir.example.com/api/v1/push"
        basicAuth:
          username:
            name: remote-write-credentials
            key: username
          password:
            name: remote-write-credentials
            key: password
        writeRelabelConfigs:
          - sourceLabels: [__name__]
            regex: "unnecessary_metric_.*"
            action: drop
```

First create the credentials secret:

```bash
kubectl create secret generic remote-write-credentials \
  --namespace cattle-monitoring-system \
  --from-literal=username=your-username \
  --from-literal=password=your-password
```

## Step 8: Configure Additional Scrape Configs

To scrape targets not covered by ServiceMonitors or PodMonitors, add additional scrape configurations:

```yaml
prometheus:
  prometheusSpec:
    additionalScrapeConfigs:
      - job_name: "external-service"
        static_configs:
          - targets:
              - "external-app.example.com:9090"
        metrics_path: "/metrics"
        scheme: "https"
        tls_config:
          insecure_skip_verify: false
```

## Step 9: Configure Alerting Targets

Prometheus evaluates alerting rules and sends alerts to Alertmanager. Verify the Alertmanager endpoint configuration:

```yaml
prometheus:
  prometheusSpec:
    alertingEndpoints:
      - namespace: cattle-monitoring-system
        name: rancher-monitoring-alertmanager
        port: http-web
        pathPrefix: /
```

This is configured automatically by Rancher but can be customized if you use an external Alertmanager.

## Step 10: Apply Configuration Changes

After modifying the values, click **Upgrade** to apply the changes. The Prometheus Operator will reconcile the new configuration, and some changes trigger a rolling restart of the Prometheus pods.

Verify the restart completed successfully:

```bash
kubectl get pods -n cattle-monitoring-system -l app.kubernetes.io/name=prometheus
```

Check the Prometheus configuration was applied:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

Then inspect the active configuration:

```bash
curl http://localhost:9090/api/v1/status/config
```

## Verifying Configuration via CLI

You can inspect the Prometheus custom resource directly:

```bash
kubectl get prometheus -n cattle-monitoring-system -o yaml
```

This shows all the configured settings including scrape intervals, retention, storage, and external labels.

## Performance Tuning Tips

For large clusters, consider these additional settings:

```yaml
prometheus:
  prometheusSpec:
    walCompression: true
    query:
      maxConcurrency: 20
      maxSamples: 50000000
      timeout: 2m
```

WAL compression reduces disk I/O, while query settings prevent runaway queries from consuming too many resources.

## Summary

Configuring Prometheus in Rancher involves adjusting the Prometheus Operator settings through the monitoring Helm chart. Key areas to configure include retention policies, persistent storage, scrape intervals, resource limits, and remote write targets. Always size your Prometheus deployment based on the number of active time series and your retention requirements.

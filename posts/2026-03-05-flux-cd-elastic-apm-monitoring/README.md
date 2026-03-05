# How to Configure Flux CD with Elastic APM for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Elastic, APM, Elasticsearch, Kibana, Observability

Description: Learn how to integrate Flux CD with the Elastic Stack to monitor reconciliation metrics, collect controller logs, and visualize GitOps pipeline health in Kibana.

---

The Elastic Stack (Elasticsearch, Kibana, and Beats) provides a powerful platform for monitoring Flux CD. By using Metricbeat to scrape Prometheus metrics from Flux controllers and Filebeat to collect controller logs, you get a unified view of both metrics and logs in Kibana. This guide walks through setting up the complete integration.

## Architecture Overview

The integration works as follows:

1. **Metricbeat** scrapes Prometheus metrics from Flux CD controller pods using the Prometheus module.
2. **Filebeat** collects structured JSON logs from Flux controller containers.
3. Both ship data to **Elasticsearch**.
4. **Kibana** provides dashboards and alerting.

## Step 1: Configure Metricbeat to Scrape Flux Metrics

Deploy Metricbeat with the Prometheus module enabled and configured to scrape Flux CD controllers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metricbeat-flux-config
  namespace: elastic-system
data:
  flux-prometheus.yml: |
    - module: prometheus
      period: 30s
      metricsets: ["collector"]
      hosts:
        - "source-controller.flux-system.svc.cluster.local:8080"
      metrics_path: /metrics
      metrics_filters:
        include:
          - "gotk_*"
          - "controller_runtime_*"
          - "workqueue_*"
      processors:
        - add_fields:
            target: ""
            fields:
              service.name: flux-source-controller

    - module: prometheus
      period: 30s
      metricsets: ["collector"]
      hosts:
        - "kustomize-controller.flux-system.svc.cluster.local:8080"
      metrics_path: /metrics
      metrics_filters:
        include:
          - "gotk_*"
          - "controller_runtime_*"
      processors:
        - add_fields:
            target: ""
            fields:
              service.name: flux-kustomize-controller

    - module: prometheus
      period: 30s
      metricsets: ["collector"]
      hosts:
        - "helm-controller.flux-system.svc.cluster.local:8080"
      metrics_path: /metrics
      metrics_filters:
        include:
          - "gotk_*"
          - "controller_runtime_*"
      processors:
        - add_fields:
            target: ""
            fields:
              service.name: flux-helm-controller
```

Install Metricbeat with the Elastic Helm chart:

```bash
helm repo add elastic https://helm.elastic.co
helm repo update

helm install metricbeat elastic/metricbeat \
  -n elastic-system \
  --create-namespace \
  -f metricbeat-values.yaml
```

## Step 2: Configure Filebeat for Flux Controller Logs

Flux controllers output structured JSON logs. Configure Filebeat to collect and parse them:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-flux-config
  namespace: elastic-system
data:
  flux-inputs.yml: |
    - type: container
      paths:
        - /var/log/containers/source-controller-*.log
        - /var/log/containers/kustomize-controller-*.log
        - /var/log/containers/helm-controller-*.log
        - /var/log/containers/notification-controller-*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
              - logs_path:
                  logs_path: "/var/log/containers/"
        - decode_json_fields:
            fields: ["message"]
            target: "flux"
            overwrite_keys: true
        - add_fields:
            target: ""
            fields:
              service.type: flux-cd
      fields:
        pipeline: flux-cd
      fields_under_root: true
```

## Step 3: Verify Data in Elasticsearch

After deploying the agents, verify that Flux data is arriving. In Kibana Dev Tools, run:

```json
GET /metricbeat-*/_search
{
  "size": 5,
  "query": {
    "bool": {
      "must": [
        { "exists": { "field": "prometheus.metrics.gotk_reconcile_condition" } }
      ]
    }
  }
}
```

For logs, check:

```json
GET /filebeat-*/_search
{
  "size": 5,
  "query": {
    "bool": {
      "must": [
        { "match": { "kubernetes.namespace": "flux-system" } }
      ]
    }
  }
}
```

## Step 4: Build Kibana Dashboards

Create visualizations in Kibana for Flux CD monitoring.

**Reconciliation Status Panel:**

Use a Lens visualization with:

- Index pattern: `metricbeat-*`.
- Filter: `prometheus.labels.type: "Ready"`.
- Metric: Count of documents where `prometheus.metrics.gotk_reconcile_condition` equals 1.
- Break down by: `prometheus.labels.status` (True/False).

**Reconciliation Duration Over Time:**

Create a TSVB (Time Series Visual Builder) panel:

- Index pattern: `metricbeat-*`.
- Metric: Average of `prometheus.metrics.gotk_reconcile_duration_seconds`.
- Group by: `prometheus.labels.kind`.
- Time range: Last 6 hours.

**Flux Controller Error Logs:**

Create a data table:

- Index pattern: `filebeat-*`.
- Filter: `kubernetes.namespace: "flux-system" AND flux.level: "error"`.
- Columns: timestamp, controller name, message.

**Reconciliation Error Rate:**

- Index pattern: `metricbeat-*`.
- Metric: Derivative of Max on `prometheus.metrics.controller_runtime_reconcile_errors_total`.
- Split by: `prometheus.labels.controller`.

## Step 5: Set Up Kibana Alerting Rules

Create alerting rules in Kibana for Flux CD issues. Navigate to **Kibana > Stack Management > Rules and Connectors**.

**Flux Reconciliation Failure:**

- Rule type: Elasticsearch query.
- Index: `metricbeat-*`.
- Query: `prometheus.metrics.gotk_reconcile_condition: 1 AND prometheus.labels.type: "Ready" AND prometheus.labels.status: "False"`.
- Condition: Above 0 results over the last 10 minutes.
- Action: Send to Slack, email, or PagerDuty connector.

**Flux Controller Error Logs Spike:**

- Rule type: Elasticsearch query.
- Index: `filebeat-*`.
- Query: `kubernetes.namespace: "flux-system" AND flux.level: "error"`.
- Condition: Above 10 results in last 5 minutes.
- Action: Send to PagerDuty connector.

## Step 6: Forward Flux Events to Elasticsearch

Send Flux reconciliation events directly to Elasticsearch using the notification controller:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: elastic-provider
  namespace: flux-system
spec:
  type: generic
  address: https://your-elasticsearch-host:9200/flux-events/_doc
  secretRef:
    name: elastic-credentials
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: elastic-events
  namespace: flux-system
spec:
  providerRef:
    name: elastic-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 7: Create a Unified Dashboard

Combine metrics and logs in a single Kibana dashboard. The unified dashboard should include:

1. A metrics panel showing reconciliation health from Metricbeat data.
2. A log panel showing recent errors from Filebeat data.
3. A timeline correlating reconciliation events with log entries.
4. Resource usage panels for controller pods from the Kubernetes integration.

Export the dashboard for version control:

```bash
curl -X POST "http://kibana.elastic-system.svc:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  --form file=@flux-dashboard.ndjson
```

## Summary

Integrating Flux CD with the Elastic Stack involves configuring Metricbeat to scrape Prometheus metrics from Flux controllers and Filebeat to collect structured logs. The key metrics -- `gotk_reconcile_condition`, `gotk_reconcile_duration_seconds`, and `gotk_suspend_status` -- are ingested into Elasticsearch and visualized in Kibana dashboards. Kibana alerting rules provide notifications when reconciliations fail or error rates spike. Combining metrics, logs, and events in a single Kibana dashboard gives you comprehensive visibility into your Flux CD GitOps pipeline.

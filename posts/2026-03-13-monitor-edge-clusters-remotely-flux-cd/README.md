# How to Monitor Edge Clusters Remotely with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Monitoring, Prometheus

Description: Set up remote monitoring for edge clusters managed by Flux CD, using Prometheus federation, push-based metrics, and Flux notification webhooks.

---

## Introduction

Edge clusters by their nature are remote - often behind firewalls, on cellular connections, or at sites with limited IT staff. Monitoring them effectively requires a different approach from cloud cluster monitoring. You cannot simply set up a centralized Prometheus and scrape from it - firewalls and NAT prevent inbound connections. Instead, edge clusters must push their metrics and events outward to a central collection point.

Flux CD's notification system provides a built-in mechanism for pushing Flux-specific events to external systems. Combined with push-based Prometheus remote write, log shipping, and Flux's GitOps-managed monitoring configuration, you can have full observability into hundreds of edge clusters from a central dashboard.

This guide covers setting up comprehensive remote monitoring for edge clusters managed by Flux CD, with the monitoring configuration itself delivered through GitOps.

## Prerequisites

- Central monitoring cluster with a remote-write-compatible metrics endpoint, Grafana, and Loki
- Edge clusters with Flux CD deployed
- Flux custom resource metrics enabled in kube-state-metrics for Flux readiness dashboards and alerts
- Network path that allows outbound HTTPS from edge sites to the central monitoring cluster
- `flux` and `kubectl` CLI access

## Step 1: Deploy the Edge Monitoring Stack via Flux

Deliver monitoring components to each edge cluster through Flux.

```yaml
# infrastructure/base/monitoring/helmrelease.yaml

# Deploy kube-prometheus-stack to edge clusters
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "84.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    # Minimal resource config for edge
    prometheus:
      prometheusSpec:
        externalLabels:
          edge_site_id: "${SITE_ID}"
          edge_region: "${SITE_REGION}"
        # Push metrics to central Prometheus
        remoteWrite:
          - url: https://prometheus.central.example.com/api/v1/write
            basicAuth:
              username:
                key: username
                name: remote-write-credentials
              password:
                key: password
                name: remote-write-credentials
        # Smaller retention on edge (central has the long-term data)
        retention: 24h
        retentionSize: 5GB
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 1Gi
    grafana:
      enabled: false  # Use central Grafana
    alertmanager:
      alertmanagerSpec:
        externalUrl: https://alertmanager.central.example.com
```

## Step 2: Configure Flux Notifications for Remote Alerting

```yaml
# infrastructure/base/monitoring/flux-provider.yaml
# Send Flux events to central monitoring
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: central-monitoring-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://events.central.example.com/flux
  secretRef:
    name: monitoring-webhook-token
  timeout: 30s
```

```yaml
# infrastructure/base/monitoring/flux-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-events
  namespace: flux-system
spec:
  providerRef:
    name: central-monitoring-webhook
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  eventMetadata:
    summary: "[${SITE_ID}] Flux event"
    edge_site_id: "${SITE_ID}"
    edge_region: "${SITE_REGION}"
```

## Step 3: Set Up Prometheus Federation for Edge Metrics

On the central monitoring cluster, configure Prometheus federation to pull key metrics from edge Prometheus instances when connectivity permits.

```yaml
# On central Prometheus: Federation config for edge clusters
# (Pull-based - works when edge sites have inbound connectivity)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: edge-federation
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: edge-federate-proxy
  endpoints:
    - port: proxy
      path: /federate
      params:
        'match[]':
          - '{job="kubelet"}'
          - '{job="node-exporter"}'
          - '{__name__=~"gotk_reconcile_duration_seconds.*"}'
          - 'gotk_resource_info'
      interval: 5m
      honorLabels: true
```

For push-based (firewall-friendly) metrics, the `remoteWrite` config in Step 1 handles this.

## Step 4: Deploy Alloy for Log Shipping from Edge

```yaml
# infrastructure/base/monitoring/alloy-logs.yaml
# Grafana Alloy on edge cluster ships logs to central Loki
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: alloy-logs
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: alloy
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: grafana-charts
        namespace: flux-system
  values:
    controller:
      type: deployment
      replicas: 1
    alloy:
      envFrom:
        - secretRef:
            name: loki-credentials
      configMap:
        content: |
          discovery.kubernetes "pods" {
            role = "pod"
          }

          loki.source.kubernetes "pods" {
            targets    = discovery.kubernetes.pods.targets
            forward_to = [loki.process.edge_labels.receiver]
          }

          loki.process "edge_labels" {
            stage.static_labels {
              values = {
                edge_site_id = "${SITE_ID}",
                edge_region  = "${SITE_REGION}",
              }
            }

            forward_to = [loki.write.central.receiver]
          }

          loki.write "central" {
            endpoint {
              url = "https://loki.central.example.com/loki/api/v1/push"
              basic_auth {
                username = "edge-site"
                password = sys.env("LOKI_PASSWORD")
              }
            }
          }
```

## Step 5: Create a Central Fleet Dashboard

```json
{
  "title": "Edge Fleet Overview",
  "panels": [
    {
      "title": "Edge Sites Connected",
      "type": "stat",
      "targets": [
        {
          "expr": "count(count by (edge_site_id) (up{job=\"node-exporter\"} == 1))",
          "legendFormat": "Connected Sites"
        }
      ]
    },
    {
      "title": "Flux Reconciliation Health",
      "type": "table",
      "targets": [
        {
          "expr": "max by (edge_site_id, name, customresource_kind) (gotk_resource_info{ready=\"True\"})",
          "legendFormat": "{{edge_site_id}} - {{customresource_kind}}/{{name}}"
        }
      ]
    },
    {
      "title": "Pods Not Running",
      "type": "table",
      "targets": [
        {
          "expr": "max by (edge_site_id, namespace, pod, phase) (kube_pod_status_phase{phase!~\"Running|Succeeded\"} == 1)",
          "legendFormat": "{{edge_site_id}} - {{namespace}}/{{pod}}"
        }
      ]
    },
    {
      "title": "Edge Site Last Seen",
      "type": "table",
      "targets": [
        {
          "expr": "time() - max by (edge_site_id) (max_over_time(timestamp(up{job=\"node-exporter\"} == 1)[30d:]))",
          "legendFormat": "{{edge_site_id}} - seconds since last contact"
        }
      ]
    }
  ]
}
```

## Step 6: Alerting for Fleet-Level Issues

```yaml
# PrometheusRule for fleet-wide alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: edge-fleet-alerts
  namespace: monitoring
spec:
  groups:
    - name: edge.fleet
      rules:
        - alert: EdgeSiteOffline
          expr: |
            time() - max by (edge_site_id) (max_over_time(timestamp(up{job="node-exporter"} == 1)[30m:])) > 900
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Edge site {{ $labels.edge_site_id }} offline for 15+ minutes"

        - alert: FluxReconciliationFailing
          expr: |
            gotk_resource_info{ready="False"} == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux reconciliation failing on {{ $labels.edge_site_id }}"
            description: "{{ $labels.customresource_kind }}/{{ $labels.exported_namespace }}/{{ $labels.name }} is not reconciling"
```

## Best Practices

- Use push-based metrics (remoteWrite) rather than pull-based scraping for edge sites behind firewalls.
- Label all metrics with `edge_site_id` and `edge_region` so you can filter by site in central Grafana.
- Set short retention (24h) on edge Prometheus - the central system is the long-term store.
- Configure alerting from the central system, not from edge Prometheus (edge Alertmanager may be offline).
- Use Flux notification webhooks as a lightweight signal alongside metrics-based connectivity health.
- Deploy the monitoring stack itself via Flux to ensure monitoring is consistently deployed across all sites.

## Conclusion

Remote monitoring of edge clusters requires a push-first approach that works through firewalls and intermittent connectivity. By combining Prometheus remoteWrite for metrics, Alloy log shipping to Loki, and Flux notification webhooks for GitOps events, you get comprehensive visibility into every edge cluster from a central dashboard. Managing the monitoring stack through Flux ensures every edge site has consistent, version-controlled observability configuration.

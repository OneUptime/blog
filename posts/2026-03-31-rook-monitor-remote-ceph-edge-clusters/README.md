# How to Monitor Remote Ceph Edge Clusters Centrally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Edge Computing, Prometheus

Description: Learn how to aggregate metrics from multiple remote Ceph edge clusters into a central Prometheus and Grafana stack for unified observability.

---

Managing many edge clusters means you cannot log into each one individually to check health. A centralized monitoring stack that pulls metrics from all edge sites gives you unified visibility without requiring persistent VPN connections.

## Architecture

```text
Edge Site 1: Ceph MGR Exporter -> Prometheus (edge) -> Federate
Edge Site 2: Ceph MGR Exporter -> Prometheus (edge) -> Federate
Edge Site N: Ceph MGR Exporter -> Prometheus (edge) -> Federate
                                             |
                                    Core Prometheus
                                             |
                                         Grafana
```

## Enabling Prometheus Metrics on Edge Clusters

On each edge cluster:

```bash
ceph mgr module enable prometheus
ceph config set mgr mgr/prometheus/server_addr 0.0.0.0
ceph config set mgr mgr/prometheus/server_port 9283
```

Expose via Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-prometheus-edge
  namespace: rook-ceph
  labels:
    site: edge-1
spec:
  selector:
    app: rook-ceph-mgr
  ports:
  - name: metrics
    port: 9283
    targetPort: 9283
  type: NodePort
```

## Configuring Federation at the Core

In the central Prometheus, add federation scrape configs:

```yaml
scrape_configs:
- job_name: 'ceph-edge-federation'
  scrape_interval: 60s
  honor_labels: true
  metrics_path: '/federate'
  params:
    match[]:
    - '{job="ceph"}'
    - 'ceph_health_status'
    - 'ceph_osd_up'
    - 'ceph_pg_inconsistent'
  static_configs:
  - targets:
    - 'edge1-prometheus.example.com:9090'
    labels:
      site: edge-1
  - targets:
    - 'edge2-prometheus.example.com:9090'
    labels:
      site: edge-2
```

## Alertmanager Configuration

Route alerts based on site label:

```yaml
routes:
- match:
    severity: critical
  receiver: ops-team
- match:
    site: edge-1
  receiver: edge-1-team
```

## Grafana Dashboard for Multi-Site

Import the official Ceph Grafana dashboard and add a site variable:

```json
{
  "templating": {
    "list": [
      {
        "name": "site",
        "type": "query",
        "query": "label_values(ceph_health_status, site)",
        "multi": true
      }
    ]
  }
}
```

Then filter all panels by `site=~"$site"`.

## Push-Based Alternative with Prometheus Remote Write

For sites where Prometheus cannot be scraped directly, use remote write:

```yaml
global:
  external_labels:
    site: edge-1

remote_write:
- url: http://core-prometheus.example.com:9090/api/v1/write
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'ceph_.*'
    action: keep
```

## Checking Health Across Sites

Query all sites at once:

```promql
ceph_health_status{site=~"edge.*"} != 0
```

Alert when any edge site is unhealthy:

```yaml
- alert: EdgeCephUnhealthy
  expr: ceph_health_status{site=~"edge.*"} > 0
  for: 5m
  annotations:
    summary: "Edge site {{ $labels.site }} Ceph cluster is unhealthy"
```

## Summary

Centralizing edge Ceph monitoring requires enabling the Prometheus MGR module on each site, exposing metrics via Kubernetes NodePort services, and configuring either Prometheus federation or remote write to aggregate data at the core. A shared Grafana dashboard with site-level filtering provides unified health visibility across all edge locations from a single pane of glass.

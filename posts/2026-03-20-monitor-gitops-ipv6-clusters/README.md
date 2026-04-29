# How to Monitor GitOps Deployments in IPv6 Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GitOps, Monitoring, Prometheus, ArgoCD, Flux CD, Kubernetes

Description: Monitor GitOps deployment health and drift in IPv6 Kubernetes clusters, including Prometheus metrics from ArgoCD and Flux CD, alerting on sync failures, and tracking IPv6 service availability.

## Introduction

Monitoring GitOps deployments in IPv6 clusters requires visibility into both the GitOps tooling (ArgoCD/Flux sync status, source connectivity) and the deployed workloads' IPv6 connectivity. Prometheus scrapes metrics from ArgoCD and Flux CD, which expose sync status, error counts, and health status for each application. Additional monitoring ensures deployed services are reachable over IPv6.

## ArgoCD Metrics for IPv6 Cluster Monitoring

```yaml
# argocd-metrics-scrape.yaml - Prometheus ServiceMonitor for ArgoCD

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-metrics
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

---
# ArgoCD server metrics (application sync status)

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-server-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  endpoints:
    - port: metrics
      interval: 30s
```

```promql
# Useful ArgoCD PromQL queries for IPv6 clusters

# Applications not synced
argocd_app_info{sync_status!="Synced"}

# Applications with health issues
argocd_app_info{health_status!="Healthy"}

# Git fetch request rate (spikes can indicate retries due to failures)
rate(argocd_git_request_total{request_type="fetch"}[5m])

# ArgoCD application sync activity (rate of failed syncs)
rate(argocd_app_sync_total{phase="Failed"}[5m])
```

## Flux CD Metrics for IPv6 Cluster

```yaml
# flux-metrics.yaml - Prometheus scrape for Flux controllers

apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-controllers
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app: source-controller   # Also: kustomize-controller, helm-controller
  podMetricsEndpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
```

```promql
# Flux CD PromQL queries

# GitRepository sync failures
gotk_reconcile_condition{type="Ready",status="False",kind="GitRepository"}

# Kustomization not ready
gotk_reconcile_condition{type="Ready",status="False",kind="Kustomization"}

# Source controller reconcile duration
histogram_quantile(0.99, gotk_reconcile_duration_seconds_bucket{kind="GitRepository"})

# Flux source errors (failed to fetch from IPv6 Git server)
rate(gotk_reconcile_condition{type="Ready",status="False"}[5m])
```

## Alert Rules for GitOps on IPv6 Clusters

```yaml
# /etc/prometheus/rules/gitops-ipv6.yaml

groups:
  - name: gitops_ipv6
    rules:
      # ArgoCD application out of sync
      - alert: ArgoCDAppOutOfSync
        expr: argocd_app_info{sync_status!="Synced"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD application {{ $labels.name }} is out of sync"
          description: "Application has been out of sync for more than 5 minutes"

      # Flux GitRepository failing to connect (IPv6 Git server issue)
      - alert: FluxGitSourceNotReady
        expr: gotk_reconcile_condition{kind="GitRepository",type="Ready",status="False"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Flux GitRepository {{ $labels.name }} is not ready"
          description: "Cannot fetch from Git repository - check IPv6 connectivity"

      # ArgoCD application sync failing (often a Git connectivity issue)
      - alert: ArgoCDAppSyncFailed
        expr: rate(argocd_app_sync_total{phase="Failed"}[5m]) > 0
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD application sync failures"
          description: "ArgoCD application sync is failing - check IPv6 Git server connectivity"
```

## Blackbox Exporter: Probe Deployed IPv6 Services

```yaml
# blackbox-ipv6-probes.yaml - Check deployed services are reachable over IPv6

apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: ipv6-service-probe
  namespace: monitoring
spec:
  jobName: ipv6-services
  prober:
    url: http://blackbox-exporter:9115
  module: http_2xx
  targets:
    staticConfig:
      labels:
        environment: production
        ip_version: ipv6
      static:
        # Test that deployed services respond over IPv6
        - "http://[2001:db8::1]:8080/health"
        - "http://[2001:db8::2]:8080/health"
        - "https://[2001:db8::3]:443/"
```

```yaml
# blackbox.yml - HTTP module for IPv6 probing
modules:
  http_2xx_ipv6:
    prober: http
    timeout: 10s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200, 204]
      method: GET
      preferred_ip_protocol: ip6   # Force IPv6
      ip_protocol_fallback: false  # Do not fall back to IPv4
```

## Grafana Dashboard for GitOps IPv6 Health

```json
// Grafana dashboard panels

// Panel 1: Application Sync Status
{
  "title": "ArgoCD Sync Status",
  "type": "stat",
  "targets": [{
    "expr": "count(argocd_app_info{sync_status='Synced'})",
    "legendFormat": "Synced"
  }, {
    "expr": "count(argocd_app_info{sync_status!='Synced'})",
    "legendFormat": "Not Synced"
  }]
}

// Panel 2: Flux Source Status
{
  "title": "Flux Sources Ready",
  "type": "gauge",
  "targets": [{
    "expr": "count(gotk_reconcile_condition{type='Ready',status='True'}) / count(gotk_reconcile_condition{type='Ready'})",
    "legendFormat": "Ready %"
  }]
}

// Panel 3: IPv6 Service Probe Success Rate
{
  "title": "IPv6 Service Availability",
  "type": "timeseries",
  "targets": [{
    "expr": "probe_success{job='ipv6-services'}",
    "legendFormat": "{{ instance }}"
  }]
}
```

## Check GitOps Source IPv6 Connectivity

```bash
# Debug ArgoCD source connectivity to IPv6 Git server
kubectl exec -n argocd deployment/argocd-repo-server -- \
    curl -6 -I "https://[2001:db8::4]:443"

# Debug Flux source-controller connectivity
kubectl exec -n flux-system deployment/source-controller -- \
    curl -6 -I "https://[2001:db8::4]:443"

# Check if IPv6 is available in GitOps controller pods
kubectl exec -n argocd deployment/argocd-repo-server -- ip -6 addr
kubectl exec -n flux-system deployment/source-controller -- ip -6 addr

# Test DNS resolution (should return AAAA)
kubectl exec -n flux-system deployment/source-controller -- \
    nslookup git.example.com
```

## Conclusion

Monitoring GitOps deployments in IPv6 clusters involves scraping ArgoCD and Flux CD metrics with Prometheus ServiceMonitor or PodMonitor resources, and adding alert rules for sync failures and Git source connectivity errors. The most valuable alerts catch Git repository fetch failures early - these often indicate IPv6 connectivity issues between the GitOps controller and the Git server. Supplement GitOps-level monitoring with Blackbox Exporter probes using `preferred_ip_protocol: ip6` to verify that deployed applications are actually reachable over IPv6. Grafana dashboards combining sync status, source health, and IPv6 service probe results provide complete GitOps visibility for IPv6 clusters.

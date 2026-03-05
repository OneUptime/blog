# How to Monitor Ambient Mode Component Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Monitoring, Health Check, Observability

Description: How to set up comprehensive monitoring for Istio ambient mode components including ztunnel, waypoint proxies, and the CNI agent.

---

Monitoring Istio ambient mode requires a different approach than monitoring sidecar mode. Instead of checking individual sidecar proxies, you are monitoring node-level components (ztunnel, CNI agent) and optional namespace-level components (waypoint proxies). Getting visibility into these components is essential for keeping your mesh healthy. Here is how to set it up.

## Components to Monitor

In ambient mode, you have three main components to watch:

1. **ztunnel DaemonSet** - runs on every node, handles L4 traffic and mTLS
2. **Istio CNI agent DaemonSet** - runs on every node, configures traffic redirection
3. **Waypoint proxies** - optional, deployed per namespace or service account for L7 features
4. **istiod** - the control plane, same as sidecar mode

Each has its own health indicators and metrics.

## Monitoring ztunnel Health

### Basic Health Checks

ztunnel exposes a health endpoint:

```bash
# Check readiness
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15021/healthz/ready
```

Set up a liveness and readiness probe monitoring:

```bash
# Check all ztunnel pods at once
for pod in $(kubectl get pods -n istio-system -l app=ztunnel -o name); do
  node=$(kubectl get $pod -n istio-system -o jsonpath='{.spec.nodeName}')
  status=$(kubectl exec -n istio-system ${pod##*/} -- curl -s -o /dev/null -w "%{http_code}" localhost:15021/healthz/ready 2>/dev/null)
  echo "$node: $status"
done
```

### ztunnel Metrics

ztunnel exposes Prometheus metrics on port 15020:

```bash
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | head -50
```

Key metrics to watch:

```bash
# Active connections
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | grep "ztunnel_connections"

# Bytes transferred
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | grep "ztunnel_bytes"

# Certificate status
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | grep "ztunnel_cert"
```

### Prometheus Scrape Configuration for ztunnel

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
      - job_name: 'ztunnel'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - istio-system
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: ztunnel
          - source_labels: [__address__]
            action: replace
            regex: ([^:]+)(?::\d+)?
            replacement: $1:15020
            target_label: __address__
          - source_labels: [__meta_kubernetes_pod_node_name]
            target_label: node
```

## Monitoring Waypoint Proxy Health

Waypoint proxies are standard Envoy proxies, so they expose the same endpoints as any Envoy instance:

```bash
# Check waypoint pod status
kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint

# Health check
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /ready

# Prometheus metrics
kubectl exec -n my-app deploy/waypoint -- \
  curl -s localhost:15020/stats/prometheus | head -50
```

### Key Waypoint Metrics

```bash
# Request metrics
kubectl exec -n my-app deploy/waypoint -- \
  curl -s localhost:15020/stats/prometheus | grep "istio_requests_total"

# Connection metrics
kubectl exec -n my-app deploy/waypoint -- \
  curl -s localhost:15020/stats/prometheus | grep "downstream_cx"

# Authorization denials
kubectl exec -n my-app deploy/waypoint -- \
  curl -s localhost:15020/stats/prometheus | grep "rbac"
```

### Prometheus Scrape Configuration for Waypoints

```yaml
- job_name: 'waypoint-proxies'
  kubernetes_sd_configs:
    - role: pod
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_gateway_networking_k8s_io_gateway-name]
      action: keep
      regex: .+
    - source_labels: [__address__]
      action: replace
      regex: ([^:]+)(?::\d+)?
      replacement: $1:15020
      target_label: __address__
    - source_labels: [__meta_kubernetes_namespace]
      target_label: namespace
```

## Monitoring the CNI Agent

The Istio CNI agent does not expose Prometheus metrics by default, but you can monitor it through Kubernetes:

```bash
# Check CNI agent status
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide

# Check for restarts (indicates crashes)
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o custom-columns=\
NAME:.metadata.name,NODE:.spec.nodeName,RESTARTS:.status.containerStatuses[0].restartCount

# Check logs for errors
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=20
```

## Setting Up Alerts

### ztunnel Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ambient-mode-alerts
  namespace: monitoring
spec:
  groups:
    - name: ztunnel-health
      rules:
        - alert: ZtunnelDown
          expr: |
            up{job="ztunnel"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "ztunnel on {{ $labels.node }} is down"
            description: "All ambient mesh traffic on this node is affected"

        - alert: ZtunnelHighRestarts
          expr: |
            increase(kube_pod_container_status_restarts_total{
              namespace="istio-system",
              pod=~"ztunnel.*"
            }[30m]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ztunnel {{ $labels.pod }} is restarting frequently"

        - alert: ZtunnelHighMemory
          expr: |
            container_memory_working_set_bytes{
              namespace="istio-system",
              container="istio-proxy",
              pod=~"ztunnel.*"
            } / container_spec_memory_limit_bytes{
              namespace="istio-system",
              container="istio-proxy",
              pod=~"ztunnel.*"
            } > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ztunnel {{ $labels.pod }} memory usage above 85%"
```

### Waypoint Alerts

```yaml
    - name: waypoint-health
      rules:
        - alert: WaypointDown
          expr: |
            kube_pod_status_ready{
              pod=~"waypoint.*"
            } == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Waypoint proxy in {{ $labels.namespace }} is not ready"

        - alert: WaypointHighErrorRate
          expr: |
            sum(rate(istio_requests_total{
              reporter="destination",
              response_code=~"5.*",
              pod=~"waypoint.*"
            }[5m])) by (namespace)
            /
            sum(rate(istio_requests_total{
              reporter="destination",
              pod=~"waypoint.*"
            }[5m])) by (namespace)
            > 0.05
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Waypoint in {{ $labels.namespace }} has >5% error rate"
```

### istiod Alerts

```yaml
    - name: istiod-health
      rules:
        - alert: IstiodDown
          expr: |
            up{job="istiod"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "istiod is not responding"

        - alert: IstiodPushErrors
          expr: |
            increase(pilot_xds_push_errors[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "istiod has configuration push errors"
```

## Building a Health Dashboard

Create a Grafana dashboard or use kubectl queries to get a quick health overview:

```bash
#!/bin/bash
# ambient-health-check.sh

echo "=== Istio Ambient Mode Health Check ==="
echo ""

echo "--- istiod ---"
kubectl get pods -n istio-system -l app=istiod --no-headers 2>/dev/null || echo "NOT FOUND"
echo ""

echo "--- ztunnel DaemonSet ---"
kubectl get daemonset ztunnel -n istio-system --no-headers 2>/dev/null
echo ""

echo "--- ztunnel Pods ---"
kubectl get pods -n istio-system -l app=ztunnel -o custom-columns=\
NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount \
  --no-headers 2>/dev/null
echo ""

echo "--- CNI Agent ---"
kubectl get daemonset istio-cni-node -n istio-system --no-headers 2>/dev/null
echo ""

echo "--- Waypoint Proxies ---"
kubectl get gateways -A --no-headers 2>/dev/null || echo "None deployed"
echo ""

echo "--- Ambient Namespaces ---"
kubectl get namespaces -l istio.io/dataplane-mode=ambient --no-headers 2>/dev/null
echo ""

echo "--- Configuration Sync ---"
istioctl proxy-status 2>/dev/null | head -20
```

Save this as a script and run it periodically or as part of your monitoring pipeline.

## Monitoring Control Plane to Data Plane Communication

istiod pushes configuration to ztunnel and waypoint proxies via xDS. Monitor push latency and errors:

```bash
# Check push status
istioctl proxy-status

# Check istiod push metrics
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep "pilot_xds_push"

# Check for stale or disconnected proxies
istioctl proxy-status | grep -v "SYNCED"
```

If you see proxies in NOT SENT or STALE status, istiod is having trouble pushing configuration to them.

## Log Aggregation

Aggregate logs from all ambient mode components to a central system:

```bash
# Collect ztunnel logs
kubectl logs -n istio-system -l app=ztunnel --all-containers --prefix

# Collect CNI agent logs
kubectl logs -n istio-system -l k8s-app=istio-cni-node --all-containers --prefix

# Collect waypoint logs (all namespaces)
kubectl logs -A -l gateway.networking.k8s.io/gateway-name --all-containers --prefix
```

For production, use a log shipping solution like Fluentd or Promtail to collect these logs automatically and send them to your log management system.

Monitoring ambient mode comes down to watching three layers: the node-level components (ztunnel and CNI agent), the optional namespace-level components (waypoint proxies), and the control plane (istiod). Set up alerts for each layer, and you will catch issues before they impact your workloads.

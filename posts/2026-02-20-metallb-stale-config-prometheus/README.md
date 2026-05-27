# How to Use the metallb_k8s_client_config_stale_bool Prometheus Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MetalLB, Prometheus, Metric, Monitoring

Description: Learn how to use the metallb_k8s_client_config_stale_bool Prometheus metric to detect stale MetalLB configuration in your cluster.

---

MetalLB exposes a Prometheus metric called `metallb_k8s_client_config_stale_bool` that tells you whether the running configuration matches what is stored in Kubernetes. When this metric is `1`, MetalLB is operating with outdated configuration, which can lead to silent failures. This post explains how to scrape, alert on, and use this metric effectively.

## What the Metric Means

The `metallb_k8s_client_config_stale_bool` metric is a boolean gauge:

- **0**: Configuration is current. MetalLB has successfully loaded the latest configuration resources.
- **1**: Configuration is stale. MetalLB failed to load the latest configuration and is running with an older version.

```mermaid
flowchart LR
    A[MetalLB Component] -->|Loads config| B{Config valid?}
    B -->|Yes| C["Metric = 0 (current)"]
    B -->|No| D["Metric = 1 (stale)"]
    C --> E[Normal operation]
    D --> F[Operating with OLD config]
    F --> G[New pools not available]
    F --> H[New advertisements not active]
```

## Where the Metric Is Exposed

Both the MetalLB controller and speaker pods expose this metric on their metrics port (default 7472 for speakers, 7472 for controller).

```bash
# Access speaker metrics via port-forward

kubectl port-forward -n metallb-system \
  $(kubectl get pod -n metallb-system -l component=speaker -o name | head -1) \
  7472:7472 &

# Query the stale config metric
curl -s http://localhost:7472/metrics | grep config_stale

# Expected output when config is current:
# metallb_k8s_client_config_stale_bool 0

# Kill the port-forward when done
kill %1
```

```bash
# Access controller metrics
kubectl port-forward -n metallb-system \
  $(kubectl get pod -n metallb-system -l component=controller -o name | head -1) \
  7472:7472 &

curl -s http://localhost:7472/metrics | grep config_stale

kill %1
```

## Checking All Speakers at Once

Since speakers run as a DaemonSet, you should check all of them. A stale config on even one speaker means that node is not operating correctly.

```bash
#!/bin/bash
# check-stale-config.sh
# Check the stale config metric on all MetalLB speaker pods

# Get all speaker pod names
SPEAKERS=$(kubectl get pods -n metallb-system -l component=speaker \
  -o jsonpath='{.items[*].metadata.name}')

for POD in $SPEAKERS; do
  # Get the node name for context
  NODE=$(kubectl get pod "$POD" -n metallb-system \
    -o jsonpath='{.spec.nodeName}')

  # Query the metric through a local port-forward
  LOCAL_PORT=$((17472 + RANDOM % 1000))
  kubectl port-forward -n metallb-system "pod/$POD" \
    "$LOCAL_PORT:7472" >/tmp/metallb-"$POD".log 2>&1 &
  PF_PID=$!
  sleep 2

  STALE=$(curl -fsS "http://127.0.0.1:$LOCAL_PORT/metrics" 2>/dev/null | \
    awk '$1 == "metallb_k8s_client_config_stale_bool" {print $2; exit}')

  kill "$PF_PID" 2>/dev/null
  wait "$PF_PID" 2>/dev/null

  if [ "$STALE" = "1" ]; then
    echo "ALERT: Speaker on node $NODE has STALE config"
  elif [ "$STALE" = "0" ]; then
    echo "OK: Speaker on node $NODE has current config"
  else
    echo "UNKNOWN: Could not read stale config metric from speaker on node $NODE"
  fi
done
```

## Setting Up Prometheus Scraping

To continuously monitor this metric, configure Prometheus to scrape MetalLB pods.

### Using ServiceMonitor (Prometheus Operator)

```yaml
# metallb-servicemonitor.yaml
# Services and ServiceMonitor to scrape MetalLB metrics with Prometheus Operator
apiVersion: v1
kind: Service
metadata:
  name: metallb-controller-metrics
  namespace: metallb-system
  labels:
    app: metallb
    component: controller
spec:
  selector:
    app: metallb
    component: controller
  ports:
    - name: monitoring
      port: 7472
      targetPort: monitoring
---
apiVersion: v1
kind: Service
metadata:
  name: metallb-speaker-metrics
  namespace: metallb-system
  labels:
    app: metallb
    component: speaker
spec:
  selector:
    app: metallb
    component: speaker
  ports:
    - name: monitoring
      port: 7472
      targetPort: monitoring
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metallb
  namespace: metallb-system
  labels:
    # Ensure this label matches your Prometheus operator's serviceMonitorSelector
    release: prometheus
spec:
  selector:
    matchLabels:
      # This matches the MetalLB metrics Services above
      app: metallb
  endpoints:
    - port: monitoring
      # Scrape interval - check config staleness every 30 seconds
      interval: 30s
      path: /metrics
```

### Using PodMonitor

```yaml
# metallb-podmonitor.yaml
# PodMonitor for scraping MetalLB speaker and controller pods directly
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: metallb-pods
  namespace: metallb-system
spec:
  selector:
    matchLabels:
      app: metallb
    matchExpressions:
      - key: component
        operator: In
        values:
          - controller
          - speaker
  podMetricsEndpoints:
    - port: monitoring
      interval: 30s
```

### Using Static Prometheus Config

```yaml
# prometheus.yml snippet
# Static scrape config for MetalLB metrics
scrape_configs:
  - job_name: 'metallb'
    # Discover MetalLB pods via Kubernetes service discovery
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - metallb-system
    relabel_configs:
      # Only scrape pods with the metallb app label
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: metallb
      # Only scrape controller and speaker pods
      - source_labels: [__meta_kubernetes_pod_label_component]
        action: keep
        regex: controller|speaker
      # Use the monitoring port
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        action: keep
        regex: monitoring
```

## Creating Alerting Rules

Set up alerts to fire when configuration becomes stale:

```yaml
# metallb-alerts.yaml
# PrometheusRule to alert on stale MetalLB configuration
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: metallb-config-alerts
  namespace: metallb-system
spec:
  groups:
    - name: metallb-config
      rules:
        # Alert when any MetalLB component has stale configuration
        - alert: MetalLBConfigStale
          # Fires when the stale metric is 1 for more than 5 minutes
          expr: metallb_k8s_client_config_stale_bool == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MetalLB configuration is stale on {{ $labels.pod }}"
            description: >
              The MetalLB component {{ $labels.pod }} has been running
              with stale configuration for more than 5 minutes. New IP
              pools and advertisements may not be active.
            runbook: "Check the affected MetalLB component logs, fix the invalid configuration, and restart the component if needed."
```

## Other Useful MetalLB Metrics

While checking the stale config metric, also monitor these related metrics:

```bash
# Query all MetalLB metrics to see what is available
curl -s http://localhost:7472/metrics | grep "^metallb_" | sort -u
```

Key metrics to watch:

| Metric | Description |
|--------|-------------|
| `metallb_k8s_client_config_stale_bool` | Config is outdated (1) or current (0) |
| `metallb_k8s_client_config_loaded_bool` | Config was ever successfully loaded |
| `metallb_allocator_addresses_in_use_total` | Number of IPs currently allocated |
| `metallb_allocator_addresses_total` | Total IPs available in all pools |
| `metallb_bgp_session_up` | BGP session state per peer in native BGP mode; default FRR-K8s mode uses `frrk8s_bgp_session_up` |
| `metallb_layer2_requests_received` | ARP/NDP requests handled |

## Building a Grafana Dashboard

Use PromQL queries to build a MetalLB health dashboard:

```mermaid
flowchart TD
    A[Grafana Dashboard] --> B[Panel: Config Staleness]
    A --> C[Panel: IP Pool Usage]
    A --> D[Panel: BGP Session Health]
    A --> E[Panel: L2 Request Rate]

    B --> F["metallb_k8s_client_config_stale_bool"]
    C --> G["allocated / total addresses"]
    D --> H["metallb_bgp_session_up"]
    E --> I["rate of metallb_layer2_requests_received"]
```

Example PromQL queries:

```promql
# Percentage of IP pool used
metallb_allocator_addresses_in_use_total / metallb_allocator_addresses_total * 100

# Config stale across all components (should be 0)
max(metallb_k8s_client_config_stale_bool)

# BGP sessions that are down in native BGP mode
metallb_bgp_session_up == 0

# BGP sessions that are down in the default FRR-K8s mode
frrk8s_bgp_session_up == 0
```

## Responding to a Stale Config Alert

When the alert fires:

```bash
# Step 1: Identify which component has stale config
kubectl get pods -n metallb-system -o wide

# Step 2: Check the component logs for config errors
kubectl logs -n metallb-system <pod-name> --tail=50 | grep -i "config\|error\|stale"

# Step 3: Fix the configuration error if found

# Step 4: Restart the component to force reload
kubectl rollout restart deployment controller -n metallb-system
kubectl rollout restart daemonset speaker -n metallb-system

# Step 5: Verify the metric returns to 0
kubectl port-forward -n metallb-system pod/<new-pod-name> 7472:7472 &
curl -s http://localhost:7472/metrics | grep config_stale
kill %1
```

## Monitoring with OneUptime

Prometheus metrics tell you about MetalLB's internal state, but you also need to verify that services are actually reachable by end users. [OneUptime](https://oneuptime.com) complements your Prometheus monitoring by testing service reachability from outside the cluster. When a stale configuration causes services to become unreachable, OneUptime detects the outage immediately, creates an incident, and notifies your team through multiple channels - giving you both internal metrics visibility and external availability confirmation.

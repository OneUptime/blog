# How to Monitor WireGuard Tunnel Status on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, Monitoring, VPN, Observability

Description: Learn how to monitor WireGuard tunnel health, throughput, and handshake status on Talos Linux for reliable encrypted networking.

---

Once you have WireGuard tunnels running on your Talos Linux cluster, you need visibility into their health. A tunnel that silently drops is worse than no tunnel at all because traffic might be routed into a black hole without any error messages. Monitoring WireGuard on Talos requires a different approach than on a standard Linux system because you cannot install monitoring agents directly on the immutable OS. Instead, you use talosctl, Kubernetes-based monitoring, and Prometheus exporters to track tunnel status.

This post covers the different methods for monitoring WireGuard tunnels on Talos Linux, from manual checks to fully automated alerting.

## What to Monitor

WireGuard exposes several metrics that tell you about tunnel health.

**Handshake timestamp** is the most important indicator. WireGuard performs a new handshake every two minutes when traffic is flowing, or when a keepalive fires. If the last handshake is older than a few minutes, the tunnel is likely down.

**Transfer counters** show how many bytes have been sent and received through each peer connection. If these counters stop incrementing, traffic is not flowing.

**Endpoint information** shows the current known IP and port for each peer. Changes in the endpoint can indicate network shifts or NAT changes.

## Manual Monitoring with talosctl

The quickest way to check WireGuard status on a Talos node is through talosctl.

```bash
# Read the WireGuard interface status
talosctl -n 192.168.1.1 read /proc/net/wireguard

# Example output:
# interface: wg0 fwmark: 0 public key: XK9Ct4hQLnP3V... listen port: 51820
#   peer: YH7Bs3gPLqM2W...
#     endpoint: 203.0.113.10:51820
#     allowed ips: 10.10.0.2/32
#     latest handshake: 1709488234
#     transfer: 15234567 received, 12345678 sent
#     persistent keepalive: every 25 seconds
```

You can also check the interface link status and addresses:

```bash
# Check the WireGuard interface is up
talosctl -n 192.168.1.1 get links | grep wg0

# Check the assigned addresses
talosctl -n 192.168.1.1 get addresses | grep wg0

# Test connectivity through the tunnel
talosctl -n 192.168.1.1 ping 10.10.0.2
```

For a quick health check across multiple nodes, script it:

```bash
# Check WireGuard status across all nodes
NODES=("192.168.1.1" "192.168.1.2" "192.168.1.3")

for node in "${NODES[@]}"; do
  echo "=== Node: $node ==="
  talosctl -n "$node" read /proc/net/wireguard 2>/dev/null | \
    grep -E "peer|latest handshake|transfer"
  echo ""
done
```

## Prometheus Exporter for WireGuard

For continuous monitoring, deploy a Prometheus exporter that collects WireGuard metrics and makes them available for scraping. The `prometheus-wireguard-exporter` is a popular choice.

Since Talos is immutable, you run the exporter as a Kubernetes DaemonSet with access to the host network and the WireGuard proc file.

```yaml
# wireguard-exporter-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: wireguard-exporter
  namespace: monitoring
  labels:
    app: wireguard-exporter
spec:
  selector:
    matchLabels:
      app: wireguard-exporter
  template:
    metadata:
      labels:
        app: wireguard-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9586"
    spec:
      hostNetwork: true
      containers:
        - name: exporter
          image: mindflavor/prometheus-wireguard-exporter:3.6.6
          args:
            - "-a"
            - "true"
            - "-p"
            - "9586"
          ports:
            - containerPort: 9586
              name: metrics
              protocol: TCP
          securityContext:
            capabilities:
              add:
                - NET_ADMIN
          volumeMounts:
            - name: proc-wireguard
              mountPath: /proc/net/wireguard
              readOnly: true
      volumes:
        - name: proc-wireguard
          hostPath:
            path: /proc/net/wireguard
            type: File
      tolerations:
        - effect: NoSchedule
          operator: Exists
```

Deploy the exporter:

```bash
kubectl apply -f wireguard-exporter-daemonset.yaml
```

### Prometheus Metrics

The exporter produces metrics like these:

```
# Bytes received from the peer
wireguard_received_bytes_total{interface="wg0",public_key="YH7Bs3g...",allowed_ips="10.10.0.2/32"} 15234567

# Bytes sent to the peer
wireguard_sent_bytes_total{interface="wg0",public_key="YH7Bs3g...",allowed_ips="10.10.0.2/32"} 12345678

# Timestamp of the latest handshake
wireguard_latest_handshake_seconds{interface="wg0",public_key="YH7Bs3g...",allowed_ips="10.10.0.2/32"} 1709488234
```

### Prometheus Scrape Configuration

Add a scrape config for the WireGuard exporter:

```yaml
# prometheus-scrape-config.yaml
# Add this to your Prometheus configuration
scrape_configs:
  - job_name: wireguard
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: wireguard-exporter
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}:9586
```

## Grafana Dashboard

With metrics in Prometheus, build a Grafana dashboard to visualize WireGuard tunnel health.

```json
{
  "panels": [
    {
      "title": "WireGuard Handshake Age",
      "type": "stat",
      "targets": [
        {
          "expr": "time() - wireguard_latest_handshake_seconds",
          "legendFormat": "{{ public_key }}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 180},
              {"color": "red", "value": 300}
            ]
          },
          "unit": "s"
        }
      }
    },
    {
      "title": "WireGuard Traffic Rate",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(wireguard_received_bytes_total[5m])",
          "legendFormat": "rx {{ public_key }}"
        },
        {
          "expr": "rate(wireguard_sent_bytes_total[5m])",
          "legendFormat": "tx {{ public_key }}"
        }
      ]
    }
  ]
}
```

## Alert Rules

Set up alerts to notify you when tunnels are unhealthy.

```yaml
# wireguard-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: wireguard-alerts
  namespace: monitoring
spec:
  groups:
    - name: wireguard.rules
      rules:
        # Alert when no handshake for 5 minutes
        - alert: WireGuardHandshakeStale
          expr: (time() - wireguard_latest_handshake_seconds) > 300
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "WireGuard peer {{ $labels.public_key }} handshake is stale"
            description: "No handshake for {{ $value | humanizeDuration }} on {{ $labels.instance }}"

        # Alert when no handshake for 15 minutes (critical)
        - alert: WireGuardTunnelDown
          expr: (time() - wireguard_latest_handshake_seconds) > 900
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "WireGuard tunnel to {{ $labels.public_key }} appears down"

        # Alert when transfer rate drops to zero unexpectedly
        - alert: WireGuardNoTraffic
          expr: rate(wireguard_received_bytes_total[10m]) == 0 and rate(wireguard_sent_bytes_total[10m]) == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "No WireGuard traffic for peer {{ $labels.public_key }}"
```

## Monitoring with a CronJob

If you do not have a Prometheus setup, a simple Kubernetes CronJob can check tunnel status and send alerts.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wireguard-health-check
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
            - name: checker
              image: alpine:3.19
              command:
                - /bin/sh
                - -c
                - |
                  # Read WireGuard status
                  HANDSHAKE=$(cat /proc/net/wireguard | grep "latest handshake" | awk '{print $3}')
                  NOW=$(date +%s)
                  AGE=$((NOW - HANDSHAKE))

                  if [ $AGE -gt 300 ]; then
                    echo "WARNING: WireGuard handshake is ${AGE}s old"
                    # Send alert via webhook
                    wget -qO- --post-data="{\"text\":\"WireGuard tunnel stale: ${AGE}s since last handshake\"}" \
                      https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
                  else
                    echo "OK: WireGuard handshake is ${AGE}s old"
                  fi
              volumeMounts:
                - name: proc-wireguard
                  mountPath: /proc/net/wireguard
                  readOnly: true
          volumes:
            - name: proc-wireguard
              hostPath:
                path: /proc/net/wireguard
          restartPolicy: OnFailure
```

## Conclusion

Monitoring WireGuard on Talos Linux requires combining talosctl for manual checks, Prometheus exporters for continuous metrics collection, and alerting rules for automated notification. The handshake timestamp is your primary health indicator. If it is recent, the tunnel is working. If it is stale, something needs investigation. Set up the exporter as a DaemonSet, create Grafana dashboards for visibility, and configure alerts so you know about tunnel issues before they affect your workloads. A well-monitored WireGuard setup on Talos gives you confidence that your encrypted tunnels are reliable.

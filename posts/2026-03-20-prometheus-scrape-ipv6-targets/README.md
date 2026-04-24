# How to Configure Prometheus to Scrape IPv6 Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv6, Monitoring, Metric, Scraping, Observability

Description: A guide to configuring Prometheus to scrape metrics from IPv6 targets, including static configs, service discovery, and relabeling rules.

Prometheus supports IPv6 target addresses with standard URL syntax - IPv6 addresses must be enclosed in brackets when specified in configuration. This guide covers static configs, file-based discovery, and Kubernetes IPv6 scraping.

## Step 1: Prometheus Listening on IPv6

Ensure Prometheus itself listens on IPv6 when started:

```bash
# Start Prometheus listening on all interfaces (IPv4 and IPv6)

./prometheus \
  --web.listen-address="[::]:9090" \
  --config.file=prometheus.yml
```

Or in a systemd unit:

```ini
# /etc/systemd/system/prometheus.service
[Service]
ExecStart=/usr/local/bin/prometheus \
  --web.listen-address=[::]:9090 \
  --config.file=/etc/prometheus/prometheus.yml
```

## Step 2: Static IPv6 Targets in prometheus.yml

```yaml
# prometheus.yml - Static scrape config for IPv6 targets
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape a Node Exporter at an IPv6 address
  - job_name: "node-exporter-ipv6"
    static_configs:
      - targets:
          # IPv6 addresses must be enclosed in brackets
          - "[2001:db8::10]:9100"
          - "[2001:db8::11]:9100"
          - "[2001:db8::12]:9100"
        labels:
          environment: "production"
          region: "us-east"

  # Scrape an application with both IPv4 and IPv6 targets
  - job_name: "app-metrics-dual-stack"
    static_configs:
      - targets:
          - "10.0.1.10:8080"        # IPv4 target
          - "[fd00::10]:8080"       # IPv6 target
```

## Step 3: File-Based Service Discovery for IPv6

```yaml
# prometheus.yml - File-based service discovery with IPv6
scrape_configs:
  - job_name: "dynamic-ipv6-targets"
    file_sd_configs:
      - files:
          - "/etc/prometheus/targets/ipv6-*.json"
        refresh_interval: 30s
```

Target file:

```json
[
  {
    "targets": [
      "[2001:db8::10]:9100",
      "[2001:db8::11]:9100"
    ],
    "labels": {
      "job": "node-exporter",
      "datacenter": "dc1",
      "ip_version": "ipv6"
    }
  }
]
```

## Step 4: Kubernetes IPv6 Pod Scraping

For Kubernetes clusters with IPv6 pods:

```yaml
# prometheus.yml - Kubernetes IPv6 pod scraping
scrape_configs:
  - job_name: "k8s-pods-ipv6"
    kubernetes_sd_configs:
      - role: pod
        api_server: "https://[2001:db8::1]:6443"
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

    relabel_configs:
      # Only scrape pods with the annotation prometheus.io/scrape: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      # If you relabel __address__, rebuild it from the pod IPv6 and container port
      - source_labels: [__meta_kubernetes_pod_ip, __meta_kubernetes_pod_container_port_number]
        regex: "([0-9A-Fa-f:]+);([0-9]+)"
        replacement: "[$1]:$2"
        target_label: __address__
```

## Step 5: Verify IPv6 Scraping Works

```bash
# Check Prometheus targets status
curl -6 http://[::1]:9090/api/v1/targets | jq '.data.activeTargets[].labels'

# Query a metric from an IPv6 target
curl -G -6 "http://[::1]:9090/api/v1/query" \
  --data-urlencode 'query=up{instance=~".*2001.*"}'

# Check for scrape errors
curl -6 "http://[::1]:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.health != "up")'
```

## Step 6: Relabeling to Track IPv6 Metrics

```yaml
# Add a label to distinguish IPv6 from IPv4 targets
relabel_configs:
  - source_labels: [__address__]
    regex: "\\[.+\\]:.+"   # Matches bracket-enclosed IPv6 addresses
    target_label: ip_family
    replacement: ipv6
  - source_labels: [__address__]
    regex: "[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+:.+"
    target_label: ip_family
    replacement: ipv4
```

Prometheus handles IPv6 targets natively - when you specify literal IPv6 addresses or rebuild `__address__` yourself, enclose the address in brackets to follow standard URI syntax (RFC 3986).

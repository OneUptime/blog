# How to Configure Prometheus Blackbox Exporter for IPv6 Probing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Blackbox Exporter, IPv6, Monitoring, Uptime, Probing

Description: A guide to configuring the Prometheus Blackbox Exporter to probe IPv6 endpoints for HTTP, TCP, DNS, and ICMP availability.

The Prometheus Blackbox Exporter performs active probing of endpoints and exports the results as metrics. Configuring it for IPv6 allows you to monitor the availability of IPv6 services directly.

## Step 1: Install and Start Blackbox Exporter

```bash
# Download and install

VERSION="0.28.0"
wget "https://github.com/prometheus/blackbox_exporter/releases/download/v${VERSION}/blackbox_exporter-${VERSION}.linux-amd64.tar.gz"
tar xzf "blackbox_exporter-${VERSION}.linux-amd64.tar.gz"
sudo install -m 0755 "blackbox_exporter-${VERSION}.linux-amd64/blackbox_exporter" /usr/local/bin/blackbox_exporter
sudo mkdir -p /etc/blackbox_exporter

# Start after creating the config file in Step 2
blackbox_exporter --config.file=/etc/blackbox_exporter/config.yml \
  --web.listen-address="[::]:9115"
```

On Linux, ICMP probing also requires `CAP_NET_RAW`, an allowed `net.ipv4.ping_group_range`, or running the exporter as root.

## Step 2: Configure IPv6 Probing Modules

```yaml
# /etc/blackbox_exporter/config.yml - Blackbox Exporter with IPv6 modules
modules:

  # HTTP probe that prefers IPv6 and can use IPv4 if no IPv6 address is available
  http_ipv6:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: "ip6"   # Prefer IPv6
      ip_protocol_fallback: true     # Use IPv4 if no IPv6 address is available
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      follow_redirects: true

  # HTTP probe that ONLY uses IPv6 (no fallback)
  http_ipv6_strict:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false    # Fail if IPv6 is not available
      valid_status_codes: [200]

  # ICMP ping using IPv6
  icmp_ipv6:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false

  # TCP connect check over IPv6
  tcp_ipv6:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false

  # DNS AAAA record lookup over IPv6 transport
  dns_aaaa:
    prober: dns
    timeout: 5s
    dns:
      transport_protocol: "tcp"
      preferred_ip_protocol: "ip6"
      query_name: "example.com"      # Domain to resolve; the probe target is the DNS resolver
      query_type: "AAAA"
      validate_answer_rrs:
        fail_if_none_matches_regexp:
          - ".*AAAA.*"
```

## Step 3: Configure Prometheus to Use the IPv6 Probes

```yaml
# prometheus.yml - Probe IPv6 endpoints using Blackbox Exporter
scrape_configs:

  # Probe web services over IPv6
  - job_name: "blackbox-http-ipv6"
    metrics_path: /probe
    params:
      module: [http_ipv6]
    static_configs:
      - targets:
          - "https://www.example.com"
          - "https://api.example.com"
          - "http://[2001:db8::10]:80"   # Direct IPv6 address
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: "[::1]:9115"  # Blackbox exporter IPv6 address

  # Probe with ICMP over IPv6
  - job_name: "blackbox-icmp-ipv6"
    metrics_path: /probe
    params:
      module: [icmp_ipv6]
    static_configs:
      - targets:
          - "2001:db8::10"
          - "2001:db8::11"
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: "[::1]:9115"
```

## Step 4: Useful Metrics from IPv6 Probes

```promql
# Check if IPv6 HTTP probes are up
probe_success{job="blackbox-http-ipv6"}

# HTTP response time for IPv6 targets
probe_duration_seconds{job="blackbox-http-ipv6"}

# IP protocol used by the probe (6 means IPv6)
probe_ip_protocol{job="blackbox-http-ipv6"}

# TLS certificate expiry for HTTPS IPv6 sites
probe_ssl_earliest_cert_expiry{job="blackbox-http-ipv6"}
```

## Step 5: Create an Alert for IPv6 Endpoint Failures

```yaml
# alerts.yml - Alert when IPv6 endpoint is down
groups:
  - name: ipv6-availability
    rules:
      - alert: IPv6EndpointDown
        expr: probe_success{job=~"blackbox-.*-ipv6"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 endpoint {{ $labels.instance }} is down"
          description: "Blackbox probe to {{ $labels.instance }} has been failing for 2 minutes"
```

The Blackbox Exporter's `preferred_ip_protocol: ip6` setting makes it simple to monitor IPv6 service availability alongside IPv4, enabling side-by-side comparison of dual-stack endpoint health.

# How to Monitor IPv6 Traffic with Prometheus and Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Prometheus, Grafana, Monitoring, Observability, DevOps

Description: A comprehensive guide to collecting, visualizing, and alerting on IPv6 network traffic using Prometheus exporters and Grafana dashboards for modern dual-stack infrastructure.

---

It's 2026 and IPv6 adoption has crossed the tipping point. Major cloud providers report over 60% of their traffic now flows over IPv6. Mobile carriers are IPv6-first. Content delivery networks prioritize IPv6 paths. Yet most monitoring setups still treat IPv6 as an afterthought, a checkbox, or worse, completely invisible.

If you can't see it, you can't debug it. If you can't debug it, you can't fix it.

This guide shows you how to build comprehensive IPv6 traffic monitoring using Prometheus and Grafana. You'll learn to collect the right metrics, write effective PromQL queries, build actionable dashboards, and set up alerts that catch IPv6-specific issues before they become incidents.

---

## Why IPv6 Monitoring Matters Now

The internet is transitioning, and the transition creates complexity:

**Dual-stack environments** run IPv4 and IPv6 simultaneously. A misconfigured firewall rule might block IPv6 while IPv4 works fine. Users on IPv6-only networks (increasingly common on mobile) see failures. Your IPv4-only monitoring shows green. Your users see red.

**Happy Eyeballs** (RFC 8305) means clients race IPv4 and IPv6 connections, picking the winner. If your IPv6 path is slow, clients still use it sometimes, creating intermittent latency spikes that traditional monitoring misses.

**NAT64/DNS64** gateways translate for IPv6-only clients trying to reach IPv4-only services. These translation points introduce latency, failure modes, and capacity constraints that need visibility.

**Security implications** multiply. IPv6 extension headers, larger address space for scanning, different firewall rule semantics, and potential tunnel-based bypasses all demand monitoring attention.

The bottom line: if you're running production infrastructure in 2026 and not monitoring IPv6 specifically, you have a blind spot.

---

## Architecture Overview

Here's what we're building:

```mermaid
flowchart LR
    subgraph infra["Network Infrastructure"]
        ne["node_exporter"]
        snmp["snmp_exporter"]
        bb["blackbox"]
        ipmi["ipmi_exporter"]
    end
    
    subgraph prom["Prometheus Server"]
        promql["PromQL Queries"]
        rec["Recording Rules"]
        alert["Alerting Rules"]
    end
    
    subgraph grafana["Grafana Dashboards"]
        traffic["Traffic Panels"]
        alerts["Alert Panels"]
        heat["Heatmaps"]
        tables["Tables"]
    end
    
    infra --> prom --> grafana
```

We'll use multiple exporters to capture different aspects of IPv6 traffic:

1. **Node Exporter**: System-level network metrics per interface
2. **SNMP Exporter**: Router and switch IPv6 statistics
3. **Blackbox Exporter**: IPv6 endpoint probing and reachability
4. **Custom Exporters**: Application-specific IPv6 metrics

---

## Part 1: Setting Up Exporters for IPv6 Metrics

### Node Exporter Configuration

Node Exporter provides foundational network interface metrics. By default, it exposes metrics for all interfaces, including IPv6.

Install and configure Node Exporter:

```bash
# Download and install
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.0/node_exporter-1.8.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.8.0.linux-amd64.tar.gz
cd node_exporter-1.8.0.linux-amd64

# Run with network collectors enabled
./node_exporter \
  --collector.netdev \
  --collector.netstat \
  --collector.conntrack \
  --collector.sockstat \
  --web.listen-address=":9100"
```

Create a systemd service for production:

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=node_exporter
ExecStart=/usr/local/bin/node_exporter \
  --collector.netdev \
  --collector.netstat \
  --collector.conntrack \
  --collector.sockstat \
  --collector.tcpstat \
  --web.listen-address="[::]:9100"

[Install]
WantedBy=multi-user.target
```

Note the `[::]:9100` listen address, this binds to both IPv4 and IPv6.

### Key Node Exporter Metrics for IPv6

```promql
# Network interface metrics (applies to IPv6-enabled interfaces)
node_network_receive_bytes_total
node_network_transmit_bytes_total
node_network_receive_packets_total
node_network_transmit_packets_total
node_network_receive_errs_total
node_network_transmit_errs_total
node_network_receive_drop_total
node_network_transmit_drop_total

# Socket statistics
node_sockstat_TCP6_inuse
node_sockstat_UDP6_inuse
node_sockstat_RAW6_inuse
node_sockstat_FRAG6_inuse

# Netstat protocol statistics (from /proc/net/snmp6)
# Important: InReceives/OutRequests count packets, not bytes.
# For byte counters, use Ip6_InOctets/Ip6_OutOctets.
node_netstat_Ip6_InReceives   # packets received
node_netstat_Ip6_OutRequests  # packets sent
node_netstat_Ip6_InOctets     # bytes received
node_netstat_Ip6_OutOctets    # bytes sent
node_netstat_Ip6_InDelivers
node_netstat_Ip6_OutNoRoutes
node_netstat_Icmp6_InMsgs
node_netstat_Icmp6_OutMsgs
node_netstat_Udp6_InDatagrams
node_netstat_Udp6_OutDatagrams
```

### SNMP Exporter for Network Devices

For routers, switches, and firewalls, SNMP provides IPv6-specific MIBs.

Create an SNMP exporter configuration for IPv6:

```yaml
# snmp.yml
modules:
  ipv6_traffic:
    walk:
      - 1.3.6.1.2.1.55      # IP-MIB (IPv6)
      - 1.3.6.1.2.1.56      # IPv6-ICMP-MIB
      - 1.3.6.1.2.1.4.31    # IP-FORWARD-MIB (IPv6 routes)
    metrics:
      - name: ipv6IfStatsInReceives
        oid: 1.3.6.1.2.1.55.1.6.1.1
        type: counter
        help: Total IPv6 packets received on interface
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsInHdrErrors
        oid: 1.3.6.1.2.1.55.1.6.1.2
        type: counter
        help: IPv6 packets discarded due to header errors
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsInAddrErrors
        oid: 1.3.6.1.2.1.55.1.6.1.4
        type: counter
        help: IPv6 packets discarded due to address errors
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsOutForwDatagrams
        oid: 1.3.6.1.2.1.55.1.6.1.11
        type: counter
        help: IPv6 datagrams forwarded
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsOutDiscards
        oid: 1.3.6.1.2.1.55.1.6.1.15
        type: counter
        help: IPv6 output packets discarded
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsOutFragOKs
        oid: 1.3.6.1.2.1.55.1.6.1.16
        type: counter
        help: IPv6 packets successfully fragmented
        indexes:
          - labelname: ifIndex
            type: Integer

      - name: ipv6IfStatsOutFragFails
        oid: 1.3.6.1.2.1.55.1.6.1.17
        type: counter
        help: IPv6 packets that couldn't be fragmented
        indexes:
          - labelname: ifIndex
            type: Integer
```

### Blackbox Exporter for IPv6 Probing

The Blackbox Exporter is essential for active IPv6 monitoring. Configure IPv6-specific probes:

```yaml
# blackbox.yml
modules:
  http_ipv6:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200, 201, 204, 301, 302]
      method: GET
      headers:
        Accept: "*/*"

  http_ipv6_post:
    prober: http
    timeout: 15s
    http:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
      method: POST
      headers:
        Content-Type: "application/json"
      body: '{}'

  icmp_ipv6:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false

  tcp_ipv6:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false

  dns_ipv6:
    prober: dns
    timeout: 5s
    dns:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
      query_name: "example.com"
      query_type: "AAAA"
      valid_rcodes:
        - NOERROR

  tcp_ipv6_tls:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
      tls: true
      tls_config:
        insecure_skip_verify: false
```

The critical setting is `ip_protocol_fallback: false`. This ensures the probe fails if IPv6 is unavailable rather than silently falling back to IPv4.

---

## Part 2: Prometheus Configuration

### Scrape Configuration

Configure Prometheus to collect IPv6 metrics:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Node Exporter - system metrics
  - job_name: 'node'
    static_configs:
      - targets:
        - '[2001:db8::1]:9100'
        - '[2001:db8::2]:9100'
        - '[2001:db8::3]:9100'
    relabel_configs:
      - source_labels: [__address__]
        regex: '\[([^\]]+)\]:.*'
        target_label: ipv6_address
        replacement: '${1}'

  # SNMP Exporter - network device metrics
  - job_name: 'snmp_ipv6'
    static_configs:
      - targets:
        - 'router1.example.com'
        - 'switch1.example.com'
    metrics_path: /snmp
    params:
      module: [ipv6_traffic]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: snmp-exporter:9116

  # Blackbox Exporter - IPv6 HTTP probes
  - job_name: 'blackbox_http_ipv6'
    metrics_path: /probe
    params:
      module: [http_ipv6]
    static_configs:
      - targets:
        - 'https://api.example.com/health'
        - 'https://www.example.com'
        - 'https://cdn.example.com'
        labels:
          probe_type: http
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  # Blackbox Exporter - IPv6 ICMP probes
  - job_name: 'blackbox_icmp_ipv6'
    metrics_path: /probe
    params:
      module: [icmp_ipv6]
    static_configs:
      - targets:
        - '2001:db8::1'
        - '2001:db8::2'
        - '2606:4700:4700::1111'  # Cloudflare DNS
        - '2001:4860:4860::8888'  # Google DNS
        labels:
          probe_type: icmp
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  # Blackbox Exporter - IPv6 DNS probes
  - job_name: 'blackbox_dns_ipv6'
    metrics_path: /probe
    params:
      module: [dns_ipv6]
    static_configs:
      - targets:
        - '2606:4700:4700::1111'
        - '2001:4860:4860::8888'
        labels:
          probe_type: dns
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Recording Rules for IPv6

Create recording rules to pre-compute expensive queries:

```yaml
# rules/ipv6_recording_rules.yml
groups:
  - name: ipv6_traffic_recording
    interval: 30s
    rules:
      # IPv6 receive packet rate per instance (packets/sec)
      # Note: Ip6_InReceives counts packets, not bytes. These values come
      # from /proc/net/snmp6. For byte counters, use Ip6_InOctets instead.
      - record: instance:node_network_ipv6_receive_packets:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Ip6_InReceives[5m])
          )

      # IPv6 transmit packet rate per instance (packets/sec)
      # Note: Ip6_OutRequests counts packets, not bytes.
      # For byte counters, use Ip6_OutOctets instead.
      - record: instance:node_network_ipv6_transmit_packets:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Ip6_OutRequests[5m])
          )

      # IPv6 error rate
      - record: instance:node_network_ipv6_errors:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Ip6_InHdrErrors[5m]) +
            rate(node_netstat_Ip6_InAddrErrors[5m]) +
            rate(node_netstat_Ip6_InUnknownProtos[5m]) +
            rate(node_netstat_Ip6_InTruncatedPkts[5m]) +
            rate(node_netstat_Ip6_OutNoRoutes[5m])
          )

      # IPv6 packet drop rate
      - record: instance:node_network_ipv6_drops:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Ip6_InDiscards[5m]) +
            rate(node_netstat_Ip6_OutDiscards[5m])
          )

      # TCP6 connection states
      - record: instance:node_tcp6_connections:current
        expr: node_sockstat_TCP6_inuse

      # UDP6 socket usage
      - record: instance:node_udp6_sockets:current
        expr: node_sockstat_UDP6_inuse

      # IPv6 fragmentation rate
      - record: instance:node_ipv6_fragmentation:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Ip6_FragOKs[5m]) +
            rate(node_netstat_Ip6_FragFails[5m])
          )

      # IPv6 probe success rate
      - record: job:probe_ipv6_success:ratio5m
        expr: |
          avg by (job) (
            avg_over_time(probe_success{job=~"blackbox.*ipv6.*"}[5m])
          )

      # IPv6 probe latency percentiles
      - record: job:probe_ipv6_duration_seconds:p50_5m
        expr: |
          histogram_quantile(0.50,
            sum by (job, le) (
              rate(probe_duration_seconds_bucket{job=~"blackbox.*ipv6.*"}[5m])
            )
          )

      - record: job:probe_ipv6_duration_seconds:p95_5m
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (
              rate(probe_duration_seconds_bucket{job=~"blackbox.*ipv6.*"}[5m])
            )
          )

      - record: job:probe_ipv6_duration_seconds:p99_5m
        expr: |
          histogram_quantile(0.99,
            sum by (job, le) (
              rate(probe_duration_seconds_bucket{job=~"blackbox.*ipv6.*"}[5m])
            )
          )

      # ICMPv6 message rates
      - record: instance:icmpv6_messages:rate5m
        expr: |
          sum by (instance) (
            rate(node_netstat_Icmp6_InMsgs[5m]) +
            rate(node_netstat_Icmp6_OutMsgs[5m])
          )

      # IPv6 vs IPv4 traffic ratio
      - record: instance:ipv6_traffic_ratio:current
        expr: |
          sum by (instance) (node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests)
          /
          (
            sum by (instance) (node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests) +
            sum by (instance) (node_netstat_Ip_InReceives + node_netstat_Ip_OutRequests)
          )
```

### Alerting Rules for IPv6

Create alerting rules to catch IPv6-specific issues:

```yaml
# rules/ipv6_alerting_rules.yml
groups:
  - name: ipv6_alerts
    rules:
      # IPv6 endpoint unreachable
      - alert: IPv6EndpointDown
        expr: probe_success{job=~"blackbox.*ipv6.*"} == 0
        for: 2m
        labels:
          severity: critical
          protocol: ipv6
        annotations:
          summary: "IPv6 endpoint {{ $labels.instance }} is unreachable"
          description: "The IPv6 probe to {{ $labels.instance }} has been failing for more than 2 minutes. This may indicate IPv6 connectivity issues or service downtime."
          runbook_url: "https://wiki.example.com/runbooks/ipv6-endpoint-down"

      # IPv6 probe high latency
      - alert: IPv6ProbeHighLatency
        expr: |
          probe_duration_seconds{job=~"blackbox.*ipv6.*"} > 2
        for: 5m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "IPv6 probe latency high for {{ $labels.instance }}"
          description: "IPv6 probe to {{ $labels.instance }} is taking {{ $value | humanizeDuration }} which exceeds the 2s threshold."

      # IPv6 packet loss detected
      - alert: IPv6PacketLoss
        expr: |
          instance:node_network_ipv6_drops:rate5m > 100
        for: 5m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "IPv6 packet drops detected on {{ $labels.instance }}"
          description: "Instance {{ $labels.instance }} is dropping {{ $value | humanize }} IPv6 packets per second."

      # IPv6 routing issues
      - alert: IPv6RoutingErrors
        expr: |
          rate(node_netstat_Ip6_OutNoRoutes[5m]) > 10
        for: 5m
        labels:
          severity: critical
          protocol: ipv6
        annotations:
          summary: "IPv6 routing errors on {{ $labels.instance }}"
          description: "Instance {{ $labels.instance }} has {{ $value | humanize }} IPv6 packets/s with no route to destination. Check IPv6 routing table and default gateway."

      # IPv6 header errors (potential attack or misconfiguration)
      - alert: IPv6HeaderErrors
        expr: |
          rate(node_netstat_Ip6_InHdrErrors[5m]) > 50
        for: 5m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "High IPv6 header error rate on {{ $labels.instance }}"
          description: "Instance {{ $labels.instance }} is receiving {{ $value | humanize }} malformed IPv6 packets per second. This could indicate misconfigured clients or potential attack traffic."

      # IPv6 fragmentation issues
      - alert: IPv6FragmentationFailures
        expr: |
          rate(node_netstat_Ip6_FragFails[5m]) > 10
        for: 5m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "IPv6 fragmentation failures on {{ $labels.instance }}"
          description: "Instance {{ $labels.instance }} is failing to fragment {{ $value | humanize }} IPv6 packets per second. Check MTU settings."

      # IPv6 traffic ratio drop (potential IPv6 connectivity issue)
      - alert: IPv6TrafficRatioDrop
        expr: |
          (
            instance:ipv6_traffic_ratio:current
            - instance:ipv6_traffic_ratio:current offset 1h
          ) < -0.1
        for: 15m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "IPv6 traffic ratio decreased on {{ $labels.instance }}"
          description: "IPv6 traffic ratio on {{ $labels.instance }} dropped by more than 10% compared to 1 hour ago. Current ratio: {{ $value | humanizePercentage }}."

      # TCP6 connection exhaustion
      - alert: TCP6ConnectionsHigh
        expr: |
          node_sockstat_TCP6_inuse > 50000
        for: 5m
        labels:
          severity: warning
          protocol: ipv6
        annotations:
          summary: "High TCP6 connection count on {{ $labels.instance }}"
          description: "Instance {{ $labels.instance }} has {{ $value | humanize }} TCP6 connections. Consider investigating for connection leaks."

      # DNS AAAA record probe failure
      - alert: IPv6DNSResolutionFailure
        expr: |
          probe_success{job="blackbox_dns_ipv6"} == 0
        for: 2m
        labels:
          severity: critical
          protocol: ipv6
        annotations:
          summary: "IPv6 DNS resolution failing via {{ $labels.instance }}"
          description: "AAAA record DNS queries via {{ $labels.instance }} are failing. IPv6-only clients may be unable to resolve hostnames."

      # IPv6 availability SLO breach
      - alert: IPv6AvailabilitySLOBreach
        expr: |
          (
            1 - (
              sum(rate(probe_success{job=~"blackbox.*ipv6.*"}[24h]))
              /
              count(probe_success{job=~"blackbox.*ipv6.*"})
            )
          ) > 0.001
        for: 1h
        labels:
          severity: critical
          protocol: ipv6
        annotations:
          summary: "IPv6 availability SLO breach"
          description: "IPv6 probe success rate over the past 24 hours is below 99.9% SLO. Current error rate: {{ $value | humanizePercentage }}."
```

---

## Part 3: Essential PromQL Queries for IPv6

### Traffic Analysis Queries

```promql
# Total IPv6 receive rate across all instances (packets/sec)
sum(rate(node_netstat_Ip6_InReceives[5m]))

# IPv6 receive throughput per instance (packets/sec)
rate(node_netstat_Ip6_InReceives[5m])

# IPv6 transmit throughput per instance (packets/sec)
rate(node_netstat_Ip6_OutRequests[5m])

# Total IPv6 bytes received per interface (requires additional metrics)
sum by (device) (
  rate(node_network_receive_bytes_total{device=~"eth.*|ens.*"}[5m])
)

# IPv6 traffic as percentage of total IP traffic
100 * sum(node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests)
/
(
  sum(node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests) +
  sum(node_netstat_Ip_InReceives + node_netstat_Ip_OutRequests)
)

# Top 5 instances by IPv6 traffic
topk(5,
  sum by (instance) (
    rate(node_netstat_Ip6_InReceives[5m]) +
    rate(node_netstat_Ip6_OutRequests[5m])
  )
)
```

### Error and Drop Analysis

```promql
# IPv6 packet error rate by type
sum by (instance) (
  label_replace(
    rate(node_netstat_Ip6_InHdrErrors[5m]),
    "error_type", "header_errors", "", ""
  )
) or
sum by (instance) (
  label_replace(
    rate(node_netstat_Ip6_InAddrErrors[5m]),
    "error_type", "address_errors", "", ""
  )
) or
sum by (instance) (
  label_replace(
    rate(node_netstat_Ip6_InUnknownProtos[5m]),
    "error_type", "unknown_protocol", "", ""
  )
)

# IPv6 packet drop ratio (drops / total received)
sum by (instance) (rate(node_netstat_Ip6_InDiscards[5m]))
/
sum by (instance) (rate(node_netstat_Ip6_InReceives[5m]))

# IPv6 routing failures rate
rate(node_netstat_Ip6_OutNoRoutes[5m])

# IPv6 reassembly failures (indicates fragmentation issues)
rate(node_netstat_Ip6_ReasmFails[5m])
```

### Connection and Socket Analysis

```promql
# Current TCP6 connections by instance
node_sockstat_TCP6_inuse

# TCP6 connection growth rate
deriv(node_sockstat_TCP6_inuse[15m])

# UDP6 socket usage
node_sockstat_UDP6_inuse

# IPv6 fragment queue usage (memory pressure indicator)
node_sockstat_FRAG6_inuse

# TCP6 connections as percentage of total TCP
100 * node_sockstat_TCP6_inuse
/
(node_sockstat_TCP6_inuse + node_sockstat_TCP_inuse)
```

### Probe and Reachability Analysis

```promql
# IPv6 probe success rate by target
avg_over_time(probe_success{job=~"blackbox.*ipv6.*"}[1h])

# IPv6 probe latency (median)
histogram_quantile(0.50,
  sum by (instance, le) (
    rate(probe_duration_seconds_bucket{job=~"blackbox.*ipv6.*"}[5m])
  )
)

# IPv6 probe latency (99th percentile)
histogram_quantile(0.99,
  sum by (instance, le) (
    rate(probe_duration_seconds_bucket{job=~"blackbox.*ipv6.*"}[5m])
  )
)

# Failed IPv6 probes in last hour
count(
  probe_success{job=~"blackbox.*ipv6.*"} == 0
)

# IPv6 TLS certificate expiry days
(probe_ssl_earliest_cert_expiry{job="blackbox_http_ipv6"} - time()) / 86400

# IPv6 HTTP response codes
probe_http_status_code{job="blackbox_http_ipv6"}

# IPv6 DNS lookup latency
probe_dns_lookup_time_seconds{job=~"blackbox.*ipv6.*"}
```

### ICMPv6 Analysis

```promql
# ICMPv6 message rate (in + out)
rate(node_netstat_Icmp6_InMsgs[5m]) + rate(node_netstat_Icmp6_OutMsgs[5m])

# ICMPv6 error messages received
rate(node_netstat_Icmp6_InErrors[5m])

# Neighbor Discovery messages (important for IPv6 local network)
rate(node_netstat_Icmp6_InNeighborSolicits[5m])
rate(node_netstat_Icmp6_InNeighborAdvertisements[5m])
rate(node_netstat_Icmp6_OutNeighborSolicits[5m])
rate(node_netstat_Icmp6_OutNeighborAdvertisements[5m])

# Router Advertisement/Solicitation (network configuration)
rate(node_netstat_Icmp6_InRouterSolicits[5m])
rate(node_netstat_Icmp6_InRouterAdvertisements[5m])
```

### Comparative IPv4 vs IPv6 Analysis

```promql
# Side-by-side IPv4 vs IPv6 receive rate
label_replace(
  rate(node_netstat_Ip_InReceives[5m]),
  "protocol", "ipv4", "", ""
) or
label_replace(
  rate(node_netstat_Ip6_InReceives[5m]),
  "protocol", "ipv6", "", ""
)

# IPv6 adoption trend (ratio over time)
avg_over_time(instance:ipv6_traffic_ratio:current[7d])

# IPv4 vs IPv6 error rate comparison
sum(rate(node_netstat_Ip6_InHdrErrors[5m]) + rate(node_netstat_Ip6_InAddrErrors[5m]))
/
sum(rate(node_netstat_Ip_InHdrErrors[5m]) + rate(node_netstat_Ip_InAddrErrors[5m]))
```

---

## Part 4: Building Grafana Dashboards

### Dashboard Structure

Organize your IPv6 monitoring dashboard into logical sections:

1. **Overview Row**: High-level health indicators
2. **Traffic Row**: Throughput and volume metrics
3. **Errors Row**: Error rates and types
4. **Probes Row**: Reachability and latency
5. **Connections Row**: Socket and connection state
6. **Comparison Row**: IPv4 vs IPv6 analysis

### Dashboard JSON Configuration

```json
{
  "title": "IPv6 Traffic Monitoring",
  "uid": "ipv6-traffic-monitoring",
  "tags": ["ipv6", "network", "traffic"],
  "timezone": "browser",
  "refresh": "30s",
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "templating": {
    "list": [
      {
        "name": "instance",
        "type": "query",
        "query": "label_values(node_netstat_Ip6_InReceives, instance)",
        "multi": true,
        "includeAll": true,
        "current": {
          "text": "All",
          "value": "$__all"
        }
      },
      {
        "name": "probe_target",
        "type": "query",
        "query": "label_values(probe_success{job=~\"blackbox.*ipv6.*\"}, instance)",
        "multi": true,
        "includeAll": true
      }
    ]
  }
}
```

### Panel Configurations

**IPv6 Health Score Panel (Stat)**

```json
{
  "title": "IPv6 Health Score",
  "type": "stat",
  "targets": [
    {
      "expr": "100 * avg(avg_over_time(probe_success{job=~\"blackbox.*ipv6.*\"}[5m]))",
      "legendFormat": "Health %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": null},
          {"color": "yellow", "value": 95},
          {"color": "green", "value": 99}
        ]
      }
    }
  }
}
```

**IPv6 Traffic Rate Panel (Time Series)**

```json
{
  "title": "IPv6 Traffic Rate",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum by (instance) (rate(node_netstat_Ip6_InReceives{instance=~\"$instance\"}[5m]))",
      "legendFormat": "{{ instance }} - Receive"
    },
    {
      "expr": "sum by (instance) (rate(node_netstat_Ip6_OutRequests{instance=~\"$instance\"}[5m]))",
      "legendFormat": "{{ instance }} - Transmit"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "pps",
      "custom": {
        "drawStyle": "line",
        "lineWidth": 2,
        "fillOpacity": 20
      }
    }
  }
}
```

**IPv6 Error Breakdown Panel (Pie Chart)**

```json
{
  "title": "IPv6 Error Types",
  "type": "piechart",
  "targets": [
    {
      "expr": "sum(increase(node_netstat_Ip6_InHdrErrors[1h]))",
      "legendFormat": "Header Errors"
    },
    {
      "expr": "sum(increase(node_netstat_Ip6_InAddrErrors[1h]))",
      "legendFormat": "Address Errors"
    },
    {
      "expr": "sum(increase(node_netstat_Ip6_InUnknownProtos[1h]))",
      "legendFormat": "Unknown Protocol"
    },
    {
      "expr": "sum(increase(node_netstat_Ip6_OutNoRoutes[1h]))",
      "legendFormat": "No Route"
    },
    {
      "expr": "sum(increase(node_netstat_Ip6_InDiscards[1h]))",
      "legendFormat": "Discards"
    }
  ]
}
```

**IPv6 Probe Latency Heatmap**

```json
{
  "title": "IPv6 Probe Latency Distribution",
  "type": "heatmap",
  "targets": [
    {
      "expr": "sum by (le) (rate(probe_duration_seconds_bucket{job=~\"blackbox.*ipv6.*\"}[5m]))",
      "format": "heatmap",
      "legendFormat": "{{ le }}"
    }
  ],
  "options": {
    "calculate": false,
    "yAxis": {
      "unit": "s"
    },
    "color": {
      "scheme": "Spectral"
    }
  }
}
```

**IPv6 vs IPv4 Comparison Panel (Bar Gauge)**

```json
{
  "title": "IPv6 Traffic Share",
  "type": "bargauge",
  "targets": [
    {
      "expr": "100 * sum(node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests) / (sum(node_netstat_Ip6_InReceives + node_netstat_Ip6_OutRequests) + sum(node_netstat_Ip_InReceives + node_netstat_Ip_OutRequests))",
      "legendFormat": "IPv6 %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "max": 100,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "blue", "value": null},
          {"color": "green", "value": 50}
        ]
      }
    }
  }
}
```

**Probe Status Table**

```json
{
  "title": "IPv6 Probe Status",
  "type": "table",
  "targets": [
    {
      "expr": "probe_success{job=~\"blackbox.*ipv6.*\"}",
      "format": "table",
      "instant": true
    },
    {
      "expr": "probe_duration_seconds{job=~\"blackbox.*ipv6.*\"}",
      "format": "table",
      "instant": true
    }
  ],
  "transformations": [
    {
      "id": "merge"
    },
    {
      "id": "organize",
      "options": {
        "renameByName": {
          "instance": "Target",
          "Value #A": "Status",
          "Value #B": "Latency"
        }
      }
    }
  ],
  "fieldConfig": {
    "overrides": [
      {
        "matcher": {"id": "byName", "options": "Status"},
        "properties": [
          {
            "id": "mappings",
            "value": [
              {"type": "value", "options": {"0": {"text": "DOWN", "color": "red"}}},
              {"type": "value", "options": {"1": {"text": "UP", "color": "green"}}}
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Part 5: Best Practices

### Deployment Best Practices

1. **Always test IPv6 connectivity separately**
   - Don't assume working IPv4 means working IPv6
   - Run dedicated IPv6 probes with `ip_protocol_fallback: false`
   - Alert on IPv6-specific failures independently

2. **Monitor both endpoints and paths**
   - Endpoint probes catch service issues
   - Path monitoring (traceroute-style) catches network issues
   - Use multiple vantage points to detect regional problems

3. **Label your metrics appropriately**
   - Include `protocol="ipv6"` labels where meaningful
   - Use consistent naming: `ipv6_*` prefix for custom metrics
   - Document label cardinality expectations

4. **Set appropriate scrape intervals**
   - System metrics: 15-30s
   - Network device SNMP: 30-60s
   - Blackbox probes: 30-60s depending on target sensitivity

### Query Optimization Best Practices

1. **Use recording rules for complex queries**
   - Pre-compute ratios and aggregations
   - Reduce dashboard load times
   - Enable faster alerting evaluation

2. **Avoid high-cardinality explosions**
   - Don't label by full IPv6 address in most cases
   - Aggregate by prefix (/48 or /64) when needed
   - Use relabeling to control cardinality

3. **Leverage histogram quantiles correctly**
   - Use `histogram_quantile()` for latency percentiles
   - Pre-aggregate with recording rules
   - Consider using `avg_over_time()` for smoother graphs

### Alerting Best Practices

1. **Layer your alerts by severity**
   - Critical: Complete IPv6 unreachability
   - Warning: Degraded performance or partial issues
   - Info: Anomaly detection and trend alerts

2. **Include context in annotations**
   - Current value with appropriate units
   - Comparison to baseline (offset queries)
   - Links to relevant runbooks

3. **Set appropriate thresholds**
   - Base thresholds on historical data
   - Account for legitimate traffic variations
   - Use multi-window alerting for stability

4. **Test alert routing**
   - Verify IPv6-specific alerts reach the right team
   - Include protocol information in alert labels
   - Test during IPv6-specific incidents

### Security Monitoring Considerations

1. **Watch for IPv6-specific attack patterns**
   - Extension header abuse (high `InHdrErrors`)
   - Address scanning (unusual traffic patterns)
   - Tunnel-based bypasses

2. **Monitor ICMPv6 carefully**
   - Neighbor Discovery is required for IPv6 operation
   - Excessive ND traffic may indicate issues
   - Router Advertisement spoofing is a real threat

3. **Track IPv6 firewall effectiveness**
   - Compare blocked packets IPv4 vs IPv6
   - Watch for policy gaps
   - Monitor for unexpected IPv6 sources

---

## Summary: IPv6 Monitoring Quick Reference

| Metric Category | Key Metrics | Primary Query | Alert Threshold |
|-----------------|-------------|---------------|-----------------|
| **Traffic Volume (packets)** | `node_netstat_Ip6_InReceives`, `node_netstat_Ip6_OutRequests` | `rate(node_netstat_Ip6_InReceives[5m])` | Baseline deviation > 50% |
| **Packet Errors** | `node_netstat_Ip6_InHdrErrors`, `node_netstat_Ip6_InAddrErrors` | `rate(node_netstat_Ip6_InHdrErrors[5m])` | > 50 errors/sec |
| **Packet Drops** | `node_netstat_Ip6_InDiscards`, `node_netstat_Ip6_OutDiscards` | `rate(node_netstat_Ip6_InDiscards[5m])` | > 100 drops/sec |
| **Routing Issues** | `node_netstat_Ip6_OutNoRoutes` | `rate(node_netstat_Ip6_OutNoRoutes[5m])` | > 10/sec |
| **Fragmentation** | `node_netstat_Ip6_FragFails` | `rate(node_netstat_Ip6_FragFails[5m])` | > 10/sec |
| **TCP6 Sockets** | `node_sockstat_TCP6_inuse` | `node_sockstat_TCP6_inuse` | > 50,000 |
| **UDP6 Sockets** | `node_sockstat_UDP6_inuse` | `node_sockstat_UDP6_inuse` | > 10,000 |
| **Probe Success** | `probe_success` | `probe_success{job=~"blackbox.*ipv6.*"}` | == 0 for > 2min |
| **Probe Latency** | `probe_duration_seconds` | `histogram_quantile(0.99, ...)` | > 2 seconds |
| **ICMPv6 Errors** | `node_netstat_Icmp6_InErrors` | `rate(node_netstat_Icmp6_InErrors[5m])` | > 100/sec |
| **IPv6 Ratio** | Calculated | `ipv6_packets / (ipv4_packets + ipv6_packets)` | Drop > 10% |

---

## Troubleshooting Common Issues

### Exporter Not Showing IPv6 Metrics

**Symptoms**: Missing `Ip6_*` or `TCP6_*` metrics in Node Exporter

**Causes and Solutions**:
- IPv6 disabled on host: Check `sysctl net.ipv6.conf.all.disable_ipv6`
- Collector disabled: Ensure `--collector.netstat` is enabled
- Kernel version: Some metrics require Linux 4.x+

### Blackbox Probes Always Failing for IPv6

**Symptoms**: `probe_success` always 0 for IPv6 targets

**Causes and Solutions**:
- No IPv6 connectivity from probe location
- DNS returning only A records: Check AAAA records exist
- Firewall blocking IPv6: Test with `curl -6`
- Target not listening on IPv6: Verify with `netstat -tlnp6`

### High Cardinality Issues

**Symptoms**: Prometheus memory usage spiking, slow queries

**Causes and Solutions**:
- Labeling by full IPv6 address: Aggregate by prefix instead
- Too many targets: Use target grouping and federation
- Recording rules missing: Pre-aggregate expensive queries

### SNMP Exporter Not Collecting IPv6 Statistics

**Symptoms**: Missing `ipv6IfStats*` metrics from network devices

**Causes and Solutions**:
- MIB not supported: Check device documentation
- SNMP community/user permissions: Verify read access
- Wrong OIDs: Use `snmpwalk` to verify available OIDs

---

## Integration with OneUptime

OneUptime provides native integration with Prometheus and can ingest IPv6 monitoring metrics directly.

**Benefits of using OneUptime for IPv6 monitoring**:

1. **Unified visibility**: See IPv6 metrics alongside your other infrastructure metrics
2. **Smart alerting**: Correlate IPv6 issues with application-level incidents
3. **Status pages**: Show IPv6 connectivity status on public status pages
4. **Incident management**: Track and resolve IPv6-related incidents systematically
5. **SLO tracking**: Define and monitor IPv6-specific service level objectives

**Quick integration**:

```yaml
# Add to Prometheus remote_write config
remote_write:
  - url: "https://oneuptime.com/api/telemetry/ingest/prometheus"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_API_KEY"
    write_relabel_configs:
      - source_labels: [__name__]
        regex: '(node_netstat_Ip6.*|node_sockstat_TCP6.*|probe_.*)'
        action: keep
```

---

## Conclusion

IPv6 monitoring is no longer optional. As IPv6 traffic continues to grow and IPv6-only networks become more common, blind spots in your IPv6 visibility translate directly to blind spots in user experience.

The combination of Prometheus and Grafana provides a powerful, flexible foundation for IPv6 traffic monitoring. With the exporters, queries, dashboards, and alerts outlined in this guide, you can:

- Detect IPv6 connectivity issues before users report them
- Understand IPv6 traffic patterns and trends
- Compare IPv6 and IPv4 performance side by side
- Alert on IPv6-specific failure modes
- Track IPv6 adoption across your infrastructure

Start with the basics: deploy Node Exporter with network collectors enabled, configure Blackbox probes for your critical IPv6 endpoints, and set up the essential alerts. Then iterate, adding more sophisticated dashboards and alerting rules as you learn what matters most for your specific infrastructure.

Your users on IPv6-only networks will thank you.

---

**Related Reading**:

- [The Three Pillars of Observability: Logs, Metrics & Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
- [Monitoring vs Observability: An SRE Perspective](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
- [Why Software Engineers Don't Understand Networking](https://oneuptime.com/blog/post/2025-12-12-why-software-engineers-dont-understand-networking/view)

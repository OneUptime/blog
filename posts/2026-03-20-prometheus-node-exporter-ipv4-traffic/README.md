# How to Monitor IPv4 Network Traffic with Prometheus and Node Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, IPv4, Network Monitoring, Bandwidth, Metric, Grafana

Description: Learn how to use Prometheus and Node Exporter to monitor IPv4 network traffic, bandwidth usage, and packet statistics across server interfaces.

---

Node Exporter exposes detailed network interface statistics that Prometheus can scrape and Grafana can visualize. This provides real-time network traffic monitoring including bytes sent/received, packet rates, and error counts.

## Installing Node Exporter

```bash
# Download and install Node Exporter

NODE_EXPORTER_VERSION="1.11.1"
wget "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
tar xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
mv "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/

# Create systemd service - bind exporter to an IPv4 address
cat > /etc/systemd/system/node-exporter.service << 'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
# Bind to the server's IPv4 address on port 9100
ExecStart=/usr/local/bin/node_exporter \
  --web.listen-address="10.0.0.10:9100" \
  --collector.netstat \
  --collector.netdev
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now node-exporter
```

## Key Network Metrics

```promql
# Bytes received per second (per interface)
rate(node_network_receive_bytes_total{device="eth0"}[5m])

# Bytes transmitted per second (per interface)
rate(node_network_transmit_bytes_total{device="eth0"}[5m])

# Total bandwidth (receive + transmit) in Mbps
(rate(node_network_receive_bytes_total{device="eth0"}[5m]) +
 rate(node_network_transmit_bytes_total{device="eth0"}[5m])) * 8 / 1000000

# Packet receive rate
rate(node_network_receive_packets_total{device="eth0"}[5m])

# Packet errors
rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m])

# Dropped packets
rate(node_network_receive_drop_total[5m]) + rate(node_network_transmit_drop_total[5m])
```

## Top Bandwidth-Consuming Interfaces

```promql
# Top 5 interfaces by receive bandwidth
topk(5,
  rate(node_network_receive_bytes_total[5m]) * 8
)
```

## TCP Metrics

Node Exporter's `netstat` collector tracks TCP and IP stack statistics.

```promql
# Current TCP connections in ESTABLISHED or CLOSE-WAIT
node_netstat_Tcp_CurrEstab
node_netstat_Tcp_InSegs                        # Incoming segments
node_netstat_Tcp_RetransSegs                   # Retransmissions (high = network issue)

# TCP retransmission rate
rate(node_netstat_Tcp_RetransSegs[5m])
```

## Prometheus Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - '10.0.0.10:9100'
          - '10.0.0.11:9100'
          - '10.0.0.12:9100'
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+):\d+'
        target_label: host_ip
        replacement: '$1'
```

## Grafana Panel Examples

```promql
# Panel: Network In (Mbps) - useful for identifying bandwidth hogs
rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8 / 1000000

# Panel: Network Out (Mbps)
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) * 8 / 1000000

# Panel: Error Rate
rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m])
```

## Key Takeaways

- `node_network_receive_bytes_total` and `node_network_transmit_bytes_total` are the primary network interface metrics; use `rate()` to get bytes per second.
- Multiply by 8 to convert bytes/sec to bits/sec (for standard networking units in Mbps).
- Use `device!="lo"` to exclude the loopback interface from bandwidth calculations.
- Monitor `node_network_receive_errs_total` and `node_network_receive_drop_total` for network interface health issues.

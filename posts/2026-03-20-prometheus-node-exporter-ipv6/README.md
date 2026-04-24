# How to Configure Prometheus Node Exporter IPv6 Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, IPv6, Metric, Linux, Monitoring

Description: A guide to collecting IPv6 network metrics from Linux hosts using Prometheus Node Exporter, including configuration and useful PromQL queries.

Prometheus Node Exporter collects Linux system metrics including network interface statistics. The `node_network_*` metrics show per-interface totals and are not separated by IP version, while IPv6 stack counters are exposed through the `node_netstat_*` metrics family.

## Step 1: Start Node Exporter on IPv6

```bash
# Start Node Exporter listening on IPv6

node_exporter \
  --web.listen-address="[::]:9100" \
  --collector.netstat \
  --collector.netdev \
  --collector.netstat.fields='^(Ip6_.*|Icmp6_.*|TcpExt_TCPSynRetrans)$'
```

Systemd unit with IPv6 listening:

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
ExecStart=/usr/local/bin/node_exporter \
  --web.listen-address=[::]:9100 \
  --collector.netstat \
  --collector.netdev \
  --collector.netstat.fields=^(Ip6_.*|Icmp6_.*|TcpExt_TCPSynRetrans)$ \
  --collector.network_route
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Step 2: Key IPv6 Metrics Available

With the `--collector.netstat.fields` pattern above, Node Exporter exposes the following relevant metrics:

```promql
# Network interface transmit/receive bytes (per-interface totals, not split by IPv4 vs IPv6)
node_network_receive_bytes_total
node_network_transmit_bytes_total

# Network interface errors (per-interface totals, not split by IPv4 vs IPv6)
node_network_receive_errs_total
node_network_transmit_errs_total

# IPv6 statistics from /proc/net/snmp6
node_netstat_Ip6_InOctets
node_netstat_Ip6_OutOctets
node_netstat_Ip6_InReceives
node_netstat_Ip6_OutRequests
node_netstat_Ip6_InDelivers
node_netstat_Ip6_OutNoRoutes

# ICMPv6 statistics
node_netstat_Icmp6_InMsgs
node_netstat_Icmp6_OutMsgs
node_netstat_Icmp6_InErrors

# TCP retransmission statistics
node_netstat_TcpExt_TCPSynRetrans
```

## Step 3: Expose the IPv6 netstat Fields

The `netstat` collector is enabled by default and reads `/proc/net/netstat`, `/proc/net/snmp`, and `/proc/net/snmp6`. The `--collector.netstat.fields` pattern above ensures the IPv6 counters used in this guide are exported:

```bash
# Verify the IPv6 netstat metrics are present
curl -s http://[::1]:9100/metrics | grep "node_netstat_Ip6"
```

## Step 4: Useful IPv6 PromQL Queries

```promql
# IPv6 receive rate (bytes per second for the host)
rate(node_netstat_Ip6_InOctets[5m])

# IPv6 packet input rate (from /proc/net/snmp6)
rate(node_netstat_Ip6_InReceives[5m])

# IPv6 packet output rate
rate(node_netstat_Ip6_OutRequests[5m])

# IPv6 no-route errors (indicates routing issues)
rate(node_netstat_Ip6_OutNoRoutes[5m]) > 0

# ICMPv6 message rate
rate(node_netstat_Icmp6_InMsgs[5m])
rate(node_netstat_Icmp6_OutMsgs[5m])

# IPv6 fragmentation statistics
rate(node_netstat_Ip6_ReasmOKs[5m])    # Successful reassemblies
rate(node_netstat_Ip6_FragOKs[5m])     # Successful fragmentations
```

## Step 5: Grafana Dashboard Query for IPv6 Traffic

```promql
# Host-wide IPv6 inbound traffic rate
rate(node_netstat_Ip6_InOctets{instance="[2001:db8::10]:9100"}[5m])

# Host-wide IPv6 outbound traffic rate
rate(node_netstat_Ip6_OutOctets{instance="[2001:db8::10]:9100"}[5m])
```

## Step 6: Alert on IPv6 Routing Failures

```yaml
# alerts-ipv6-nodes.yml - Alert on IPv6 routing issues
groups:
  - name: ipv6-node-health
    rules:
      - alert: IPv6NoRouteErrors
        expr: rate(node_netstat_Ip6_OutNoRoutes[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 routing failures on {{ $labels.instance }}"
          description: "{{ $labels.instance }} is experiencing {{ $value }} IPv6 no-route errors per second"

      - alert: IPv6ICMPv6Errors
        expr: rate(node_netstat_Icmp6_InErrors[5m]) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ICMPv6 errors on {{ $labels.instance }}"
```

Node Exporter's `/proc/net/snmp6` integration provides deep IPv6 stack telemetry with minimal additional configuration, making it a primary data source for IPv6 network health monitoring on Linux hosts.

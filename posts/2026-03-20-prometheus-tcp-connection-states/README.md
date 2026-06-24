# How to Monitor TCP Connection States on IPv4 with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, TCP, Connection States, Node Exporter, PromQL

Description: Monitor TCP connection states (ESTABLISHED, TIME_WAIT, CLOSE_WAIT, etc.) on IPv4 interfaces using Prometheus Node Exporter netstat collector and PromQL queries.

## Introduction

TCP connection state monitoring reveals socket exhaustion, server overload, and abnormal connection behavior. Node Exporter's `netstat` collector exposes TCP counters such as `Tcp_CurrEstab`, opens, resets, retransmissions, and listen drops. High `TIME_WAIT`, `CLOSE_WAIT`, or `SYN_RECV` counts require a state-aware metric source such as an `ss`-based textfile collector.

## Node Exporter Configuration

```bash
# netstat is enabled by default; set a textfile directory if you plan to
# export `ss`-based state counts

node_exporter \
  --web.listen-address=10.0.0.5:9100 \
  --collector.textfile.directory=/var/lib/node_exporter/textfile_collector

# If you need additional TCP counters such as AttemptFails, EstabResets,
# or TCPTimeWaitOverflow, widen the netstat field filter
node_exporter \
  --web.listen-address=10.0.0.5:9100 \
  --collector.textfile.directory=/var/lib/node_exporter/textfile_collector \
  --collector.netstat \
  --collector.netstat.fields='^(.*_(InErrors|Resets|Retrans|Listen|Discards|Requests|Drop|Overflows)|TcpExt_(Listen.*|Syncookies.*|TCPOFOQueue|TCPTimeWaitOverflow|.*Fail.*)|Tcp_(ActiveOpens|PassiveOpens|RetransSegs|CurrEstab|InSegs|OutSegs|AttemptFails|EstabResets))$'
```

## Key TCP Metrics from Node Exporter

| Metric | Description |
|---|---|
| `node_netstat_Tcp_CurrEstab` | Current connections in `ESTABLISHED` or `CLOSE_WAIT` |
| `node_netstat_Tcp_ActiveOpens` | Active connections opened (cumulative) |
| `node_netstat_Tcp_PassiveOpens` | Passive connections opened (cumulative) |
| `node_netstat_Tcp_AttemptFails` | Failed connection attempts (cumulative) |
| `node_netstat_Tcp_EstabResets` | Connections reset from `ESTABLISHED` or `CLOSE_WAIT` (cumulative) |
| `node_netstat_Tcp_RetransSegs` | Retransmitted segments (cumulative) |
| `node_netstat_TcpExt_TCPTimeWaitOverflow` | `TIME_WAIT` overflow events (cumulative, not a current socket count) |
| `node_netstat_TcpExt_ListenDrops` | Listen queue drops |

## PromQL Queries

```promql
# Current connections in ESTABLISHED or CLOSE_WAIT
node_netstat_Tcp_CurrEstab

# By instance (total connections per server)
node_netstat_Tcp_CurrEstab{instance="10.0.0.1:9100"}

# Rate of new connections per second
rate(node_netstat_Tcp_PassiveOpens[5m])

# Rate of connection failures
rate(node_netstat_Tcp_AttemptFails[5m])

# TCP retransmission rate (sign of network issues)
rate(node_netstat_Tcp_RetransSegs[5m])

# Connection resets per second
rate(node_netstat_Tcp_EstabResets[5m])

# TIME_WAIT overflow events (not a current TIME_WAIT socket count)
# Requires the expanded netstat field filter shown above
rate(node_netstat_TcpExt_TCPTimeWaitOverflow[5m]) > 0
```

## Getting Detailed State Counts with ss

```bash
# Node Exporter's netstat collector doesn't break down all TCP states
# For IPv4 state-specific counts, use a custom exporter or textfile collector:

# /usr/local/bin/tcp_states.sh
#!/bin/bash
echo "# HELP tcp_connection_states TCP connection state counts"
echo "# TYPE tcp_connection_states gauge"
ss -4tanH state established | wc -l | \
  awk '{print "tcp_connection_states{state=\"ESTABLISHED\"} " $1}'
ss -4tanH state time-wait | wc -l | \
  awk '{print "tcp_connection_states{state=\"TIME_WAIT\"} " $1}'
ss -4tanH state close-wait | wc -l | \
  awk '{print "tcp_connection_states{state=\"CLOSE_WAIT\"} " $1}'

# Run via cron and write to the textfile directory configured in node_exporter:
# */1 * * * * /usr/local/bin/tcp_states.sh > /var/lib/node_exporter/textfile_collector/tcp_states.prom
```

## Alerting Rules

```yaml
# /etc/prometheus/rules/tcp_alerts.yml

groups:
  - name: tcp_connection_alerts
    rules:
      - alert: HighTCPRetransmissions
        expr: rate(node_netstat_Tcp_RetransSegs[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High TCP retransmissions on {{ $labels.instance }}"

      - alert: HighConnectionResets
        expr: rate(node_netstat_Tcp_EstabResets[5m]) > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High TCP connection resets on {{ $labels.instance }}"

      - alert: TCPListenDrops
        expr: rate(node_netstat_TcpExt_ListenDrops[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "TCP listen queue dropping connections on {{ $labels.instance }}"
```

## Conclusion

Monitor TCP connection health using `node_netstat_Tcp_*` metrics from Node Exporter. Key indicators are retransmission rate (network quality), establishment resets (abrupt connection termination), and listen drops (server overload). For detailed per-state counts (ESTABLISHED, TIME_WAIT, CLOSE_WAIT), use a textfile collector that runs `ss -4` on each host and exports state counts as Prometheus metrics.

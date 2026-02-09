# How to Monitor F5 BIG-IP Load Balancer Pool Health and Throughput with the Collector SNMP Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, F5 BIG-IP, SNMP, Monitoring

Description: Monitor F5 BIG-IP load balancer pool health, member status, and throughput metrics using the OpenTelemetry Collector SNMP receiver.

F5 BIG-IP load balancers expose detailed health and performance metrics via SNMP. The OpenTelemetry Collector's SNMP receiver can poll these metrics and export them to your observability backend. This gives you visibility into pool member health, connection counts, throughput, and more.

## Enabling SNMP on BIG-IP

First, configure SNMP access on the BIG-IP device:

```bash
# Using tmsh
tmsh modify sys snmp allowed-addresses add { 10.0.0.0/24 }
tmsh modify sys snmp communities add { otel_community { community-name "otel_read" access ro } }
tmsh save sys config
```

Verify SNMP is working:

```bash
snmpwalk -v2c -c otel_read 10.0.0.1 1.3.6.1.4.1.3375
```

## Key BIG-IP SNMP OIDs

F5 BIG-IP uses enterprise OID `1.3.6.1.4.1.3375`. Here are the important metrics:

```
# Virtual Server metrics
1.3.6.1.4.1.3375.2.2.10.1.2.1.1   - VS name
1.3.6.1.4.1.3375.2.2.10.1.2.1.9   - VS current connections
1.3.6.1.4.1.3375.2.2.10.1.2.1.7   - VS total connections
1.3.6.1.4.1.3375.2.2.10.1.2.1.12  - VS bytes in
1.3.6.1.4.1.3375.2.2.10.1.2.1.13  - VS bytes out

# Pool metrics
1.3.6.1.4.1.3375.2.2.5.1.2.1.1    - Pool name
1.3.6.1.4.1.3375.2.2.5.1.2.1.8    - Pool current connections
1.3.6.1.4.1.3375.2.2.5.1.2.1.15   - Pool status availability

# Pool Member metrics
1.3.6.1.4.1.3375.2.2.5.3.2.1.1    - Member name
1.3.6.1.4.1.3375.2.2.5.3.2.1.5    - Member current connections
1.3.6.1.4.1.3375.2.2.5.3.2.1.10   - Member status
1.3.6.1.4.1.3375.2.2.5.3.2.1.12   - Member bytes in
1.3.6.1.4.1.3375.2.2.5.3.2.1.13   - Member bytes out

# System metrics
1.3.6.1.4.1.3375.2.1.1.2.1.44.0   - System CPU usage
1.3.6.1.4.1.3375.2.1.1.2.1.45.0   - System memory used
```

## Collector SNMP Receiver Configuration

```yaml
# otel-collector-config.yaml
receivers:
  snmp:
    collection_interval: 30s
    endpoint: udp://10.0.0.1:161
    version: v2c
    community: otel_read

    # Define metrics to collect
    metrics:
      # Virtual server current connections
      bigip.vs.current_connections:
        unit: connections
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.9"
            attributes:
              - name: vs_name
                oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.1"

      # Virtual server bytes in
      bigip.vs.bytes_in:
        unit: By
        sum:
          value_type: int
          monotonic: true
          aggregation: cumulative
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.12"
            attributes:
              - name: vs_name
                oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.1"

      # Virtual server bytes out
      bigip.vs.bytes_out:
        unit: By
        sum:
          value_type: int
          monotonic: true
          aggregation: cumulative
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.13"
            attributes:
              - name: vs_name
                oid: "1.3.6.1.4.1.3375.2.2.10.1.2.1.1"

      # Pool current connections
      bigip.pool.current_connections:
        unit: connections
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.5.1.2.1.8"
            attributes:
              - name: pool_name
                oid: "1.3.6.1.4.1.3375.2.2.5.1.2.1.1"

      # Pool member status
      bigip.pool_member.status:
        unit: "1"
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.5.3.2.1.10"
            attributes:
              - name: member_name
                oid: "1.3.6.1.4.1.3375.2.2.5.3.2.1.1"

      # System CPU usage
      bigip.system.cpu_usage:
        unit: "%"
        gauge:
          value_type: int
        scalar_oids:
          - oid: "1.3.6.1.4.1.3375.2.1.1.2.1.44.0"

      # System memory used
      bigip.system.memory_used:
        unit: By
        gauge:
          value_type: int
        scalar_oids:
          - oid: "1.3.6.1.4.1.3375.2.1.1.2.1.45.0"

processors:
  batch:
    timeout: 10s

  resource:
    attributes:
      - key: service.name
        value: f5-bigip
        action: upsert
      - key: device.type
        value: load-balancer
        action: upsert
      - key: device.address
        value: "10.0.0.1"
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [snmp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Pool Member Health Alerting

Set up alerts based on pool member status. The status OID returns:

- `0` = none (error)
- `1` = green (available)
- `2` = yellow (degraded)
- `3` = red (unavailable)
- `4` = blue (unknown)

```yaml
# Example alert condition (pseudo-code)
# Alert when any pool member is not green (1)
condition: bigip.pool_member.status != 1
severity: critical
message: "Pool member ${member_name} is unhealthy (status: ${status})"
```

## Monitoring Multiple BIG-IP Devices

For multiple devices, use multiple SNMP receiver instances:

```yaml
receivers:
  snmp/bigip-primary:
    collection_interval: 30s
    endpoint: udp://10.0.0.1:161
    version: v2c
    community: otel_read
    metrics:
      # ... same metric definitions ...

  snmp/bigip-secondary:
    collection_interval: 30s
    endpoint: udp://10.0.0.2:161
    version: v2c
    community: otel_read
    metrics:
      # ... same metric definitions ...

service:
  pipelines:
    metrics:
      receivers: [snmp/bigip-primary, snmp/bigip-secondary]
      processors: [resource, batch]
      exporters: [otlp]
```

## Summary

The SNMP receiver in the OpenTelemetry Collector can poll F5 BIG-IP for virtual server, pool, pool member, and system metrics. Configure the OIDs for the metrics you need, set appropriate collection intervals, and export to your backend. This gives you real-time visibility into load balancer health, throughput, and pool member availability without installing agents on the BIG-IP device itself.

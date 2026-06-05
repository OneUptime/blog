# How to Monitor F5 BIG-IP Load Balancer Pool Health and Throughput

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

```text
# Virtual Server metrics
1.3.6.1.4.1.3375.2.2.10.2.3.1.1   - VS name
1.3.6.1.4.1.3375.2.2.10.2.3.1.12  - VS current connections
1.3.6.1.4.1.3375.2.2.10.2.3.1.11  - VS total connections
1.3.6.1.4.1.3375.2.2.10.2.3.1.7   - VS bytes in
1.3.6.1.4.1.3375.2.2.10.2.3.1.9   - VS bytes out

# Pool metrics
1.3.6.1.4.1.3375.2.2.5.2.3.1.1    - Pool name
1.3.6.1.4.1.3375.2.2.5.2.3.1.8    - Pool current connections
1.3.6.1.4.1.3375.2.2.5.5.2.1.2    - Pool status availability

# Pool Member metrics
1.3.6.1.4.1.3375.2.2.5.4.3.1.28   - Member node name
1.3.6.1.4.1.3375.2.2.5.4.3.1.11   - Member current connections
1.3.6.1.4.1.3375.2.2.5.6.2.1.5    - Member status availability
1.3.6.1.4.1.3375.2.2.5.4.3.1.6    - Member bytes in
1.3.6.1.4.1.3375.2.2.5.4.3.1.8    - Member bytes out

# System metrics
1.3.6.1.4.1.3375.2.1.1.2.1.44.0   - System memory total
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

    # Define attributes used by table metrics
    attributes:
      vs_name:
        oid: "1.3.6.1.4.1.3375.2.2.10.2.3.1.1"
      pool_name:
        oid: "1.3.6.1.4.1.3375.2.2.5.2.3.1.1"
      pool_member_status_pool:
        oid: "1.3.6.1.4.1.3375.2.2.5.6.2.1.1"
      pool_member_status_name:
        oid: "1.3.6.1.4.1.3375.2.2.5.6.2.1.9"
      pool_member_status_port:
        oid: "1.3.6.1.4.1.3375.2.2.5.6.2.1.4"

    # Define metrics to collect
    metrics:
      # Virtual server current connections
      bigip.vs.current_connections:
        unit: connections
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.2.3.1.12"
            attributes:
              - name: vs_name

      # Virtual server bytes in
      bigip.vs.bytes_in:
        unit: By
        sum:
          value_type: int
          monotonic: true
          aggregation: cumulative
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.2.3.1.7"
            attributes:
              - name: vs_name

      # Virtual server bytes out
      bigip.vs.bytes_out:
        unit: By
        sum:
          value_type: int
          monotonic: true
          aggregation: cumulative
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.10.2.3.1.9"
            attributes:
              - name: vs_name

      # Pool current connections
      bigip.pool.current_connections:
        unit: connections
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.5.2.3.1.8"
            attributes:
              - name: pool_name

      # Pool member status
      bigip.pool_member.status:
        unit: "1"
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.4.1.3375.2.2.5.6.2.1.5"
            attributes:
              - name: pool_member_status_pool
              - name: pool_member_status_name
              - name: pool_member_status_port

      # System memory total
      bigip.system.memory_total:
        unit: By
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
- `5` = gray (unlicensed)

```yaml
# Example alert condition (pseudo-code)
# Alert when any pool member is not green (1)
condition: bigip.pool_member.status != 1
severity: critical
message: "Pool member ${pool_member_status_name}:${pool_member_status_port} in pool ${pool_member_status_pool} is unhealthy (status: ${status})"
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
    attributes:
      # ... same attribute definitions ...
    metrics:
      # ... same metric definitions ...

  snmp/bigip-secondary:
    collection_interval: 30s
    endpoint: udp://10.0.0.2:161
    version: v2c
    community: otel_read
    attributes:
      # ... same attribute definitions ...
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

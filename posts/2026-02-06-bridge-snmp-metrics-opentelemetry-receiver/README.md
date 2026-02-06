# How to Bridge SNMP Network Equipment Metrics into OpenTelemetry Using the SNMP Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SNMP, Network Monitoring, Collector, Telecommunications

Description: Bridge legacy SNMP network equipment metrics into OpenTelemetry using the SNMP receiver for unified observability.

Most telecom networks run a mix of modern cloud-native systems and legacy equipment that only speaks SNMP. Routers, switches, RAN controllers, and transport nodes have been managed through SNMP for decades. Rather than maintaining two separate monitoring systems, you can use the OpenTelemetry Collector's SNMP receiver to pull metrics from these devices and feed them into the same observability pipeline as your cloud-native workloads.

## The SNMP Receiver in the OpenTelemetry Collector

The SNMP receiver is a contrib component that polls SNMP agents on your network devices. It supports SNMPv2c and SNMPv3, can walk OID trees, and maps the results to OpenTelemetry metrics with proper attributes.

## Basic Configuration

Here is a collector configuration that polls a set of network switches and routers for interface metrics and system health.

```yaml
# otel-collector-snmp.yaml
receivers:
  snmp:
    # Poll every 30 seconds
    collection_interval: 30s

    # Define the SNMP connection parameters
    endpoint: udp://192.168.1.1:161
    version: v2c
    community: public

    # Define which OIDs to collect as metrics
    resource_attributes:
      # Identify the device by its sysName
      resource.name:
        oid: "1.3.6.1.2.1.1.5.0"  # sysName

    attributes:
      # Interface index for per-interface metrics
      if_index:
        oid: "1.3.6.1.2.1.2.2.1.1"
        indexed_value_prefix: ""
      # Interface description (human-readable name)
      if_descr:
        oid: "1.3.6.1.2.1.2.2.1.2"
        indexed_value_prefix: ""

    metrics:
      # Interface inbound octets (bytes received)
      network.interface.bytes_received:
        unit: "By"
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.2.1.2.2.1.10"  # ifInOctets
            attributes:
              - name: if_index
              - name: if_descr

      # Interface outbound octets (bytes sent)
      network.interface.bytes_sent:
        unit: "By"
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.2.1.2.2.1.16"  # ifOutOctets
            attributes:
              - name: if_index
              - name: if_descr

      # Interface operational status
      network.interface.oper_status:
        unit: "{status}"
        gauge:
          value_type: int
        column_oids:
          - oid: "1.3.6.1.2.1.2.2.1.8"  # ifOperStatus
            attributes:
              - name: if_index
              - name: if_descr

      # Interface error counts (inbound)
      network.interface.errors_in:
        unit: "{error}"
        sum:
          value_type: int
          aggregation: cumulative
          monotonic: true
        column_oids:
          - oid: "1.3.6.1.2.1.2.2.1.14"  # ifInErrors
            attributes:
              - name: if_index
              - name: if_descr

      # CPU utilization (Cisco-specific OID)
      system.cpu.utilization:
        unit: "%"
        gauge:
          value_type: int
        scalar_oids:
          - oid: "1.3.6.1.4.1.9.9.109.1.1.1.1.6.1"  # cpmCPUTotal5minRev

      # Memory utilization (Cisco-specific OID)
      system.memory.used:
        unit: "By"
        gauge:
          value_type: int
        scalar_oids:
          - oid: "1.3.6.1.4.1.9.9.48.1.1.1.5.1"  # ciscoMemoryPoolUsed

processors:
  batch:
    timeout: 10s

  # Enrich with location and role metadata
  resource:
    attributes:
      - key: device.type
        value: "router"
        action: upsert
      - key: device.location
        value: "dc-east-rack-12"
        action: upsert
      - key: network.region
        value: "us-east"
        action: upsert

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [snmp]
      processors: [batch, resource]
      exporters: [otlp]
```

## Monitoring Multiple Devices

In a real network, you have hundreds or thousands of devices. Rather than configuring each one individually, use the SNMP receiver's discovery capabilities or define multiple receiver instances.

```yaml
# Multiple SNMP targets using separate receiver instances
receivers:
  snmp/core-router-01:
    collection_interval: 30s
    endpoint: udp://10.0.1.1:161
    version: v3
    security_level: auth_priv
    user: otel_monitor
    auth_type: SHA
    auth_password: ${env:SNMP_AUTH_PASS}
    privacy_type: AES
    privacy_password: ${env:SNMP_PRIV_PASS}
    metrics:
      # ... same metric definitions as above

  snmp/core-router-02:
    collection_interval: 30s
    endpoint: udp://10.0.1.2:161
    version: v3
    security_level: auth_priv
    user: otel_monitor
    auth_type: SHA
    auth_password: ${env:SNMP_AUTH_PASS}
    privacy_type: AES
    privacy_password: ${env:SNMP_PRIV_PASS}
    metrics:
      # ... same metric definitions

service:
  pipelines:
    metrics:
      receivers: [snmp/core-router-01, snmp/core-router-02]
      processors: [batch, resource]
      exporters: [otlp]
```

## Handling SNMP Traps

SNMP traps are asynchronous notifications that devices send when something goes wrong (link down, high temperature, fan failure). You can convert these into OpenTelemetry log events.

```python
# snmp_trap_to_otel.py
from pysnmp.hlapi import *
from pysnmp.carrier.asyncio.dgram import udp
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LogRecord
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
import logging

# Set up OTel logging
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint="oneuptime-collector:4317"))
)
set_logger_provider(logger_provider)

otel_logger = logging.getLogger("snmp.traps")

# Map well-known trap OIDs to human-readable names
TRAP_MAP = {
    "1.3.6.1.6.3.1.1.5.3": "link_down",
    "1.3.6.1.6.3.1.1.5.4": "link_up",
    "1.3.6.1.6.3.1.1.5.1": "cold_start",
    "1.3.6.1.6.3.1.1.5.2": "warm_start",
}


def handle_trap(transport_address, whole_msg):
    """Process an incoming SNMP trap and emit an OTel log record."""
    source_ip = str(transport_address[0])
    trap_oid = extract_trap_oid(whole_msg)
    trap_name = TRAP_MAP.get(trap_oid, "unknown")

    # Emit as an OpenTelemetry log record
    otel_logger.warning(
        "SNMP trap received",
        extra={
            "snmp.trap.oid": trap_oid,
            "snmp.trap.name": trap_name,
            "snmp.source.ip": source_ip,
            "snmp.varbinds": extract_varbinds(whole_msg),
        }
    )
```

## Why This Matters for Telecom

Telecom networks have equipment from multiple vendors and multiple generations. SNMP is the common language they all speak. By bridging SNMP into OpenTelemetry, you get a single pane of glass that covers everything from your legacy DSLAM to your new 5G gNodeB. You can correlate interface errors on a transport switch with increased latency in your VoIP traces or packet loss in your 5G UPF metrics. That cross-layer correlation is what makes OpenTelemetry so powerful for telecom operators.

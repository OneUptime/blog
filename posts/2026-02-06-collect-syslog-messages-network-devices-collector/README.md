# How to Collect Syslog Messages from Network Devices with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Syslog, Network Devices, Logging, Observability, Infrastructure, Monitoring

Description: Learn how to collect syslog messages from routers, switches, and firewalls using the OpenTelemetry Collector syslog receiver for network observability.

---

Network devices are the foundation of every infrastructure, but they are often the last components to get proper observability. Routers, switches, firewalls, and load balancers generate syslog messages that contain critical information about link failures, configuration changes, security events, and hardware problems. These messages traditionally get sent to a dedicated syslog server where they sit in flat files, difficult to search and impossible to correlate with application-level telemetry.

The OpenTelemetry Collector can act as a syslog receiver, accepting messages from network devices and processing them through the same pipeline as your application logs, traces, and metrics. This means your network events appear alongside your application events in a single observability platform, making it much easier to track down issues that span the network and application layers.

## Syslog Fundamentals

Before diving into configuration, let me briefly cover how syslog works with network devices. Syslog is a protocol defined in RFC 5424 (and its predecessor RFC 3164, known as BSD syslog). Network devices send UDP or TCP packets containing structured log messages to a configured syslog server.

Each syslog message includes:

- **Facility**: The subsystem that generated the message (kernel, auth, local0-local7, etc.)
- **Severity**: The importance level (emergency, alert, critical, error, warning, notice, info, debug)
- **Timestamp**: When the event occurred
- **Hostname**: The device that generated the message
- **Message**: The actual log content

```mermaid
graph LR
    R[Router] -->|Syslog UDP/TCP| OC[OTel Collector :514]
    S[Switch] -->|Syslog UDP/TCP| OC
    FW[Firewall] -->|Syslog UDP/TCP| OC
    LB[Load Balancer] -->|Syslog UDP/TCP| OC
    AP[Access Point] -->|Syslog UDP/TCP| OC
    OC -->|Process & Export| O[OneUptime]
```

Most network devices support both RFC 3164 (the older, simpler format) and RFC 5424 (the newer, structured format). The OpenTelemetry Collector's syslog receiver handles both.

## Configuring Network Devices

First, configure your network devices to send syslog messages to the collector. Here are examples for common device types.

### Cisco IOS/IOS-XE

```text
! Configure syslog on a Cisco router or switch
! Send logs to the collector via UDP
logging host 10.0.1.100 transport udp port 514

! Set the logging severity level
! 6 = informational, captures most useful messages
logging trap informational

! Use the local0 facility for easier filtering
logging facility local0

! Include timestamps with millisecond precision
service timestamps log datetime msec localtime

! Include the hostname in syslog messages
logging origin-id hostname
```

### Juniper Junos

```text
# Configure syslog on a Juniper device
set system syslog host 10.0.1.100 any info
set system syslog host 10.0.1.100 port 514
set system syslog host 10.0.1.100 facility-override local0
set system syslog host 10.0.1.100 structured-data
```

### Palo Alto PAN-OS

```text
# Configure syslog on a Palo Alto firewall
# Navigate to Device > Server Profiles > Syslog
# Create a syslog server profile:
#   Name: otel-collector
#   Server: 10.0.1.100
#   Port: 514
#   Transport: UDP
#   Format: BSD (RFC 3164)
#   Facility: LOG_LOCAL0
```

### Fortinet FortiOS

```text
# Configure syslog on a FortiGate firewall
config log syslogd setting
    set status enable
    set server "10.0.1.100"
    set port 514
    set facility local0
    set format default
end
```

## Collector Syslog Receiver Configuration

Now configure the OpenTelemetry Collector to receive syslog messages. The collector needs to listen on the standard syslog port (514) or a custom port:

```yaml
# config.yaml - Syslog collection from network devices
receivers:
  # UDP syslog receiver for most network devices
  syslog/udp:
    udp:
      listen_address: "0.0.0.0:514"
    protocol: rfc3164
    # Most network devices use RFC 3164 (BSD syslog)
    # Use rfc5424 if your devices support structured syslog
    location: "America/New_York"
    # Set the timezone if devices send local time without timezone info
    operators:
      # Parse the syslog hostname into a resource attribute
      - type: move
        from: attributes["net.host.name"]
        to: resource["host.name"]

  # TCP syslog receiver for reliable delivery
  syslog/tcp:
    tcp:
      listen_address: "0.0.0.0:1514"
      # Use a non-privileged port for TCP
      # Some devices support TCP syslog for guaranteed delivery
    protocol: rfc5424
    operators:
      - type: move
        from: attributes["net.host.name"]
        to: resource["host.name"]

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

  resource:
    attributes:
      - key: service.name
        value: "network-syslog"
        action: upsert

  # Parse device-specific message formats
  transform:
    log_statements:
      - context: log
        statements:
          # Extract severity text for easier filtering
          - set(attributes["syslog.severity.text"], "emergency") where severity_number == 0
          - set(attributes["syslog.severity.text"], "alert") where severity_number == 1
          - set(attributes["syslog.severity.text"], "critical") where severity_number == 2
          - set(attributes["syslog.severity.text"], "error") where severity_number == 3
          - set(attributes["syslog.severity.text"], "warning") where severity_number == 4
          - set(attributes["syslog.severity.text"], "notice") where severity_number == 5
          - set(attributes["syslog.severity.text"], "info") where severity_number == 6
          - set(attributes["syslog.severity.text"], "debug") where severity_number == 7

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    logs:
      receivers: [syslog/udp, syslog/tcp]
      processors: [resource, transform, batch]
      exporters: [otlp]
```

The configuration uses two syslog receivers: one for UDP (the default syslog transport) and one for TCP (for devices that support reliable delivery). Port 514 requires the collector to run as root or have the `CAP_NET_BIND_SERVICE` capability on Linux. If running as a non-root user, use a higher port (like 1514) and configure your devices or a port redirect accordingly.

## Parsing Device-Specific Messages

Network device syslog messages contain structured information, but it is embedded in the message text. Different vendors use different formats. Here are common patterns you might want to parse:

```yaml
processors:
  transform/cisco:
    log_statements:
      - context: log
        conditions:
          # Only apply to Cisco device messages
          - 'IsMatch(body, "^%[A-Z]+-\\d+-[A-Z]+:")'
        statements:
          # Parse Cisco IOS message format: %FACILITY-SEVERITY-MNEMONIC: message
          # Example: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to down
          - merge_maps(attributes, ExtractPatterns(body, "^%(?P<cisco_facility>[A-Z]+)-(?P<cisco_severity>\\d+)-(?P<cisco_mnemonic>[A-Z]+):"), "upsert")

  transform/paloalto:
    log_statements:
      - context: log
        conditions:
          - 'IsMatch(body, "TRAFFIC|THREAT|SYSTEM")'
        statements:
          # Parse Palo Alto comma-separated log format
          # Extract key fields from the CSV structure
          - merge_maps(attributes, ExtractPatterns(body, ",(?P<pa_log_type>TRAFFIC|THREAT|SYSTEM),"), "upsert")
```

Parsing vendor-specific formats is valuable because it lets you create targeted alerts. For example, you can alert specifically on Cisco `%LINK-3-UPDOWN` messages that indicate a physical interface going down, or Palo Alto `THREAT` log entries that indicate a security event.

## Filtering and Routing

In a busy network, syslog volume can be enormous. Use the filter processor to reduce noise:

```yaml
processors:
  # Drop debug-level messages to reduce volume
  filter/drop_debug:
    logs:
      log_record:
        - 'severity_number > 6'
        # severity_number 7 = debug
        # Drop debug messages from network devices

  # Route different severity levels to different pipelines
  # Critical messages get exported immediately
  # Informational messages can be batched more aggressively
```

For large environments, consider routing high-severity messages (emergency through warning) to one pipeline with aggressive batching and low-severity messages (notice through debug) to another pipeline with larger batch sizes and longer timeouts. This ensures critical network events are delivered quickly.

## Important Syslog Messages to Monitor

Not all syslog messages deserve attention. Focus your alerting on these categories:

**Interface state changes** indicate physical or logical link failures. These messages typically contain keywords like "UPDOWN", "link-down", or "carrier-loss". An unexpected interface going down can indicate cable problems, transceiver failures, or peer device issues.

**Authentication failures** from network devices indicate potential security issues. Failed SSH logins, SNMP community string mismatches, and RADIUS authentication failures should be tracked and alerted on.

**Hardware alerts** cover things like power supply failures, fan failures, and temperature warnings. These messages are time-sensitive because hardware failures can lead to device outages.

**Configuration changes** are important for audit trails. Track when someone enters configuration mode, makes changes, and saves the configuration. This helps with troubleshooting ("what changed?") and compliance.

**Spanning Tree Protocol (STP) events** affect network topology. STP topology changes can cause brief network outages and are often the root cause of intermittent connectivity problems.

## Alerting on Network Events

```yaml
# Network syslog alert rules
- alert: InterfaceDown
  condition: 'log contains "changed state to down" OR log contains "link-down"'
  severity: critical
  for: 0s
  description: "Network interface went down on {{ host.name }}"

- alert: AuthenticationFailure
  condition: 'syslog.severity <= 4 AND (log contains "authentication failure" OR log contains "Login failed")'
  severity: warning
  for: 0s
  description: "Authentication failure on {{ host.name }}"

- alert: HardwareAlert
  condition: 'log contains "power supply" OR log contains "fan" OR log contains "temperature"'
  severity: critical
  for: 0s
  description: "Hardware alert on {{ host.name }}"

- alert: HighSeverityBurst
  # More than 10 error-or-above messages from a single device in 5 minutes
  condition: count(severity_number <= 3 AND group_by host.name) > 10
  for: 5m
  severity: warning
  description: "Burst of high-severity messages from {{ host.name }}"
```

Interface down alerts fire immediately (for: 0s) because they represent an active network outage. The high-severity burst alert catches situations where a device is generating many errors in a short time, which often indicates a cascading failure.

## Scaling Syslog Collection

For large networks with thousands of devices, a single collector may not handle the syslog volume. Use a tiered architecture:

```mermaid
graph TD
    subgraph Network Devices
        D1[Devices - Site A]
        D2[Devices - Site B]
        D3[Devices - Site C]
    end

    subgraph Collector Agents
        CA[Collector Agent - Site A]
        CB[Collector Agent - Site B]
        CC[Collector Agent - Site C]
    end

    subgraph Central
        CG[Collector Gateway]
    end

    D1 -->|Syslog| CA
    D2 -->|Syslog| CB
    D3 -->|Syslog| CC
    CA -->|OTLP| CG
    CB -->|OTLP| CG
    CC -->|OTLP| CG
    CG -->|Export| O[OneUptime]
```

Each site has a local collector agent that receives syslog messages and forwards them via OTLP to a central gateway. This reduces WAN bandwidth usage because OTLP is more efficient than raw syslog, and the local agents can perform initial filtering and parsing.

## Troubleshooting

If no messages arrive at the collector, check these common issues:

UDP syslog is fire-and-forget, meaning the network device does not know whether the collector received the message. Use `tcpdump -i any port 514 -n` on the collector host to verify packets are arriving.

If messages arrive but are not parsed correctly, check the protocol setting. Most network devices default to RFC 3164. If you have the receiver set to RFC 5424, the messages will fail to parse.

Timestamp parsing problems are common when network devices send local time without timezone information. The `location` setting in the receiver configuration helps, but the best fix is to configure NTP on all devices and use UTC timestamps.

## Conclusion

Collecting syslog messages from network devices with the OpenTelemetry Collector brings network observability into the same platform as your application monitoring. Configure your devices to send syslog to the collector, use the syslog receiver with the appropriate protocol format, and add parsers for vendor-specific message formats. Focus your alerting on interface state changes, authentication failures, and hardware alerts. These are the network events most likely to affect your applications and users. With syslog data flowing through your OpenTelemetry pipeline, you can finally correlate network events with application issues and dramatically reduce your mean time to resolution.

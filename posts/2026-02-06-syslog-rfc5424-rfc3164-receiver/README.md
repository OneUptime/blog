# How to Parse Syslog RFC 5424 and RFC 3164 Messages with the Syslog Receiver in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Syslog, RFC 5424, RFC 3164, Collector

Description: Configure the OpenTelemetry Collector syslog receiver to parse both RFC 5424 and RFC 3164 syslog messages into structured logs.

Syslog is the oldest and most widely deployed logging protocol. Networking equipment, Linux systems, and many enterprise applications still send syslog messages. The OpenTelemetry Collector has a dedicated syslog receiver that can parse both the modern RFC 5424 format and the legacy RFC 3164 (BSD syslog) format.

## RFC 3164 vs RFC 5424

**RFC 3164** (the older format):
```
<34>Oct  6 14:23:45 myhost sshd[12345]: Accepted publickey for user from 192.168.1.100 port 22 ssh2
```

**RFC 5424** (the modern format):
```
<165>1 2026-02-06T14:23:45.123456+00:00 myhost appname 12345 ID47 [exampleSDID@32473 iut="3" eventSource="Application" eventID="1011"] An application event has occurred
```

RFC 5424 adds structured data, millisecond timestamps, and a formal message format.

## Configuring the Syslog Receiver for RFC 5424

```yaml
receivers:
  syslog/rfc5424:
    udp:
      listen_address: "0.0.0.0:514"
    protocol: rfc5424
```

This is the simplest configuration. The receiver listens on UDP port 514 and expects RFC 5424 messages.

## Configuring for RFC 3164

```yaml
receivers:
  syslog/rfc3164:
    udp:
      listen_address: "0.0.0.0:1514"
    tcp:
      listen_address: "0.0.0.0:1514"
    protocol: rfc3164
    location: America/New_York
```

RFC 3164 timestamps lack year and timezone information, so you need to specify the `location` to correctly interpret them.

## Handling Both Formats

If you need to accept both formats (common when you have a mix of old and new devices), run two syslog receivers on different ports:

```yaml
receivers:
  syslog/modern:
    tcp:
      listen_address: "0.0.0.0:5514"
    protocol: rfc5424

  syslog/legacy:
    udp:
      listen_address: "0.0.0.0:514"
    tcp:
      listen_address: "0.0.0.0:514"
    protocol: rfc3164
    location: UTC

service:
  pipelines:
    logs:
      receivers: [syslog/modern, syslog/legacy]
      processors: [batch]
      exporters: [otlp]
```

## Complete Production Configuration

```yaml
receivers:
  syslog/rfc5424:
    tcp:
      listen_address: "0.0.0.0:5514"
      # TLS for secure syslog (RFC 5425)
      tls:
        cert_file: /etc/ssl/certs/collector.crt
        key_file: /etc/ssl/private/collector.key
    protocol: rfc5424

  syslog/rfc3164:
    udp:
      listen_address: "0.0.0.0:514"
    tcp:
      listen_address: "0.0.0.0:1514"
    protocol: rfc3164
    location: UTC

processors:
  # Map syslog attributes to OTel semantic conventions
  transform/syslog-to-otel:
    log_statements:
      - context: log
        statements:
          # Map syslog facility to a human-readable name
          - set(attributes["syslog.facility.name"], "kern") where attributes["facility"] == 0
          - set(attributes["syslog.facility.name"], "user") where attributes["facility"] == 1
          - set(attributes["syslog.facility.name"], "mail") where attributes["facility"] == 2
          - set(attributes["syslog.facility.name"], "daemon") where attributes["facility"] == 3
          - set(attributes["syslog.facility.name"], "auth") where attributes["facility"] == 4
          - set(attributes["syslog.facility.name"], "syslog") where attributes["facility"] == 5
          - set(attributes["syslog.facility.name"], "local0") where attributes["facility"] == 16
          - set(attributes["syslog.facility.name"], "local7") where attributes["facility"] == 23

  resource/syslog:
    attributes:
      - key: service.name
        value: "syslog"
        action: upsert

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [syslog/rfc5424, syslog/rfc3164]
      processors: [resource/syslog, transform/syslog-to-otel, batch]
      exporters: [otlp]
```

## Parsed Attributes

The syslog receiver automatically extracts these attributes:

For RFC 5424:
- `appname` - the application name
- `hostname` - the originating host
- `facility` - the syslog facility number
- `priority` - the priority value
- `proc_id` - the process ID
- `msg_id` - the message ID
- `structured_data` - the structured data section

For RFC 3164:
- `appname` - extracted from the tag field
- `hostname` - the originating host
- `facility` - the syslog facility number
- `priority` - the priority value

## Severity Mapping

The syslog receiver automatically maps syslog severity to OpenTelemetry severity levels:

| Syslog Severity | Name | OTel Severity |
|----------------|------|---------------|
| 0 | Emergency | FATAL |
| 1 | Alert | FATAL |
| 2 | Critical | FATAL |
| 3 | Error | ERROR |
| 4 | Warning | WARN |
| 5 | Notice | INFO |
| 6 | Informational | INFO |
| 7 | Debug | DEBUG |

## Using the Filelog Receiver for Syslog Files

If your syslog messages are already written to files (by rsyslog or syslog-ng), use the filelog receiver instead:

```yaml
receivers:
  filelog/syslog-file:
    include:
      - /var/log/syslog
      - /var/log/messages
    start_at: end
    operators:
      # Parse RFC 3164 from file
      - type: syslog_parser
        protocol: rfc3164
        location: UTC
```

The `syslog_parser` operator within the filelog receiver understands the same formats as the standalone syslog receiver.

## Filtering by Facility

You might want to route different syslog facilities to different pipelines:

```yaml
processors:
  filter/auth-only:
    logs:
      include:
        match_type: strict
        resource_attributes:
          - key: facility
            value: "4"
          - key: facility
            value: "10"
```

This keeps only auth (4) and authpriv (10) facility messages, which is useful for security monitoring.

The syslog receiver bridges the gap between traditional syslog infrastructure and modern OpenTelemetry-based observability. You can collect logs from network switches, firewalls, and legacy systems and process them alongside your application telemetry in a unified pipeline.

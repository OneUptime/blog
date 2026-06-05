# How to Parse Syslog RFC 5424 and RFC 3164 Messages with the Syslog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Syslog, RFC 5424, RFC 3164, Collector

Description: Configure the OpenTelemetry Collector syslog receiver to parse both RFC 5424 and RFC 3164 syslog messages into structured logs.

Syslog is the oldest and most widely deployed logging protocol. Networking equipment, Linux systems, and many enterprise applications still send syslog messages. The OpenTelemetry Collector has a dedicated syslog receiver that can parse both the modern RFC 5424 format and the legacy RFC 3164 (BSD syslog) format.

## RFC 3164 vs RFC 5424

**RFC 3164** (the older format):
```text
<34>Oct  6 14:23:45 myhost sshd[12345]: Accepted publickey for user from 192.168.1.100 port 22 ssh2
```

**RFC 5424** (the modern format):
```text
<165>1 2026-02-06T14:23:45.123456+00:00 myhost appname 12345 ID47 [exampleSDID@32473 iut="3" eventSource="Application" eventID="1011"] An application event has occurred
```

RFC 5424 adds structured data, subsecond timestamps, and a formal message format.

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

RFC 3164 timestamps lack year and timezone information, so you should set `location` to the timezone used by the sending systems when it is not UTC.

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

processors:
  batch:

exporters:
  otlp:
    endpoint: "backend.internal:4317"

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
  # Copy the receiver's syslog facility text to a custom attribute
  transform/syslog-to-otel:
    log_statements:
      - context: log
        statements:
          - set(attributes["syslog.facility.name"], attributes["facility_text"]) where attributes["facility_text"] != nil

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
- `facility_text` - the syslog facility name
- `priority` - the priority value
- `proc_id` - the process ID
- `msg_id` - the message ID
- `message` - the syslog message content
- `structured_data` - the structured data section
- `version` - the RFC 5424 version

For RFC 3164:
- `appname` - extracted from the tag field
- `hostname` - the originating host
- `facility` - the syslog facility number
- `facility_text` - the syslog facility name
- `priority` - the priority value
- `proc_id` - the process ID, when present
- `msg_id` - the message ID, when present
- `message` - the syslog message content

## Severity Mapping

The syslog receiver automatically maps syslog severity to OpenTelemetry severity fields:

| Syslog Severity | Syslog Name | Collector `SeverityText` | OTel `SeverityNumber` |
|----------------|-------------|--------------------------|-----------------------|
| 0 | Emergency | `emerg` | `Fatal` |
| 1 | Alert | `alert` | `Error3` |
| 2 | Critical | `crit` | `Error2` |
| 3 | Error | `err` | `Error` |
| 4 | Warning | `warning` | `Warn` |
| 5 | Notice | `notice` | `Info2` |
| 6 | Informational | `info` | `Info` |
| 7 | Debug | `debug` | `Debug` |

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
    error_mode: ignore
    log_conditions:
      - 'attributes["facility"] != 4 and attributes["facility"] != 10'
```

This keeps only auth (4) and authpriv (10) facility messages, which is useful for security monitoring.

The syslog receiver bridges the gap between traditional syslog infrastructure and modern OpenTelemetry-based observability. You can collect logs from network switches, firewalls, and legacy systems and process them alongside your application telemetry in a unified pipeline.

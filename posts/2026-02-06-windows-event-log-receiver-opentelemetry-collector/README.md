# How to Configure the Windows Event Log Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Window, Event Log, Log, Security

Description: Learn how to configure the Windows Event Log Receiver in the OpenTelemetry Collector to collect system, application, and security logs from Windows.

---

The Windows Event Log Receiver collects logs from Windows Event Log channels, enabling centralized log management and analysis for Windows systems. This receiver is essential for monitoring Windows servers, workstations, and applications, providing visibility into system events, security audits, application errors, and more.

For more on log collection, see our guide on [OpenTelemetry log receivers](https://oneuptime.com/blog/post/2026-02-06-what-opentelemetry-does-not-do/view).

## What is the Windows Event Log Receiver?

The Windows Event Log Receiver subscribes to Windows Event Log channels and converts event log entries into OpenTelemetry log records. It uses the Windows Event Log API to efficiently stream events and supports filtering, batching, and structured attribute extraction.

```mermaid
graph LR
    A[Windows Event Log] -->|Subscribe| B[Event Log Receiver]
    B -->|System Events| C[Log Pipeline]
    B -->|Application Events| C
    B -->|Security Events| C
    C --> D[Processors]
    D --> E[Exporters]
    E --> F[Backend]
```

Key features:
- Collect from any Windows Event Log channel
- Filter events by event ID, level, and provider
- Extract structured attributes from event data
- Support for custom event channels
- Efficient streaming with bookmarking

## Basic Configuration

Start with a simple configuration to collect system events.

```yaml
receivers:
  windows_event_log:
    # Collect from System channel
    channel: System

    # Start collecting from the most recent event
    start_at: end

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [windows_event_log]
      exporters: [debug]
```

This collects all new events from the System channel.

## Channel Configuration

Windows Event Log has multiple channels for different event types.

### Common Channels

```yaml
receivers:
  # System events
  windows_event_log/system:
    channel: System
    start_at: end

  # Application events
  windows_event_log/application:
    channel: Application
    start_at: end

  # Security events (requires administrator privileges)
  windows_event_log/security:
    channel: Security
    start_at: end

  # Windows PowerShell events
  windows_event_log/powershell:
    channel: Windows PowerShell
    start_at: end

  # Windows Defender events
  windows_event_log/defender:
    channel: Microsoft-Windows-Windows Defender/Operational
    start_at: end

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers:
        - windows_event_log/system
        - windows_event_log/application
        - windows_event_log/security
        - windows_event_log/powershell
        - windows_event_log/defender
      exporters: [otlp]
```

### Finding Available Channels

List all available channels using PowerShell:

```powershell
# List all event log channels

Get-WinEvent -ListLog * | Select-Object LogName, RecordCount, IsEnabled

# Find channels with recent activity
Get-WinEvent -ListLog * | Where-Object { $_.RecordCount -gt 0 } | Select-Object LogName, RecordCount

# Search for specific channels
Get-WinEvent -ListLog *Security* | Select-Object LogName
```

## Start Position

Configure where the receiver starts collecting events.

```yaml
receivers:
  windows_event_log:
    channel: System

    # Start from the beginning (collect all historical events)
    start_at: beginning

    # OR start from the end (only new events)
    # start_at: end
```

Use `beginning` for initial setup to collect historical events. The receiver tracks its position in memory while it runs; configure the `storage` option with a storage extension if you need bookmarks to survive collector restarts.

## Event Filtering

Filter events to collect only relevant logs.

### Filter by Event Level

```yaml
receivers:
  windows_event_log:
    channel: System

    # Only collect errors and critical events
    # Levels: 0=LogAlways, 1=Critical, 2=Error, 3=Warning, 4=Information, 5=Verbose
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">*[System[(Level=1 or Level=2)]]</Select>
        </Query>
      </QueryList>
```

### Filter by Event ID

```yaml
receivers:
  windows_event_log:
    channel: System

    # Only collect specific event IDs
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">
            *[System[(EventID=1074 or EventID=6005 or EventID=6006 or EventID=6008)]]
          </Select>
        </Query>
      </QueryList>

# Event IDs:
# 1074 - System shutdown/restart
# 6005 - Event Log service started
# 6006 - Event Log service stopped
# 6008 - Unexpected shutdown
```

### Filter by Event Provider

```yaml
receivers:
  windows_event_log:
    channel: System

    # Only collect events from specific provider
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">
            *[System[Provider[@Name='Microsoft-Windows-Kernel-Power']]]
          </Select>
        </Query>
      </QueryList>
```

### Complex Filtering

```yaml
receivers:
  windows_event_log:
    channel: Security

    # Collect failed login attempts (Event ID 4625)
    # and successful logins (Event ID 4624)
    # from the last 24 hours
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">
            *[System[(EventID=4624 or EventID=4625) and TimeCreated[timediff(@SystemTime) &lt;= 86400000]]]
          </Select>
        </Query>
      </QueryList>
```

## Attribute Extraction

Extract structured data from event logs.

### Basic Fields

The receiver automatically parses Windows events into a structured log body:

```yaml
receivers:
  windows_event_log:
    channel: System

processors:
  # View extracted attributes
  transform/view_attributes:
    log_statements:
      - statements:
          # Fields automatically parsed into log.body:
          # - log.body["event_id"]["id"]: Event ID number
          # - log.body["level"]: Event level (Critical, Error, Warning, Information, Verbose)
          # - log.body["provider"]["name"]: Event provider name
          # - log.body["computer"]: Computer name
          # - log.body["system_time"]: Event timestamp
          # - log.body["record_id"]: Event record ID
          # - log.body["channel"]: Channel name
          - set(log.attributes["extracted"], "true")

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [windows_event_log]
      processors: [transform/view_attributes]
      exporters: [debug]
```

### Extract Event Data Fields

Extract specific fields from event data.

```yaml
receivers:
  windows_event_log:
    channel: Security

processors:
  # Extract login event details
  transform/security:
    log_statements:
      - statements:
          # Extract fields from event data
          # Security event 4624 (successful login) structure:
          # - TargetUserName: Username
          # - IpAddress: Source IP
          # - LogonType: Logon type

          # Access event data from the structured log body
          - set(log.attributes["user.name"], log.body["event_data"]["TargetUserName"]) where log.body["event_data"]["TargetUserName"] != nil
          - set(log.attributes["source.ip"], log.body["event_data"]["IpAddress"]) where log.body["event_data"]["IpAddress"] != nil
          - set(log.attributes["logon.type"], log.body["event_data"]["LogonType"]) where log.body["event_data"]["LogonType"] != nil

          # Set severity based on event type
          - set(log.severity_text, "INFO") where log.body["event_id"]["id"] == 4624
          - set(log.severity_text, "WARN") where log.body["event_id"]["id"] == 4625

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log]
      processors: [transform/security]
      exporters: [otlp]
```

## Security Event Monitoring

Monitor Windows security events for audit and compliance.

### Failed Login Attempts

```yaml
receivers:
  windows_event_log/failed_logins:
    channel: Security

    # Event ID 4625: Failed login attempt
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">*[System[(EventID=4625)]]</Select>
        </Query>
      </QueryList>

processors:
  transform/failed_logins:
    log_statements:
      - statements:
          # Extract failed login details
          - set(log.attributes["security.event"], "failed_login")
          - set(log.attributes["user.name"], log.body["event_data"]["TargetUserName"]) where log.body["event_data"]["TargetUserName"] != nil
          - set(log.attributes["source.ip"], log.body["event_data"]["IpAddress"]) where log.body["event_data"]["IpAddress"] != nil
          - set(log.attributes["failure.reason"], log.body["event_data"]["FailureReason"]) where log.body["event_data"]["FailureReason"] != nil
          - set(log.severity_text, "WARN")

  # Filter to only IP-based attacks
  filter/remote_attacks:
    error_mode: ignore
    log_conditions:
      - log.attributes["source.ip"] == nil or log.attributes["source.ip"] == "-"

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/failed_logins]
      processors: [transform/failed_logins, filter/remote_attacks]
      exporters: [otlp]
```

### Account Changes

```yaml
receivers:
  windows_event_log/account_changes:
    channel: Security

    # Monitor account management events
    # 4720: Account created
    # 4722: Account enabled
    # 4723: Password change attempt
    # 4724: Password reset
    # 4725: Account disabled
    # 4726: Account deleted
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">
            *[System[(EventID=4720 or EventID=4722 or EventID=4723 or EventID=4724 or EventID=4725 or EventID=4726)]]
          </Select>
        </Query>
      </QueryList>

processors:
  transform/account_changes:
    log_statements:
      - statements:
          - set(log.attributes["security.event"], "account_change")
          - set(log.attributes["target.user"], log.body["event_data"]["TargetUserName"]) where log.body["event_data"]["TargetUserName"] != nil
          - set(log.attributes["changed.by"], log.body["event_data"]["SubjectUserName"]) where log.body["event_data"]["SubjectUserName"] != nil

          # Classify event type
          - set(log.attributes["change.type"], "created") where log.body["event_id"]["id"] == 4720
          - set(log.attributes["change.type"], "enabled") where log.body["event_id"]["id"] == 4722
          - set(log.attributes["change.type"], "password_changed") where log.body["event_id"]["id"] == 4723
          - set(log.attributes["change.type"], "password_reset") where log.body["event_id"]["id"] == 4724
          - set(log.attributes["change.type"], "disabled") where log.body["event_id"]["id"] == 4725
          - set(log.attributes["change.type"], "deleted") where log.body["event_id"]["id"] == 4726

          - set(log.severity_text, "INFO")

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/account_changes]
      processors: [transform/account_changes]
      exporters: [otlp]
```

### Privilege Escalation

```yaml
receivers:
  windows_event_log/privilege_escalation:
    channel: Security

    # Monitor privilege use events
    # 4672: Special privileges assigned to new logon
    # 4673: Privileged service called
    # 4674: Operation attempted on privileged object
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">
            *[System[(EventID=4672 or EventID=4673 or EventID=4674)]]
          </Select>
        </Query>
      </QueryList>

processors:
  transform/privilege_escalation:
    log_statements:
      - statements:
          - set(log.attributes["security.event"], "privilege_use")
          - set(log.attributes["user.name"], log.body["event_data"]["SubjectUserName"]) where log.body["event_data"]["SubjectUserName"] != nil
          - set(log.attributes["privileges"], log.body["event_data"]["PrivilegeList"]) where log.body["event_data"]["PrivilegeList"] != nil
          - set(log.severity_text, "WARN")

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/privilege_escalation]
      processors: [transform/privilege_escalation]
      exporters: [otlp]
```

## Application Event Monitoring

Monitor application errors and warnings.

### Application Crashes

```yaml
receivers:
  windows_event_log/application_errors:
    channel: Application

    # Application error events
    query: |
      <QueryList>
        <Query Id="0" Path="Application">
          <Select Path="Application">*[System[(Level=1 or Level=2)]]</Select>
        </Query>
      </QueryList>

processors:
  transform/app_errors:
    log_statements:
      - statements:
          - set(log.attributes["event.type"], "application_error")
          - set(log.attributes["application.name"], log.body["provider"]["name"]) where log.body["provider"]["name"] != nil

          # Extract error code if present
          - set(log.attributes["error.code"], log.body["event_data"]["ErrorCode"]) where log.body["event_data"]["ErrorCode"] != nil

          # Set severity
          - set(log.severity_text, "CRITICAL") where log.body["level"] == "Critical"
          - set(log.severity_text, "ERROR") where log.body["level"] == "Error"

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/application_errors]
      processors: [transform/app_errors]
      exporters: [otlp]
```

### IIS Web Server Logs

```yaml
receivers:
  windows_event_log/iis:
    channel: Microsoft-Windows-IIS-Logging/Logs

processors:
  transform/iis:
    log_statements:
      - statements:
          - set(log.attributes["service.name"], "iis")
          - set(log.attributes["http.request_path"], log.body["event_data"]["RequestPath"]) where log.body["event_data"]["RequestPath"] != nil
          - set(log.attributes["http.status_code"], log.body["event_data"]["StatusCode"]) where log.body["event_data"]["StatusCode"] != nil
          - set(log.attributes["http.client_ip"], log.body["event_data"]["ClientIP"]) where log.body["event_data"]["ClientIP"] != nil

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/iis]
      processors: [transform/iis]
      exporters: [otlp]
```

## System Event Monitoring

Monitor system health and operations.

### System Restarts and Shutdowns

```yaml
receivers:
  windows_event_log/system_power:
    channel: System

    # System power events
    # 1074: System shutdown/restart initiated by user/process
    # 6005: Event Log service started (system boot)
    # 6006: Event Log service stopped (clean shutdown)
    # 6008: Unexpected shutdown
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">
            *[System[(EventID=1074 or EventID=6005 or EventID=6006 or EventID=6008)]]
          </Select>
        </Query>
      </QueryList>

processors:
  transform/system_power:
    log_statements:
      - statements:
          - set(log.attributes["system.event"], "power")

          # Classify event
          - set(log.attributes["power.action"], "restart_initiated") where log.body["event_id"]["id"] == 1074
          - set(log.attributes["power.action"], "boot_complete") where log.body["event_id"]["id"] == 6005
          - set(log.attributes["power.action"], "shutdown_clean") where log.body["event_id"]["id"] == 6006
          - set(log.attributes["power.action"], "shutdown_unexpected") where log.body["event_id"]["id"] == 6008

          # Set severity
          - set(log.severity_text, "INFO") where log.body["event_id"]["id"] == 1074 or log.body["event_id"]["id"] == 6005 or log.body["event_id"]["id"] == 6006
          - set(log.severity_text, "ERROR") where log.body["event_id"]["id"] == 6008

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/system_power]
      processors: [transform/system_power]
      exporters: [otlp]
```

### Service Events

```yaml
receivers:
  windows_event_log/services:
    channel: System

    # Service control manager events
    # 7034: Service terminated unexpectedly
    # 7035: Service started/stopped
    # 7036: Service entered state
    # 7040: Service start type changed
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">
            *[System[Provider[@Name='Service Control Manager']]]
          </Select>
        </Query>
      </QueryList>

processors:
  transform/services:
    log_statements:
      - statements:
          - set(log.attributes["system.event"], "service")
          - set(log.attributes["service.name"], log.body["event_data"]["ServiceName"]) where log.body["event_data"]["ServiceName"] != nil

          # Classify event
          - set(log.attributes["service.action"], "terminated_unexpectedly") where log.body["event_id"]["id"] == 7034
          - set(log.attributes["service.action"], "state_changed") where log.body["event_id"]["id"] == 7036
          - set(log.attributes["service.action"], "startup_type_changed") where log.body["event_id"]["id"] == 7040

          # Set severity
          - set(log.severity_text, "ERROR") where log.body["event_id"]["id"] == 7034
          - set(log.severity_text, "INFO") where log.body["event_id"]["id"] == 7035 or log.body["event_id"]["id"] == 7036 or log.body["event_id"]["id"] == 7040

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log/services]
      processors: [transform/services]
      exporters: [otlp]
```

Resource Attributes

Add contextual information to logs.

```yaml
receivers:
  windows_event_log:
    channel: System

processors:
  # Add resource attributes
  resource/windows:
    attributes:
      - key: os.type
        value: windows
        action: upsert
      - key: host.name
        value: ${env:COMPUTERNAME}
        action: upsert
      - key: deployment.environment
        value: ${env:ENVIRONMENT}
        action: upsert

  # Detect additional host information
  resource_detection:
    detectors: [system, env]
    timeout: 5s

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [windows_event_log]
      processors: [resource/windows, resource_detection]
      exporters: [otlp]
```

## Complete Production Example

Full configuration for comprehensive Windows monitoring.

```yaml
receivers:
  # System events
  windows_event_log/system:
    channel: System
    start_at: end
    query: |
      <QueryList>
        <Query Id="0" Path="System">
          <Select Path="System">*[System[(Level=1 or Level=2 or Level=3)]]</Select>
        </Query>
      </QueryList>

  # Application errors
  windows_event_log/application:
    channel: Application
    start_at: end
    query: |
      <QueryList>
        <Query Id="0" Path="Application">
          <Select Path="Application">*[System[(Level=1 or Level=2)]]</Select>
        </Query>
      </QueryList>

  # Security events - Failed logins
  windows_event_log/security_failed_logins:
    channel: Security
    start_at: end
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">*[System[(EventID=4625)]]</Select>
        </Query>
      </QueryList>

  # Security events - Account changes
  windows_event_log/security_account_changes:
    channel: Security
    start_at: end
    query: |
      <QueryList>
        <Query Id="0" Path="Security">
          <Select Path="Security">
            *[System[(EventID=4720 or EventID=4722 or EventID=4725 or EventID=4726)]]
          </Select>
        </Query>
      </QueryList>

  # Windows Defender
  windows_event_log/defender:
    channel: Microsoft-Windows-Windows Defender/Operational
    start_at: end

processors:
  # Process system events
  transform/system:
    log_statements:
      - statements:
          - set(log.attributes["log.source"], "system") where log.body["channel"] == "System"
          - set(log.severity_text, "CRITICAL") where log.body["level"] == "Critical"
          - set(log.severity_text, "ERROR") where log.body["level"] == "Error"
          - set(log.severity_text, "WARN") where log.body["level"] == "Warning"

  # Process application events
  transform/application:
    log_statements:
      - statements:
          - set(log.attributes["log.source"], "application") where log.body["channel"] == "Application"
          - set(log.attributes["application.name"], log.body["provider"]["name"])

  # Process security events
  transform/security:
    log_statements:
      - statements:
          - set(log.attributes["log.source"], "security") where log.body["channel"] == "Security"

          # Failed logins
          - set(log.attributes["security.event"], "failed_login") where log.body["event_id"]["id"] == 4625
          - set(log.attributes["user.name"], log.body["event_data"]["TargetUserName"]) where log.body["event_id"]["id"] == 4625 and log.body["event_data"]["TargetUserName"] != nil
          - set(log.attributes["source.ip"], log.body["event_data"]["IpAddress"]) where log.body["event_id"]["id"] == 4625 and log.body["event_data"]["IpAddress"] != nil

          # Account changes
          - set(log.attributes["security.event"], "account_change") where log.body["event_id"]["id"] == 4720 or log.body["event_id"]["id"] == 4722 or log.body["event_id"]["id"] == 4725 or log.body["event_id"]["id"] == 4726
          - set(log.attributes["target.user"], log.body["event_data"]["TargetUserName"]) where log.body["event_data"]["TargetUserName"] != nil

  # Add resource attributes
  resource/windows:
    attributes:
      - key: os.type
        value: windows
        action: upsert
      - key: host.name
        value: ${env:COMPUTERNAME}
        action: upsert
      - key: deployment.environment
        value: ${env:ENVIRONMENT}
        action: upsert
      - key: collector.version
        value: ${env:COLLECTOR_VERSION}
        action: upsert

  # Detect host information
  resource_detection:
    detectors: [system, env]
    timeout: 5s

  # Batch processing
  batch:
    timeout: 10s
    send_batch_size: 1000

exporters:
  # Send to OTLP backend
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}
    headers:
      authorization: Bearer ${env:OTEL_AUTH_TOKEN}
    compression: gzip

extensions:
  # Health check
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]

  pipelines:
    logs:
      receivers:
        - windows_event_log/system
        - windows_event_log/application
        - windows_event_log/security_failed_logins
        - windows_event_log/security_account_changes
        - windows_event_log/defender
      processors:
        - transform/system
        - transform/application
        - transform/security
        - resource/windows
        - resource_detection
        - batch
      exporters: [otlp]

  telemetry:
    logs:
      level: info
      encoding: json
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
```

## Summary

| Feature | Configuration |
|---------|--------------|
| **Channels** | System, Application, Security, custom |
| **Filtering** | Event ID, level, provider, time range |
| **Security Monitoring** | Failed logins, account changes, privileges |
| **Application Monitoring** | Errors, crashes, IIS logs |
| **System Monitoring** | Restarts, shutdowns, services |
| **Fields** | Structured log body + custom transform |

The Windows Event Log Receiver provides comprehensive visibility into Windows system activity. By collecting and processing events from system, application, and security channels, you can monitor system health, detect security threats, troubleshoot application issues, and maintain compliance. Combined with transform processors, you can extract structured data and create actionable alerts for your Windows infrastructure.

For more on log processing, see our guides on [transform processor](https://oneuptime.com/blog/post/2026-02-06-transform-processor-opentelemetry-collector/view) and [filter processor](https://oneuptime.com/blog/post/2026-02-06-filter-processor-opentelemetry-collector/view).

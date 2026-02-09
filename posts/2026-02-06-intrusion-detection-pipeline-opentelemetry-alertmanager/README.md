# How to Build an Intrusion Detection Alert Pipeline Using OpenTelemetry Logs and the Alertmanager Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Intrusion Detection, Alertmanager, Security

Description: Build an intrusion detection alert pipeline that processes OpenTelemetry logs through the Collector and routes alerts via Alertmanager.

Intrusion detection does not need to be a separate, expensive system. If your applications already emit structured logs through OpenTelemetry, you can build a detection pipeline directly in the OpenTelemetry Collector. The Collector processes logs in real time, applies detection rules, and forwards alerts to Prometheus Alertmanager for routing and notification.

This post walks through building that pipeline from scratch.

## Architecture

The pipeline has four stages:

1. Applications emit structured security logs via the OTel SDK.
2. The OpenTelemetry Collector receives these logs.
3. Processors apply detection rules and convert suspicious patterns into metrics.
4. Prometheus scrapes these metrics and Alertmanager fires alerts.

The advantage over a traditional SIEM is simplicity. You are reusing infrastructure you already have.

## Application-Side Instrumentation

Your applications need to emit structured logs with security-relevant attributes. Here is an example in Go:

```go
package security

import (
    "context"
    "time"
    "go.opentelemetry.io/otel/log"
    otellog "go.opentelemetry.io/otel/sdk/log"
)

type SecurityLogger struct {
    logger log.Logger
}

func NewSecurityLogger(provider *otellog.LoggerProvider) *SecurityLogger {
    return &SecurityLogger{
        logger: provider.Logger("security-events"),
    }
}

// RecordFailedLogin emits a structured log for a failed login attempt
func (s *SecurityLogger) RecordFailedLogin(ctx context.Context, username, sourceIP, reason string) {
    var record log.Record
    record.SetTimestamp(time.Now())
    record.SetSeverity(log.SeverityWarn)
    record.SetBody(log.StringValue("Failed login attempt"))
    record.AddAttributes(
        log.String("security.event_type", "auth.login_failed"),
        log.String("security.username", username),
        log.String("security.source_ip", sourceIP),
        log.String("security.failure_reason", reason),
    )
    s.logger.Emit(ctx, record)
}

// RecordSuspiciousRequest emits a log for requests matching attack patterns
func (s *SecurityLogger) RecordSuspiciousRequest(ctx context.Context, pattern, path, sourceIP string) {
    var record log.Record
    record.SetTimestamp(time.Now())
    record.SetSeverity(log.SeverityError)
    record.SetBody(log.StringValue("Suspicious request pattern detected"))
    record.AddAttributes(
        log.String("security.event_type", "request.suspicious"),
        log.String("security.attack_pattern", pattern),
        log.String("security.request_path", path),
        log.String("security.source_ip", sourceIP),
    )
    s.logger.Emit(ctx, record)
}

// RecordPrivilegeEscalation emits a log when a user attempts
// to access resources above their permission level
func (s *SecurityLogger) RecordPrivilegeEscalation(ctx context.Context, userID, resource, action string) {
    var record log.Record
    record.SetTimestamp(time.Now())
    record.SetSeverity(log.SeverityError)
    record.SetBody(log.StringValue("Privilege escalation attempt"))
    record.AddAttributes(
        log.String("security.event_type", "authz.privilege_escalation"),
        log.String("security.user_id", userID),
        log.String("security.resource", resource),
        log.String("security.action", action),
    )
    s.logger.Emit(ctx, record)
}
```

## Collector Configuration

The Collector receives logs, applies detection rules using the transform processor, and converts suspicious events into Prometheus metrics:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Count security events by type for metrics
  transform/security_metrics:
    log_statements:
      - context: log
        statements:
          # Tag brute force indicators
          # (the actual counting happens in the metrics pipeline)
          - set(attributes["ids.detection"], "brute_force_candidate")
            where attributes["security.event_type"] == "auth.login_failed"

          - set(attributes["ids.detection"], "injection_attempt")
            where attributes["security.attack_pattern"] == "sql_injection"
            or attributes["security.attack_pattern"] == "xss"

          - set(attributes["ids.detection"], "privilege_escalation")
            where attributes["security.event_type"] == "authz.privilege_escalation"

  # Batch for efficiency
  batch:
    timeout: 5s
    send_batch_size: 100

exporters:
  # Export logs to your log backend
  otlp/logs:
    endpoint: "https://log-backend:4317"

  # Export as Prometheus metrics for alerting
  prometheus:
    endpoint: "0.0.0.0:8889"
    resource_to_telemetry_conversion:
      enabled: true

connectors:
  # Convert log counts into metrics
  count:
    logs:
      security.events.total:
        description: "Total security events by type"
        attributes:
          - key: security.event_type
          - key: ids.detection
          - key: security.source_ip

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/security_metrics, batch]
      exporters: [otlp/logs, count]

    metrics:
      receivers: [count]
      exporters: [prometheus]
```

## Alertmanager Configuration

Configure Alertmanager to handle security alerts with appropriate routing and notification:

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'security-default'

  routes:
    # Critical security alerts go to PagerDuty immediately
    - match:
        severity: critical
      receiver: 'security-pagerduty'
      group_wait: 10s
      repeat_interval: 15m

    # High severity goes to Slack security channel
    - match:
        severity: high
      receiver: 'security-slack'
      group_wait: 30s

receivers:
  - name: 'security-default'
    webhook_configs:
      - url: 'http://security-dashboard:9095/alerts'

  - name: 'security-pagerduty'
    pagerduty_configs:
      - service_key: '<your-pagerduty-key>'
        description: '{{ .CommonAnnotations.summary }}'
        severity: 'critical'

  - name: 'security-slack'
    slack_configs:
      - api_url: '<your-slack-webhook>'
        channel: '#security-alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
```

## Prometheus Alert Rules

Define the detection rules as Prometheus alert rules:

```yaml
# security-alert-rules.yml
groups:
  - name: intrusion-detection
    rules:
      # Brute force detection: more than 20 failed logins
      # from the same IP in 5 minutes
      - alert: BruteForceAttack
        expr: |
          sum by (security_source_ip) (
            rate(security_events_total{
              ids_detection="brute_force_candidate"
            }[5m])
          ) > 20
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Brute force attack detected from {{ $labels.security_source_ip }}"
          description: "More than 20 failed login attempts in 5 minutes from a single IP"

      # SQL injection or XSS attempts
      - alert: InjectionAttempt
        expr: |
          sum by (security_source_ip) (
            rate(security_events_total{
              ids_detection="injection_attempt"
            }[5m])
          ) > 5
        for: 1m
        labels:
          severity: high
        annotations:
          summary: "Injection attacks detected from {{ $labels.security_source_ip }}"

      # Privilege escalation attempts
      - alert: PrivilegeEscalation
        expr: |
          rate(security_events_total{
            ids_detection="privilege_escalation"
          }[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Privilege escalation attempt detected"
          description: "A user attempted to access resources beyond their permission level"

      # Overall anomaly: sudden spike in security events
      - alert: SecurityEventSpike
        expr: |
          sum(rate(security_events_total[5m]))
          > 3 * sum(rate(security_events_total[1h]))
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Security event rate is 3x higher than the hourly average"
```

## Testing the Pipeline

Verify the pipeline works by sending test events:

```bash
# Send a test security event via OTLP HTTP
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "test-service"}}]},
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "'$(date +%s)'000000000",
          "severityText": "WARN",
          "body": {"stringValue": "Failed login attempt"},
          "attributes": [
            {"key": "security.event_type", "value": {"stringValue": "auth.login_failed"}},
            {"key": "security.source_ip", "value": {"stringValue": "10.0.0.1"}},
            {"key": "security.username", "value": {"stringValue": "testuser"}}
          ]
        }]
      }]
    }]
  }'
```

## Summary

You do not need a dedicated SIEM to get basic intrusion detection. By combining OpenTelemetry structured logging with the Collector's processing capabilities and Prometheus Alertmanager's routing engine, you can build an effective detection pipeline with tools you probably already run. The key is consistent structured logging from your applications and well-tuned alert rules that catch the patterns that matter: brute force attacks, injection attempts, privilege escalation, and unusual spikes in security events.

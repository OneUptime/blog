# How to Configure the Webhook Event Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Webhook, Event, Log, HTTP

Description: Learn how to configure the Webhook Event Receiver in the OpenTelemetry Collector to receive events from external systems via HTTP webhooks.

---

The Webhook Event Receiver enables the OpenTelemetry Collector to receive events from external systems via HTTP POST requests. This receiver is ideal for ingesting events from CI/CD systems, monitoring tools, alerting platforms, and any system that can send HTTP webhooks.

For more on OpenTelemetry event handling, see our guide on [logs and events](https://oneuptime.com/blog/post/2026-02-06-collect-kubernetes-events-opentelemetry-logs/view).

## What is the Webhook Event Receiver?

The Webhook Event Receiver creates an HTTP endpoint that accepts POST requests containing event data. It converts these HTTP requests into OpenTelemetry log records, allowing you to collect, process, and export events from diverse sources through a unified pipeline.

```mermaid
graph LR
    A[External System] -->|HTTP POST| B[Webhook Receiver]
    B -->|Read body| C[Log Records]
    C --> D[Processors]
    D --> E[Exporters]
    E --> F[Backend]
```

Use cases include:
- Receiving alerts from monitoring systems
- Collecting deployment events from CI/CD pipelines
- Ingesting audit logs from applications
- Gathering incident notifications from on-call systems
- Capturing custom events from internal tools

## Basic Configuration

The simplest configuration creates an HTTP endpoint that accepts JSON payloads.

```yaml
receivers:
  webhook_event:
    # HTTP endpoint configuration
    endpoint: 0.0.0.0:8080

    # Path where webhook receives requests
    path: /events

exporters:
  # Export to stdout for testing
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [webhook_event]
      exporters: [debug]
```

With this configuration, send events using curl:

```bash
# Send a simple event

curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "deployment",
    "service": "api-gateway",
    "version": "v1.2.3",
    "timestamp": "2026-02-06T10:30:00Z"
  }'
```

## Endpoint Configuration

Configure the HTTP server behavior.

```yaml
receivers:
  webhook_event:
    # Bind address and port
    endpoint: 0.0.0.0:8080

    # URL path for webhook
    path: /events

    # TLS configuration for HTTPS
    tls:
      cert_file: /etc/certs/server.crt
      key_file: /etc/certs/server.key

    # CORS configuration
    cors:
      allowed_origins:
        - https://app.example.com
        - https://ci.example.com
      allowed_headers:
        - Content-Type
        - Authorization
      max_age: 3600

    # Maximum request body size (default: 100KB unless set to 0, which uses 20MiB)
    max_request_body_size: 10485760  # 10MB

    # Read timeout for request headers (maximum: 10s)
    read_timeout: 10s

    # Write timeout for responses (maximum: 10s)
    write_timeout: 10s
```

## Authentication

Secure your webhook endpoint with various authentication methods.

### Bearer Token Authentication

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events

    # Require bearer token
    auth:
      authenticator: bearertokenauth

extensions:
  bearertokenauth:
    # Token value - use environment variable
    token: ${env:WEBHOOK_AUTH_TOKEN}

exporters:
  debug:
    verbosity: detailed

service:
  extensions: [bearertokenauth]
  pipelines:
    logs:
      receivers: [webhook_event]
      exporters: [debug]
```

Send authenticated requests:

```bash
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"event": "deployment"}'
```

### Basic Authentication

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events
    auth:
      authenticator: basicauth

extensions:
  basicauth:
    # htpasswd file with username:password entries
    htpasswd:
      file: /etc/collector/htpasswd
      # inline: "user:$2y$10$..." for inline credentials

exporters:
  debug:
    verbosity: detailed

service:
  extensions: [basicauth]
  pipelines:
    logs:
      receivers: [webhook_event]
      exporters: [debug]
```

Create htpasswd file:

```bash
# Using htpasswd tool
htpasswd -c /etc/collector/htpasswd webhook_user

# Or use bcrypt online generators
# Add to htpasswd file: webhook_user:$2y$10$...
```

Send authenticated requests:

```bash
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -u webhook_user:password \
  -d '{"event": "deployment"}'
```

## Request Mapping

Configure how incoming HTTP requests map to log record attributes.

### Default Mapping

By default, the entire request body becomes the log record body as a string.

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events

    # Limit request body size
    max_request_body_size: 1048576  # 1MB
```

Example request:

```bash
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "deployment",
    "service": "api-gateway",
    "version": "v1.2.3",
    "environment": "production",
    "deployed_by": "john.doe@example.com"
  }'
```

This creates a log record with the entire JSON payload as the string body.

### Extract Headers as Attributes

Extract HTTP headers and add them as log record attributes.

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events

    # Extract matching headers as log attributes named header.<Header-Name>
    header_attribute_regex: "X-Event-Source|X-Event-ID|X-Forwarded-For"

processors:
  # Use transform processor to extract header values
  transform/headers:
    log_statements:
      - context: log
        statements:
          # Extract X-Event-Source header
          - set(log.attributes["event.source"], log.attributes["header.X-Event-Source"][0]) where log.attributes["header.X-Event-Source"] != nil

          # Extract X-Event-ID header
          - set(log.attributes["event.id"], log.attributes["header.X-Event-ID"][0]) where log.attributes["header.X-Event-ID"] != nil

          # Extract client IP from a forwarded header when present
          - set(log.attributes["client.ip"], log.attributes["header.X-Forwarded-For"][0]) where log.attributes["header.X-Forwarded-For"] != nil

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [webhook_event]
      processors: [transform/headers]
      exporters: [debug]
```

Send request with headers:

```bash
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -H "X-Event-Source: github" \
  -H "X-Event-ID: evt_123456" \
  -d '{"event": "deployment"}'
```

## Event Processing

Process webhook events using the transform processor.

### Extract and Structure Event Data

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events

processors:
  # Parse and structure event data
  transform/events:
    log_statements:
      - context: log
        statements:
          # Parse JSON body into the temporary OTTL cache
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")

          # Extract event type from body
          - set(log.attributes["event.type"], log.cache["event_type"]) where log.cache["event_type"] != nil

          # Extract service name
          - set(log.attributes["service.name"], log.cache["service"]) where log.cache["service"] != nil

          # Extract version
          - set(log.attributes["service.version"], log.cache["version"]) where log.cache["version"] != nil

          # Extract environment
          - set(log.attributes["deployment.environment"], log.cache["environment"]) where log.cache["environment"] != nil

          # Extract timestamp
          - set(log.time_unix_nano, UnixNano(Time(log.cache["timestamp"], "%Y-%m-%dT%H:%M:%SZ"))) where log.cache["timestamp"] != nil

          # Set severity based on event type
          - set(log.severity_text, "INFO") where log.attributes["event.type"] == "deployment"
          - set(log.severity_text, "WARN") where log.attributes["event.type"] == "rollback"
          - set(log.severity_text, "ERROR") where log.attributes["event.type"] == "failure"

  # Add resource attributes
  resource:
    attributes:
      - key: source
        value: webhook
        action: upsert
      - key: collector.name
        value: ${env:HOSTNAME}
        action: upsert

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [webhook_event]
      processors: [transform/events, resource]
      exporters: [otlp]
```

## Integration Examples

### GitHub Webhooks

Receive GitHub webhook events.

```yaml
receivers:
  webhook_event/github:
    endpoint: 0.0.0.0:8080
    path: /github/events
    header_attribute_regex: "X-GitHub-Event"

processors:
  transform/github:
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")

          # Extract GitHub event type from header
          - set(log.attributes["github.event"], log.attributes["header.X-GitHub-Event"][0]) where log.attributes["header.X-GitHub-Event"] != nil

          # Extract repository info
          - set(log.attributes["github.repository"], log.cache["repository"]["full_name"]) where log.cache["repository"]["full_name"] != nil

          # Extract sender
          - set(log.attributes["github.sender"], log.cache["sender"]["login"]) where log.cache["sender"]["login"] != nil

          # Handle push events
          - set(log.attributes["git.ref"], log.cache["ref"]) where log.attributes["github.event"] == "push" and log.cache["ref"] != nil
          - set(log.attributes["git.commits.count"], Len(log.cache["commits"])) where log.attributes["github.event"] == "push" and log.cache["commits"] != nil

          # Handle pull request events
          - set(log.attributes["github.pr.number"], log.cache["pull_request"]["number"]) where log.attributes["github.event"] == "pull_request" and log.cache["pull_request"]["number"] != nil
          - set(log.attributes["github.pr.action"], log.cache["action"]) where log.attributes["github.event"] == "pull_request" and log.cache["action"] != nil

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [webhook_event/github]
      processors: [transform/github]
      exporters: [otlp]
```

Configure GitHub webhook:
1. Go to repository Settings > Webhooks
2. Add webhook URL: `http://your-collector:8080/github/events`
3. Set Content type: `application/json`
4. Set Secret only if you verify GitHub's `X-Hub-Signature-256` before the Collector; the receiver does not validate GitHub HMAC signatures by itself
5. Select events: Push, Pull request, Deployment

### CI/CD Pipeline Events

Receive deployment events from Jenkins, GitLab CI, or custom pipelines.

```yaml
receivers:
  webhook_event/cicd:
    endpoint: 0.0.0.0:8080
    path: /cicd/deployments

processors:
  transform/cicd:
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")

          # Extract deployment info
          - set(log.attributes["deployment.service"], log.cache["service"]) where log.cache["service"] != nil
          - set(log.attributes["deployment.version"], log.cache["version"]) where log.cache["version"] != nil
          - set(log.attributes["deployment.environment"], log.cache["environment"]) where log.cache["environment"] != nil
          - set(log.attributes["deployment.status"], log.cache["status"]) where log.cache["status"] != nil

          # Extract pipeline info
          - set(log.attributes["cicd.pipeline"], log.cache["pipeline"]) where log.cache["pipeline"] != nil
          - set(log.attributes["cicd.job"], log.cache["job"]) where log.cache["job"] != nil
          - set(log.attributes["cicd.trigger.user"], log.cache["triggered_by"]) where log.cache["triggered_by"] != nil

          # Extract timing
          - set(log.attributes["deployment.duration_seconds"], log.cache["duration"]) where log.cache["duration"] != nil

          # Set severity based on status
          - set(log.severity_text, "INFO") where log.attributes["deployment.status"] == "success"
          - set(log.severity_text, "ERROR") where log.attributes["deployment.status"] == "failure"

          # Create structured log message
          - set(log.body, Concat([log.attributes["deployment.service"], " version ", log.attributes["deployment.version"], " deployed to ", log.attributes["deployment.environment"], " with status ", log.attributes["deployment.status"]], ""))

  # Add batch processing
  batch:
    timeout: 10s
    send_batch_size: 100

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [webhook_event/cicd]
      processors: [transform/cicd, batch]
      exporters: [otlp]
```

Send deployment event:

```bash
curl -X POST http://localhost:8080/cicd/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "service": "api-gateway",
    "version": "v1.2.3",
    "environment": "production",
    "status": "success",
    "pipeline": "deploy-to-prod",
    "job": "deploy-api-gateway",
    "triggered_by": "john.doe@example.com",
    "duration": 120,
    "timestamp": "2026-02-06T10:30:00Z"
  }'
```

### Monitoring Alert Webhooks

Receive alerts from Prometheus Alertmanager, Grafana, or other monitoring tools.

```yaml
receivers:
  webhook_event/alerts:
    endpoint: 0.0.0.0:8080
    path: /alerts

processors:
  transform/alerts:
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")

          # Handle Alertmanager format
          - set(log.attributes["alert.name"], log.cache["alerts"][0]["labels"]["alertname"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0
          - set(log.attributes["alert.severity"], log.cache["alerts"][0]["labels"]["severity"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0
          - set(log.attributes["alert.status"], log.cache["alerts"][0]["status"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0

          # Extract instance information
          - set(log.attributes["alert.instance"], log.cache["alerts"][0]["labels"]["instance"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0
          - set(log.attributes["alert.job"], log.cache["alerts"][0]["labels"]["job"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0

          # Extract annotations
          - set(log.attributes["alert.summary"], log.cache["alerts"][0]["annotations"]["summary"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0
          - set(log.attributes["alert.description"], log.cache["alerts"][0]["annotations"]["description"]) where log.cache["alerts"] != nil and Len(log.cache["alerts"]) > 0

          # Set severity based on alert severity
          - set(log.severity_text, "WARN") where log.attributes["alert.severity"] == "warning"
          - set(log.severity_text, "ERROR") where log.attributes["alert.severity"] == "critical"

  # Filter to only send critical alerts
  filter/critical:
    error_mode: ignore
    log_conditions:
      - log.attributes["alert.severity"] != "critical"

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    # Pipeline for all alerts
    logs/all:
      receivers: [webhook_event/alerts]
      processors: [transform/alerts]
      exporters: [otlp]

    # Pipeline for critical alerts only
    logs/critical:
      receivers: [webhook_event/alerts]
      processors: [transform/alerts, filter/critical]
      exporters: [otlp]
```

## Multiple Webhook Endpoints

Configure multiple webhook receivers for different event sources.

```yaml
receivers:
  # GitHub events
  webhook_event/github:
    endpoint: 0.0.0.0:8080
    path: /webhooks/github

  # CI/CD events
  webhook_event/cicd:
    endpoint: 0.0.0.0:8081
    path: /webhooks/cicd

  # Monitoring alerts
  webhook_event/alerts:
    endpoint: 0.0.0.0:8082
    path: /webhooks/alerts

  # Custom application events
  webhook_event/custom:
    endpoint: 0.0.0.0:8083
    path: /webhooks/custom

processors:
  # Tag events with source
  transform/source/github:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["event.source"], "github")
  transform/source/cicd:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["event.source"], "cicd")
  transform/source/alerts:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["event.source"], "alerts")
  transform/source/custom:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["event.source"], "custom")

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs/github:
      receivers: [webhook_event/github]
      processors: [transform/source/github]
      exporters: [otlp]
    logs/cicd:
      receivers: [webhook_event/cicd]
      processors: [transform/source/cicd]
      exporters: [otlp]
    logs/alerts:
      receivers: [webhook_event/alerts]
      processors: [transform/source/alerts]
      exporters: [otlp]
    logs/custom:
      receivers: [webhook_event/custom]
      processors: [transform/source/custom]
      exporters: [otlp]
```

## Error Handling

Configure how the receiver responds to errors.

```yaml
receivers:
  webhook_event:
    endpoint: 0.0.0.0:8080
    path: /events

    # Add custom headers to HTTP responses
    response_headers:
      X-Custom-Header: "Webhook-Receiver"

processors:
  # Validate required fields
  transform/validate:
    error_mode: propagate  # Fail pipeline if validation fails
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")

          # Ensure event_type exists
          - set(log.attributes["valid"], true) where log.cache["event_type"] != nil
          - set(log.attributes["valid"], false) where log.cache["event_type"] == nil

  # Drop invalid events
  filter/valid:
    error_mode: ignore
    log_conditions:
      - log.attributes["valid"] != true

exporters:
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}

service:
  pipelines:
    logs:
      receivers: [webhook_event]
      processors: [transform/validate, filter/valid]
      exporters: [otlp]
```

## Complete Production Example

Full configuration with security, processing, and multiple endpoints.

```yaml
extensions:
  # Bearer token authentication
  bearertokenauth:
    token: ${env:WEBHOOK_AUTH_TOKEN}

  # Health check endpoint
  health_check:
    endpoint: 0.0.0.0:13133

receivers:
  # GitHub webhook events
  webhook_event/github:
    endpoint: 0.0.0.0:8443
    path: /webhooks/github
    header_attribute_regex: "X-GitHub-Event"
    tls:
      cert_file: /etc/collector/certs/server.crt
      key_file: /etc/collector/certs/server.key
    max_request_body_size: 5242880  # 5MB

  # CI/CD deployment events
  webhook_event/deployments:
    endpoint: 0.0.0.0:8444
    path: /webhooks/deployments
    auth:
      authenticator: bearertokenauth
    tls:
      cert_file: /etc/collector/certs/server.crt
      key_file: /etc/collector/certs/server.key

processors:
  # Parse GitHub events
  transform/github:
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")
          - set(log.attributes["event.source"], "github")
          - set(log.attributes["github.event"], log.attributes["header.X-GitHub-Event"][0]) where log.attributes["header.X-GitHub-Event"] != nil
          - set(log.attributes["github.repository"], log.cache["repository"]["full_name"]) where log.cache["repository"]["full_name"] != nil
          - set(log.severity_text, "INFO")

  # Parse deployment events
  transform/deployments:
    log_statements:
      - context: log
        statements:
          - merge_maps(log.cache, ParseJSON(log.body), "upsert")
          - set(log.attributes["event.source"], "cicd")
          - set(log.attributes["deployment.service"], log.cache["service"]) where log.cache["service"] != nil
          - set(log.attributes["deployment.environment"], log.cache["environment"]) where log.cache["environment"] != nil
          - set(log.attributes["deployment.status"], log.cache["status"]) where log.cache["status"] != nil
          - set(log.severity_text, "INFO") where log.attributes["deployment.status"] == "success"
          - set(log.severity_text, "ERROR") where log.attributes["deployment.status"] == "failure"

  # Add resource attributes
  resource:
    attributes:
      - key: collector.name
        value: ${env:HOSTNAME}
        action: upsert
      - key: collector.version
        value: ${env:COLLECTOR_VERSION}
        action: upsert

  # Batch for efficiency
  batch:
    timeout: 10s
    send_batch_size: 100

exporters:
  # Send to OTLP backend
  otlp:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}
    headers:
      authorization: Bearer ${env:OTEL_AUTH_TOKEN}
    compression: gzip

  # Debug output (disabled in production)
  debug:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200

service:
  extensions: [bearertokenauth, health_check]

  pipelines:
    # GitHub events pipeline
    logs/github:
      receivers: [webhook_event/github]
      processors: [transform/github, resource, batch]
      exporters: [otlp]

    # Deployment events pipeline
    logs/deployments:
      receivers: [webhook_event/deployments]
      processors: [transform/deployments, resource, batch]
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
| **Endpoint** | Host, port, and URL path |
| **Authentication** | Bearer token, basic auth, custom |
| **TLS** | Certificate and key files |
| **Processing** | Transform, filter, enrich events |
| **Integration** | GitHub, CI/CD, monitoring tools |
| **Error Handling** | Validation, filtering, response codes |

The Webhook Event Receiver enables event collection from any system that can send HTTP POST requests. Combined with transform processors, you can normalize events from diverse sources into structured OpenTelemetry logs, providing unified observability across your entire toolchain.

For more on processing webhook events, see our guides on [transform processor](https://oneuptime.com/blog/post/2026-02-06-transform-processor-opentelemetry-collector/view) and [filter processor](https://oneuptime.com/blog/post/2026-02-06-filter-processor-opentelemetry-collector/view).

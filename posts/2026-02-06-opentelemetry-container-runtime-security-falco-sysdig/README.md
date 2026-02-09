# How to Use OpenTelemetry to Monitor Container Runtime Security Events (Falco and Sysdig Integration)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Falco, Sysdig, Container Security

Description: Integrate Falco and Sysdig container runtime security events with OpenTelemetry to correlate system-level threats with application traces.

Container runtime security tools like Falco and Sysdig detect suspicious system-level activity: unexpected processes spawning inside containers, file system modifications in read-only paths, network connections to unusual destinations, and privilege escalation attempts. These are critical security signals, but they exist in isolation from your application telemetry.

By routing Falco and Sysdig alerts into the OpenTelemetry pipeline, you can correlate container runtime security events with your application traces and logs. When Falco detects a shell spawning inside your API container, you can see which request triggered it.

## Integrating Falco with OpenTelemetry

Falco can output alerts in multiple formats. The approach here is to configure Falco to write alerts as JSON to stdout, collect them with the OpenTelemetry Collector filelog receiver, and enrich them with Kubernetes metadata.

### Falco Configuration

Configure Falco to output JSON alerts:

```yaml
# falco.yaml
json_output: true
json_include_output_property: true
json_include_tags_property: true

# Output to stdout (collected by the OTel Collector)
stdout_output:
  enabled: true

# Also output via HTTP to the Collector directly
http_output:
  enabled: true
  url: "http://otel-collector.observability:4318/v1/logs"

# Custom rules for container-specific detection
rules:
  - rule: Shell Spawned in Container
    desc: Detect shell execution in a running container
    condition: >
      spawned_process and container and
      proc.name in (bash, sh, zsh, dash, ksh)
    output: >
      Shell spawned in container
      (user=%user.name container=%container.name
       image=%container.image.repository
       pod=%k8s.pod.name namespace=%k8s.ns.name
       command=%proc.cmdline)
    priority: WARNING
    tags: [container, shell]

  - rule: Write Below Binary Dir
    desc: Detect file writes to binary directories
    condition: >
      open_write and container and
      fd.directory in (/bin, /sbin, /usr/bin, /usr/sbin)
    output: >
      File written to binary directory
      (user=%user.name file=%fd.name container=%container.name
       pod=%k8s.pod.name)
    priority: ERROR
    tags: [container, filesystem]
```

### Collector Configuration for Falco Events

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Collect Falco JSON output from container stdout
  filelog/falco:
    include:
      - /var/log/containers/falco-*.log
    operators:
      - type: json_parser
        parse_from: body
      - type: json_parser
        parse_from: attributes.log
        timestamp:
          parse_from: attributes.output_fields.evt.time
          layout: '%Y-%m-%dT%H:%M:%S.%f'

processors:
  # Map Falco fields to OTel semantic conventions
  transform/falco:
    log_statements:
      - context: log
        statements:
          - set(attributes["security.tool"], "falco")
          - set(attributes["security.rule"], attributes["rule"])
          - set(attributes["security.priority"], attributes["priority"])
          - set(attributes["k8s.pod.name"],
              attributes["output_fields"]["k8s.pod.name"])
          - set(attributes["k8s.namespace.name"],
              attributes["output_fields"]["k8s.ns.name"])
          - set(attributes["container.name"],
              attributes["output_fields"]["container.name"])
          - set(attributes["container.image.name"],
              attributes["output_fields"]["container.image.repository"])
          - set(attributes["process.command"],
              attributes["output_fields"]["proc.cmdline"])

  # Add Kubernetes metadata
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
      labels:
        - tag_name: app
          key: app
          from: pod

exporters:
  otlp:
    endpoint: "https://otel-backend:4317"

service:
  pipelines:
    logs/falco:
      receivers: [filelog/falco]
      processors: [transform/falco, k8sattributes]
      exporters: [otlp]
    # Regular application telemetry
    traces:
      receivers: [otlp]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      exporters: [otlp]
```

## Integrating Sysdig with OpenTelemetry

Sysdig Secure can forward events via webhook. Set up a small adapter service that converts Sysdig webhook payloads into OTLP log records:

```python
from flask import Flask, request
from opentelemetry import trace
from opentelemetry.sdk._logs import LoggerProvider, LogRecord
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry._logs import set_logger_provider
import time

app = Flask(__name__)

# Set up the OTel log exporter
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(
        endpoint="otel-collector.observability:4317",
        insecure=True,
    ))
)
set_logger_provider(logger_provider)
otel_logger = logger_provider.get_logger("sysdig-adapter")

@app.route("/webhook/sysdig", methods=["POST"])
def handle_sysdig_event():
    """
    Receives Sysdig Secure webhook events and forwards
    them as OpenTelemetry log records.
    """
    payload = request.json

    for event in payload.get("entities", []):
        policy = event.get("policyName", "unknown")
        severity_str = event.get("severity", "4")

        # Map Sysdig severity (0-7) to OTel severity
        severity_map = {
            "0": 21,  # FATAL -> OTel FATAL
            "1": 17,  # ERROR -> OTel ERROR
            "2": 17,
            "3": 13,  # WARNING -> OTel WARN
            "4": 13,
            "5": 9,   # INFO -> OTel INFO
            "6": 9,
            "7": 5,   # DEBUG -> OTel DEBUG
        }

        otel_logger.emit(LogRecord(
            timestamp=int(time.time() * 1e9),
            severity_number=severity_map.get(severity_str, 9),
            body=event.get("description", "Sysdig security event"),
            attributes={
                "security.tool": "sysdig",
                "security.rule": policy,
                "security.severity": severity_str,
                "k8s.pod.name": event.get("containerId", ""),
                "k8s.namespace.name": event.get("namespace", ""),
                "container.image.name": event.get("imageName", ""),
                "process.command": event.get("processName", ""),
                "security.event_type": event.get("type", "policy_violation"),
            },
        ))

    return {"status": "ok"}, 200
```

## Correlating Runtime Events with Application Traces

The real value comes from correlating Falco/Sysdig events with your application traces. When a runtime security event fires, you want to know what was happening in your application at that moment.

Query your backend to find traces that overlap with runtime events for the same pod:

```sql
-- Find application traces that were active when
-- a Falco event fired in the same pod
SELECT
  t.trace_id,
  t.root_span_name,
  t.duration_ms,
  f.body AS falco_alert,
  f.attributes['security.rule'] AS falco_rule,
  f.attributes['process.command'] AS suspicious_process
FROM traces t
JOIN logs f ON
  t.resource_attributes['k8s.pod.name'] = f.attributes['k8s.pod.name']
  AND f.timestamp BETWEEN t.start_time AND t.end_time
  AND f.attributes['security.tool'] = 'falco'
WHERE
  t.start_time > NOW() - INTERVAL '1 hour'
ORDER BY f.timestamp DESC;
```

This query answers the question: "When Falco detected a shell spawning in the API pod, which HTTP request was being processed?" That correlation turns a generic runtime alert into an actionable security incident.

## Summary

Falco and Sysdig detect threats at the container runtime level that application-level instrumentation cannot see. By routing their events into the OpenTelemetry pipeline, you get a unified view of security across all layers. The Collector handles the format conversion and enrichment, and your observability backend provides the correlation. The result is that when a container runtime threat fires, you immediately know what was happening in the application, making incident response faster and more targeted.

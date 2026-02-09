# How to Forward OpenTelemetry Security Events to AWS Security Hub Using the Collector Exporter Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AWS, Security Hub, Collector

Description: Set up an OpenTelemetry Collector pipeline that forwards security-related telemetry events to AWS Security Hub for centralized threat management.

AWS Security Hub is a central place for aggregating security findings from across your AWS environment. But what about application-level security events? Things like failed authentication attempts, rate limiting triggers, and suspicious request patterns often live in application telemetry, disconnected from your cloud security posture.

This post shows you how to bridge that gap by building an OpenTelemetry Collector pipeline that filters security events from your telemetry stream and forwards them to AWS Security Hub as findings.

## Architecture Overview

The flow looks like this:

1. Your application emits traces and logs via the OpenTelemetry SDK.
2. The OpenTelemetry Collector receives this telemetry.
3. A filter processor isolates security-relevant events.
4. A custom exporter (or the AWS CloudWatch exporter combined with a Lambda function) pushes findings to Security Hub.

Since there is no native Security Hub exporter in the Collector, we will use the AWS CloudWatch Logs exporter as an intermediary, then trigger a Lambda function that converts log entries into Security Hub findings.

## Collector Configuration

Start with a Collector config that receives OTLP data and filters for security events:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Filter to only keep logs with security-related attributes
  filter/security:
    logs:
      include:
        match_type: regexp
        record_attributes:
          - key: security.event_type
            value: ".*"

  # Add resource attributes for Security Hub mapping
  attributes/security:
    actions:
      - key: aws.security_hub.product_arn
        value: "arn:aws:securityhub:us-east-1:123456789012:product/123456789012/default"
        action: upsert
      - key: aws.security_hub.generator_id
        value: "opentelemetry-security-pipeline"
        action: upsert

exporters:
  awscloudwatchlogs:
    log_group_name: "/opentelemetry/security-events"
    log_stream_name: "security-findings"
    region: "us-east-1"

  # Also export to your regular observability backend
  otlp/backend:
    endpoint: "https://otel.yourdomain.com:4317"

service:
  pipelines:
    logs/security:
      receivers: [otlp]
      processors: [filter/security, attributes/security]
      exporters: [awscloudwatchlogs, otlp/backend]

    # Regular telemetry pipeline for everything else
    traces:
      receivers: [otlp]
      exporters: [otlp/backend]
    logs:
      receivers: [otlp]
      exporters: [otlp/backend]
```

## Emitting Security Events from Your Application

In your application, tag security-related log records with the `security.event_type` attribute so the Collector filter can pick them up:

```python
import logging
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LogRecord
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up the OTel logger provider
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter())
)
set_logger_provider(logger_provider)

otel_logger = logger_provider.get_logger("security-events")

def record_security_event(event_type, severity, details):
    """
    Emit a structured security event as an OTel log record.
    The security.event_type attribute ensures the Collector
    filter processor routes this to the security pipeline.
    """
    otel_logger.emit(LogRecord(
        body=details.get("message", "Security event"),
        attributes={
            "security.event_type": event_type,
            "security.severity": severity,
            "security.source_ip": details.get("source_ip", "unknown"),
            "security.user_id": details.get("user_id", "anonymous"),
            "security.endpoint": details.get("endpoint", ""),
            "security.details": str(details),
        },
    ))

# Example usage in an authentication handler
def login_handler(request):
    user = authenticate(request.username, request.password)
    if not user:
        record_security_event(
            event_type="authentication.failure",
            severity="MEDIUM",
            details={
                "message": f"Failed login attempt for user {request.username}",
                "source_ip": request.remote_addr,
                "user_id": request.username,
                "endpoint": "/api/login",
                "failure_reason": "invalid_credentials",
            }
        )
        return {"error": "Invalid credentials"}, 401
```

## Lambda Function for Security Hub Integration

The Lambda function subscribes to the CloudWatch log group and converts each security event into a Security Hub finding:

```python
import json
import base64
import gzip
import boto3
from datetime import datetime

securityhub = boto3.client('securityhub')

def lambda_handler(event, context):
    """
    Triggered by CloudWatch Logs subscription filter.
    Converts OpenTelemetry security events into
    AWS Security Hub findings.
    """
    # Decode and decompress the CloudWatch Logs payload
    payload = base64.b64decode(event['awslogs']['data'])
    log_data = json.loads(gzip.decompress(payload))

    findings = []

    for log_event in log_data['logEvents']:
        message = json.loads(log_event['message'])
        attrs = message.get('attributes', {})

        # Map OTel severity to Security Hub severity
        severity_map = {
            "LOW": 20,
            "MEDIUM": 50,
            "HIGH": 70,
            "CRITICAL": 90,
        }

        finding = {
            "SchemaVersion": "2018-10-08",
            "Id": f"otel-{log_event['id']}",
            "ProductArn": attrs.get("aws.security_hub.product_arn"),
            "GeneratorId": attrs.get("aws.security_hub.generator_id"),
            "AwsAccountId": context.invoked_function_arn.split(":")[4],
            "Types": [f"Software and Configuration Checks/{attrs.get('security.event_type', 'unknown')}"],
            "CreatedAt": datetime.utcnow().isoformat() + "Z",
            "UpdatedAt": datetime.utcnow().isoformat() + "Z",
            "Severity": {
                "Normalized": severity_map.get(attrs.get("security.severity", "LOW"), 20),
            },
            "Title": f"OTel Security Event: {attrs.get('security.event_type')}",
            "Description": message.get("body", "No description"),
            "Resources": [{
                "Type": "Other",
                "Id": attrs.get("security.endpoint", "unknown"),
            }],
        }
        findings.append(finding)

    # Batch import findings into Security Hub
    if findings:
        response = securityhub.batch_import_findings(Findings=findings)
        print(f"Imported {response['SuccessCount']} findings, "
              f"failed {response['FailedCount']}")

    return {"statusCode": 200}
```

## Setting Up the CloudWatch Subscription

Connect the CloudWatch log group to the Lambda function:

```bash
# Create the subscription filter that triggers the Lambda
aws logs put-subscription-filter \
  --log-group-name "/opentelemetry/security-events" \
  --filter-name "security-hub-forwarder" \
  --filter-pattern '{ $.attributes.security.event_type = "*" }' \
  --destination-arn "arn:aws:lambda:us-east-1:123456789012:function:otel-to-securityhub"
```

## What You Get

With this pipeline running, every security event your application emits through OpenTelemetry shows up as a finding in AWS Security Hub. This means your security team can see application-layer threats alongside infrastructure findings from GuardDuty, Inspector, and other AWS security services, all in one place.

The key advantage is that developers instrument security events using the same OpenTelemetry APIs they already use for observability. There is no separate security SDK or logging framework to learn. The Collector pipeline handles the routing, and the Lambda handles the format conversion.

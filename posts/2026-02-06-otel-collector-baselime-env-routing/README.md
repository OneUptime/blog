# How to Configure the OpenTelemetry Collector to Export to Baselime with

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Baselime, Environment Routing

Description: Configure the OpenTelemetry Collector to export traces and logs to Baselime with routing based on deployment environment and API key auth.

If you run the OpenTelemetry Collector as a sidecar or gateway alongside your serverless functions or containers, you can offload the export logic from your application code. This post shows how to configure the Collector to route data to different Baselime environments based on deployment attributes.

## Basic Collector to Baselime Configuration

```yaml
# otel-collector-baselime.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 2s
    send_batch_size: 256

  resource:
    attributes:
      - key: cloud.provider
        value: "aws"
        action: upsert

exporters:
  otlphttp/baselime:
    endpoint: "https://otel.baselime.io"
    headers:
      x-api-key: "${env:BASELIME_API_KEY}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 15s
      max_elapsed_time: 60s
    timeout: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/baselime]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/baselime]
```

## Environment-Based Routing

Route production, staging, and development data to separate Baselime environments (each with its own API key):

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 2s

connectors:
  # Route based on the deployment.environment resource attribute
  routing/traces:
    default_pipelines: [traces/baselime-prod]
    table:
      - context: resource
        condition: attributes["deployment.environment"] == "production"
        pipelines: [traces/baselime-prod]
      - context: resource
        condition: attributes["deployment.environment"] == "staging"
        pipelines: [traces/baselime-staging]
      - context: resource
        condition: attributes["deployment.environment"] == "development"
        pipelines: [traces/baselime-dev]

  routing/logs:
    default_pipelines: [logs/baselime-prod]
    table:
      - context: resource
        condition: attributes["deployment.environment"] == "production"
        pipelines: [logs/baselime-prod]
      - context: resource
        condition: attributes["deployment.environment"] == "staging"
        pipelines: [logs/baselime-staging]
      - context: resource
        condition: attributes["deployment.environment"] == "development"
        pipelines: [logs/baselime-dev]

exporters:
  otlphttp/baselime-prod:
    endpoint: "https://otel.baselime.io"
    headers:
      x-api-key: "${env:BASELIME_PROD_API_KEY}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s

  otlphttp/baselime-staging:
    endpoint: "https://otel.baselime.io"
    headers:
      x-api-key: "${env:BASELIME_STAGING_API_KEY}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s

  otlphttp/baselime-dev:
    endpoint: "https://otel.baselime.io"
    headers:
      x-api-key: "${env:BASELIME_DEV_API_KEY}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing/traces]

    traces/baselime-prod:
      receivers: [routing/traces]
      exporters: [otlphttp/baselime-prod]

    traces/baselime-staging:
      receivers: [routing/traces]
      exporters: [otlphttp/baselime-staging]

    traces/baselime-dev:
      receivers: [routing/traces]
      exporters: [otlphttp/baselime-dev]

    logs/in:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing/logs]

    logs/baselime-prod:
      receivers: [routing/logs]
      exporters: [otlphttp/baselime-prod]

    logs/baselime-staging:
      receivers: [routing/logs]
      exporters: [otlphttp/baselime-staging]

    logs/baselime-dev:
      receivers: [routing/logs]
      exporters: [otlphttp/baselime-dev]
```

## Enriching Serverless Telemetry

Add serverless-specific context before sending to Baselime:

```yaml
processors:
  resource/serverless:
    attributes:
      - key: cloud.provider
        value: "aws"
        action: upsert
      - key: cloud.region
        value: "${env:AWS_REGION}"
        action: upsert
      - key: cloud.platform
        value: "aws_lambda"
        action: upsert

  transform/lambda:
    trace_statements:
      - context: span
        statements:
          # Tag cold starts for easy filtering in Baselime
          - set(span.attributes["baselime.alert_worthy"], true)
            where span.attributes["faas.coldstart"] == true
              and (span.end_time - span.start_time) > Duration("3s")

  # Drop internal Lambda extension spans that add noise
  filter/noise:
    trace_conditions:
      - 'span.name == "LambdaExtension.Invoke"'
      - 'span.name == "LambdaRuntime.Invoke"'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource/serverless, filter/noise, transform/lambda, batch]
      exporters: [otlphttp/baselime-prod]
```

## ECS Sidecar Deployment

Deploy the Collector as an ECS sidecar alongside your Lambda-invoked containers:

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "my-app:latest",
      "environment": [
        {"name": "OTEL_EXPORTER_OTLP_ENDPOINT", "value": "http://localhost:4317"}
      ]
    },
    {
      "name": "otel-collector",
      "image": "otel/opentelemetry-collector-contrib:latest",
      "command": ["--config", "/etc/otel/config.yaml"],
      "secrets": [
        {
          "name": "BASELIME_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456:secret:baselime-api-key"
        }
      ],
      "portMappings": [
        {"containerPort": 4317, "protocol": "tcp"},
        {"containerPort": 4318, "protocol": "tcp"}
      ]
    }
  ]
}
```

## Sampling for Cost Control

Sampling high-volume environments is useful for controlling ingestion volume:

```yaml
processors:
  # Tail sampling: keep errors and slow requests, sample the rest
  tail_sampling:
    decision_wait: 5s
    policies:
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: keep-slow
        type: latency
        latency:
          threshold_ms: 2000
      - name: keep-cold-starts
        type: boolean_attribute
        boolean_attribute:
          key: faas.coldstart
          value: true
      - name: sample-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 20
```

## Verifying in Baselime

After deploying, check the Baselime console for incoming data. You should see:
- Traces organized by service name
- Logs correlated with trace IDs
- Lambda invocation patterns with cold start markers

If data is not appearing, check the Collector logs for authentication errors. The most common issue is an incorrect or expired API key.

Using the Collector as a gateway to Baselime lets you handle environment routing, sampling, and enrichment outside your application code. Your Lambda functions stay focused on business logic with minimal instrumentation overhead.

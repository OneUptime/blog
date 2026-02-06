# How to Configure the OpenTelemetry Java Agent Using YAML Declarative Configuration Instead of System Properties

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java Agent, YAML Configuration, JVM

Description: Configure the OpenTelemetry Java agent with YAML declarative configuration files instead of verbose system properties and env vars.

The OpenTelemetry Java agent is one of the most popular ways to instrument JVM applications without changing code. But configuring it has traditionally meant passing a long list of `-D` system properties or setting dozens of environment variables. With declarative configuration support now available in the Java agent, you can replace all of that with a clean YAML file.

## The Old Way: System Properties

Here is what a typical Java agent startup command looks like with system properties:

```bash
java \
  -javaagent:/opt/opentelemetry-javaagent.jar \
  -Dotel.service.name=inventory-service \
  -Dotel.exporter.otlp.endpoint=http://collector:4317 \
  -Dotel.exporter.otlp.protocol=grpc \
  -Dotel.traces.sampler=parentbased_traceidratio \
  -Dotel.traces.sampler.arg=0.2 \
  -Dotel.metrics.exporter=otlp \
  -Dotel.logs.exporter=otlp \
  -Dotel.resource.attributes=deployment.environment=production,service.version=3.1.0 \
  -Dotel.instrumentation.http.server.capture-request-headers=X-Request-ID,X-Tenant-ID \
  -Dotel.instrumentation.jdbc.statement-sanitizer.enabled=true \
  -jar inventory-service.jar
```

This is hard to read, hard to diff in code review, and easy to get wrong. A single typo in a property name silently fails since the agent just ignores unknown properties.

## The New Way: YAML Configuration

With declarative configuration, all of the above collapses into a YAML file and a single system property:

```bash
java \
  -javaagent:/opt/opentelemetry-javaagent.jar \
  -Dotel.experimental.config.file=/etc/otel/agent-config.yaml \
  -jar inventory-service.jar
```

Here is the YAML file:

```yaml
# /etc/otel/agent-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "inventory-service"
    service.version: "3.1.0"
    deployment.environment: "production"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.2

meter_provider:
  readers:
    - periodic:
        interval: 60000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]

# Java agent specific: instrumentation configuration
instrumentation:
  java:
    http:
      server:
        capture_request_headers:
          - "X-Request-ID"
          - "X-Tenant-ID"
    jdbc:
      statement_sanitizer:
        enabled: true
```

## Java Agent Version Requirements

Declarative configuration support was added in the OpenTelemetry Java agent version 2.x series. Make sure you are running a recent version:

```bash
# Check your agent version
java -javaagent:/opt/opentelemetry-javaagent.jar -version

# Download the latest agent
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

## Configuring Instrumentation-Specific Settings

One of the biggest advantages of the YAML format for the Java agent is how cleanly it handles instrumentation-specific settings. With system properties, these get deeply nested and hard to parse visually:

```yaml
# Instrumentation-specific configuration
instrumentation:
  java:
    # HTTP client and server settings
    http:
      server:
        capture_request_headers:
          - "X-Request-ID"
          - "X-Correlation-ID"
        capture_response_headers:
          - "X-Cache-Status"
      client:
        capture_request_headers:
          - "Authorization"  # captured but redacted in the agent

    # Database instrumentation
    jdbc:
      statement_sanitizer:
        enabled: true  # replaces literal values with ?

    # Kafka instrumentation
    kafka:
      producer:
        propagation:
          enabled: true
      consumer:
        propagation:
          enabled: true

    # gRPC instrumentation
    grpc:
      capture_metadata:
        server:
          request: ["x-tenant-id"]

    # Suppress specific instrumentations entirely
    disabled_instrumentations:
      - "spring-scheduling"  # noisy periodic tasks
      - "aws-sdk-2.2-sqs"   # handled by custom instrumentation
```

## Using Environment Variables for Secrets

You still want to keep secrets out of your YAML files. Use the `${ENV_VAR}` substitution syntax for anything sensitive:

```yaml
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT}"
            headers:
              Authorization: "Bearer ${OTEL_AUTH_TOKEN}"
```

Then pass only the sensitive values as environment variables or Kubernetes secrets:

```yaml
# k8s deployment snippet
env:
  - name: OTEL_COLLECTOR_ENDPOINT
    value: "http://otel-collector:4317"
  - name: OTEL_AUTH_TOKEN
    valueFrom:
      secretKeyRef:
        name: otel-credentials
        key: auth-token
```

## Spring Boot Integration

For Spring Boot applications, you can load the config file path from your `application.yml`:

```yaml
# application.yml
otel:
  config-file: "${OTEL_CONFIG_FILE:/etc/otel/agent-config.yaml}"
```

Then reference it in your JVM arguments:

```bash
java \
  -javaagent:/opt/opentelemetry-javaagent.jar \
  -Dotel.experimental.config.file=${OTEL_CONFIG_FILE} \
  -jar my-spring-app.jar
```

## Gradle and Maven Development Setup

During local development, you want a different configuration than production. Set up a dev-specific config:

```yaml
# config/otel-dev.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "inventory-service"
    deployment.environment: "development"

tracer_provider:
  processors:
    - simple:  # no batching in dev for immediate export
        exporter:
          otlp:
            endpoint: "http://localhost:4317"
            protocol: "grpc"
  sampler:
    always_on: {}  # sample everything in dev

logger_provider:
  processors:
    - simple:
        exporter:
          console: {}  # print logs to stdout in dev
```

Configure Gradle to use it:

```groovy
// build.gradle
tasks.named('bootRun') {
    jvmArgs = [
        "-javaagent:${project.rootDir}/libs/opentelemetry-javaagent.jar",
        "-Dotel.experimental.config.file=${project.rootDir}/config/otel-dev.yaml"
    ]
}
```

## Wrapping Up

Switching the OpenTelemetry Java agent from system properties to YAML declarative configuration is straightforward and immediately improves readability. Your observability configuration becomes version-controlled, reviewable, and consistent across your JVM services. Start with a single service, validate the YAML against the schema in CI, and roll it out gradually. The agent falls back to environment variables and system properties for any settings not covered in the file, so you can migrate incrementally.

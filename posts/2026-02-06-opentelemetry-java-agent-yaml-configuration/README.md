# Configure OpenTelemetry Java Agent Properties via YAML Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java Agent, YAML, Configuration, Declarative

Description: Master the declarative YAML configuration system for the OpenTelemetry Java agent to manage complex instrumentation settings with version control and maintainability.

Managing Java agent configuration through command-line arguments or environment variables becomes unwieldy as your observability requirements grow. The OpenTelemetry Java agent 2.26.0 and later supports experimental declarative YAML configuration files that centralize settings, support comments and documentation, integrate with version control, and make complex configurations maintainable.

## Why Use YAML Configuration?

Command-line configurations work for simple cases, but YAML offers significant advantages for production environments:

- **Maintainability**: Keep all settings in one place with clear structure
- **Documentation**: Add comments explaining why settings exist
- **Version control**: Track configuration changes through Git
- **Validation**: Catch syntax errors before deployment
- **Complexity management**: Handle nested configurations naturally
- **Team collaboration**: Easier to review and understand than long command lines

## Configuration File Location

The agent can read a declarative configuration file when you specify the file location using the `otel.config.file` property:

```bash
# Specify declarative configuration file location

java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=/etc/otel/agent-config.yaml \
  -jar your-application.jar
```

Alternative methods for specifying the configuration file:

```bash
# Using environment variable
export OTEL_CONFIG_FILE=/etc/otel/agent-config.yaml
java -javaagent:opentelemetry-javaagent.jar -jar your-application.jar

# Using relative path (relative to working directory)
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=./config/otel-config.yaml \
  -jar your-application.jar
```

Note: `otel.javaagent.configuration-file` is for a Java properties file, not declarative YAML.

## Basic YAML Configuration Structure

A minimal configuration file includes service identification and exporter settings:

```yaml
# otel-config.yaml - Basic configuration
file_format: "1.1"

# Service identification and resource attributes
resource:
  attributes:
    - name: service.name
      value: payment-service
    - name: service.version
      value: 1.2.3
    - name: deployment.environment.name
      value: production
    - name: service.namespace
      value: payments
    - name: team
      value: platform-engineering

# Trace configuration
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://otel-collector:4318/v1/traces
            timeout: 10000  # milliseconds
```

Start your application with this configuration:

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=otel-config.yaml \
  -jar payment-service.jar
```

## Comprehensive Configuration Example

A production-ready configuration covers traces, metrics, logs, and sampling:

```yaml
# production-otel-config.yaml
# Complete OpenTelemetry Java agent configuration for production
file_format: "1.1"
log_level: info

# Service identification
# These attributes identify your service in the observability backend
resource:
  attributes:
    - name: service.name
      value: payment-service
    - name: service.version
      value: ${APP_VERSION:-1.0.0}  # Support environment variable substitution
    - name: service.instance.id
      value: ${HOSTNAME:-unknown}
    - name: deployment.environment.name
      value: production
    - name: deployment.region
      value: us-east-1
    - name: service.namespace
      value: payments
    - name: service.team
      value: platform-engineering
    - name: host.name
      value: ${HOSTNAME}
    - name: host.type
      value: container
    - name: cloud.provider
      value: aws
    - name: cloud.region
      value: us-east-1

# Propagators configuration
# Controls how trace context is propagated across service boundaries
propagator:
  composite:
    - tracecontext:  # W3C Trace Context (recommended)
    - baggage:       # W3C Baggage
    - b3multi:       # Zipkin B3 multi-header (for legacy systems)

# Trace configuration
tracer_provider:
  # Sampling configuration
  # Parent-based sampling respects upstream sampling decisions
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1  # Sample 10% of root traces
  processors:
    - batch:
        # Maximum time to wait before exporting
        schedule_delay: 5000

        # Maximum number of spans in queue
        max_queue_size: 2048

        # Maximum batch size for export
        max_export_batch_size: 512

        # Timeout for export operation
        export_timeout: 30000

        exporter:
          otlp_http:
            # Collector endpoint for traces
            endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/traces

            # Timeout for export requests
            timeout: 10000

            # Compression (none, gzip)
            compression: gzip

            # Authentication headers
            headers:
              - name: api-key
                value: ${OTEL_API_KEY}  # Load from environment
              - name: x-tenant-id
                value: payments-team

# Metrics configuration
meter_provider:
  exemplar_filter: trace_based  # Link metrics to traces when sampled context is available
  readers:
    - periodic:
        # Metrics export interval in milliseconds
        interval: 60000
        exporter:
          otlp_http:
            endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/metrics
            timeout: 10000
            compression: gzip
            headers:
              - name: api-key
                value: ${OTEL_API_KEY}
              - name: x-tenant-id
                value: payments-team

# Logs configuration
logger_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/logs
            timeout: 10000
            compression: gzip
            headers:
              - name: api-key
                value: ${OTEL_API_KEY}
              - name: x-tenant-id
                value: payments-team

# Instrumentation configuration
# Control which libraries are instrumented
distribution:
  javaagent:
    instrumentation:
      default_enabled: true

instrumentation/development:
  general:
    http:
      client:
        # Capture request and response headers
        request_captured_headers:
          - User-Agent
          - X-Request-Id
        response_captured_headers:
          - X-Response-Time
      server:
        request_captured_headers:
          - User-Agent
          - X-Request-Id
          - Content-Type
  java:
    common:
      database:
        statement_sanitizer:
          enabled: true
```

Agent startup options, such as debug logging and extension loading, still need system properties or environment variables because they are read before the declarative configuration file is loaded:

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=production-otel-config.yaml \
  -Dotel.javaagent.debug=false \
  -Dotel.javaagent.logging=simple \
  -Dotel.javaagent.extensions=/opt/otel-extensions \
  -jar payment-service.jar
```

## Environment-Specific Configurations

Maintain separate configuration files for different environments:

```yaml
# development-otel-config.yaml
# Development environment with console export and 100% sampling
file_format: "1.1"
log_level: debug

resource:
  attributes:
    - name: service.name
      value: payment-service
    - name: service.version
      value: dev
    - name: deployment.environment.name
      value: development

tracer_provider:
  sampler:
    always_on:
  processors:
    - simple:
        exporter:
          console:

meter_provider:
  readers:
    - periodic:
        exporter:
          console:

logger_provider:
  processors:
    - simple:
        exporter:
          console:
```

```yaml
# staging-otel-config.yaml
# Staging environment configuration
file_format: "1.1"

resource:
  attributes:
    - name: service.name
      value: payment-service
    - name: service.version
      value: ${APP_VERSION}
    - name: deployment.environment.name
      value: staging

tracer_provider:
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.5  # 50% sampling in staging
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://otel-collector.staging:4318/v1/traces

meter_provider:
  readers:
    - periodic:
        interval: 30000  # More frequent in staging
        exporter:
          otlp_http:
            endpoint: http://otel-collector.staging:4318/v1/metrics

logger_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://otel-collector.staging:4318/v1/logs
```

Select configuration based on environment:

```bash
# Development
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=development-otel-config.yaml \
  -Dotel.javaagent.debug=true \
  -jar payment-service.jar

# Staging
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=staging-otel-config.yaml \
  -jar payment-service.jar

# Production
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=production-otel-config.yaml \
  -jar payment-service.jar
```

## Docker Integration

Mount configuration files as volumes in Docker containers:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Download OpenTelemetry agent
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.26.0/opentelemetry-javaagent.jar \
  /app/opentelemetry-javaagent.jar

# Copy application JAR
COPY target/payment-service.jar /app/app.jar

# Configuration will be mounted at runtime
ENV OTEL_CONFIG_FILE=/etc/otel/config.yaml

ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "/app/app.jar"]
```

Run container with mounted configuration:

```bash
# Mount configuration file
docker run -v $(pwd)/otel-config.yaml:/etc/otel/config.yaml \
  -e OTEL_API_KEY=your-secret-key \
  payment-service:latest
```

## Kubernetes ConfigMap Integration

Store configuration in Kubernetes ConfigMaps for easy updates:

```yaml
# otel-agent-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config
  namespace: production
data:
  config.yaml: |
    file_format: "1.1"

    resource:
      attributes:
        - name: service.name
          value: payment-service
        - name: service.version
          value: 1.2.3
        - name: deployment.environment.name
          value: production
        - name: service.namespace
          value: payments

    propagator:
      composite:
        - tracecontext:
        - baggage:

    tracer_provider:
      sampler:
        parent_based:
          root:
            trace_id_ratio_based:
              ratio: 0.1
      processors:
        - batch:
            schedule_delay: 5000
            max_queue_size: 2048
            max_export_batch_size: 512
            exporter:
              otlp_http:
                endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/traces
                compression: gzip

    meter_provider:
      readers:
        - periodic:
            interval: 60000
            exporter:
              otlp_http:
                endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/metrics
                compression: gzip

    logger_provider:
      processors:
        - batch:
            exporter:
              otlp_http:
                endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/logs
                compression: gzip

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:1.2.3
        ports:
        - containerPort: 8080
        env:
        - name: OTEL_CONFIG_FILE
          value: /etc/otel/config.yaml
        - name: OTEL_API_KEY
          valueFrom:
            secretKeyRef:
              name: otel-secrets
              key: api-key
        volumeMounts:
        - name: otel-config
          mountPath: /etc/otel
          readOnly: true
      volumes:
      - name: otel-config
        configMap:
          name: otel-agent-config
          items:
          - key: config.yaml
            path: config.yaml
```

Apply the configuration:

```bash
# Deploy ConfigMap and application
kubectl apply -f otel-agent-configmap.yaml

# Update configuration without redeploying pods
kubectl edit configmap otel-agent-config -n production

# Restart pods to pick up new configuration
kubectl rollout restart deployment payment-service -n production
```

## Advanced Sampling Strategies

Configure sampling strategies in YAML:

```yaml
# advanced-sampling-config.yaml
file_format: "1.1"

tracer_provider:
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1
```

The Java agent supports declarative configuration for the standard SDK sampler components, including `always_on`, `always_off`, `trace_id_ratio_based`, and `parent_based`:

```yaml
# Always sample
tracer_provider:
  sampler:
    always_on:
```

```yaml
# Never sample
tracer_provider:
  sampler:
    always_off:
```

```yaml
# Sample based on trace ID ratio
tracer_provider:
  sampler:
    trace_id_ratio_based:
      ratio: 0.1
```

```yaml
# Parent-based sampling with trace ID ratio for root traces
tracer_provider:
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1
```

## Selective Instrumentation Configuration

Fine-tune which libraries are instrumented:

```yaml
# selective-instrumentation-config.yaml
file_format: "1.1"

distribution:
  javaagent:
    instrumentation:
      # Disable all instrumentations by default
      default_enabled: false

      # Enable only what you need
      enabled:
        - spring_webmvc
        - jdbc
        - kafka
        - redis

      # Keep others disabled
      disabled:
        - netty
        - grpc
```

This reduces overhead and startup time when you don't need comprehensive instrumentation.

## HTTP Header Capture Configuration

Control which HTTP headers are captured in spans:

```yaml
# http-capture-config.yaml
file_format: "1.1"

instrumentation/development:
  general:
    http:
      client:
        # Capture specific request headers
        request_captured_headers:
          - User-Agent
          - X-Request-Id
          - X-Correlation-Id
          - Accept
          - Content-Type

        # Capture specific response headers
        response_captured_headers:
          - X-Response-Time
          - X-Cache-Status
          - Content-Type

      server:
        request_captured_headers:
          - User-Agent
          - X-Forwarded-For
          - X-Request-Id
          - Content-Type
          - Authorization  # Be careful with sensitive headers

        response_captured_headers:
          - X-Response-Time
          - Cache-Control
```

## Database Statement Capture

Configure database instrumentation to sanitize SQL statements:

```yaml
# database-config.yaml
file_format: "1.1"

distribution:
  javaagent:
    instrumentation:
      enabled:
        - jdbc
        - mongo
        - redis

instrumentation/development:
  java:
    common:
      database:
        statement_sanitizer:
          enabled: true
```

## Multi-Backend Export Configuration

Export to multiple backends simultaneously:

```yaml
# multi-backend-config.yaml
file_format: "1.1"

tracer_provider:
  # Export to multiple destinations by configuring multiple span processors
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://primary-collector:4318/v1/traces
            headers:
              - name: api-key
                value: ${PRIMARY_API_KEY}

    - batch:
        exporter:
          zipkin:
            endpoint: http://zipkin-server:9411/api/v2/spans
```

## Configuration Validation

Validate your YAML configuration before deployment:

```bash
# Use yamllint to check syntax
yamllint otel-config.yaml

# Test configuration during agent startup
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=otel-config.yaml \
  -Dotel.javaagent.debug=true \
  -jar payment-service.jar

# Check agent startup logs for configuration errors
```

## Configuration Override Precedence

Understanding configuration behavior is crucial. With declarative configuration, `OTEL_CONFIG_FILE` or `-Dotel.config.file` selects the YAML file, and other SDK environment variables are ignored unless the file explicitly references them with substitution syntax such as `${OTEL_SERVICE_NAME:-payment-service}`.

```yaml
# config.yaml
file_format: "1.1"
resource:
  attributes:
    - name: service.name
      value: ${OTEL_SERVICE_NAME:-payment-service}  # Can be set by environment variable substitution
```

```bash
# Supply service name via a value referenced in the YAML file
export OTEL_SERVICE_NAME=payment-service-v2
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.config.file=config.yaml \
  -jar payment-service.jar

# Final service name will be "payment-service-v2"
```

## Version Control Best Practices

Manage configuration files in Git with these practices:

```bash
# Repository structure
.
├── otel-config/
│   ├── base-config.yaml           # Shared settings
│   ├── development-config.yaml    # Dev overrides
│   ├── staging-config.yaml        # Staging overrides
│   └── production-config.yaml     # Production overrides
├── .gitignore                      # Ignore sensitive files
└── README.md                       # Configuration documentation
```

```gitignore
# .gitignore
# Never commit files with secrets
*-secrets.yaml
*.secret.yaml
```

Use environment variables for secrets:

```yaml
# production-config.yaml (safe to commit)
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://collector:4318/v1/traces
            headers:
              - name: api-key
                value: ${OTEL_API_KEY}  # Loaded from environment
```

YAML configuration transforms the OpenTelemetry Java agent from a command-line tool into a maintainable, version-controlled component of your infrastructure. By centralizing configuration, you gain better visibility, easier debugging, and simpler updates across your entire microservices fleet.

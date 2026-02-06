# How to Configure OpenTelemetry Java Agent Properties via YAML Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java Agent, YAML, Configuration, Declarative

Description: Master the declarative YAML configuration system for the OpenTelemetry Java agent to manage complex instrumentation settings with version control and maintainability.

Managing Java agent configuration through command-line arguments or environment variables becomes unwieldy as your observability requirements grow. The OpenTelemetry Java agent supports declarative YAML configuration files that centralize all settings, support comments and documentation, integrate with version control, and make complex configurations maintainable.

## Why Use YAML Configuration?

Command-line configurations work for simple cases, but YAML offers significant advantages for production environments:

- **Maintainability**: Keep all settings in one place with clear structure
- **Documentation**: Add comments explaining why settings exist
- **Version control**: Track configuration changes through Git
- **Validation**: Catch syntax errors before deployment
- **Complexity management**: Handle nested configurations naturally
- **Team collaboration**: Easier to review and understand than long command lines

## Configuration File Location

The agent discovers configuration files through several mechanisms. Specify the configuration file location using the `otel.javaagent.configuration-file` property:

```bash
# Specify configuration file location
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=/etc/otel/agent-config.yaml \
  -jar your-application.jar
```

Alternative methods for specifying the configuration file:

```bash
# Using environment variable
export OTEL_JAVAAGENT_CONFIGURATION_FILE=/etc/otel/agent-config.yaml
java -javaagent:opentelemetry-javaagent.jar -jar your-application.jar

# Using relative path (relative to working directory)
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=./config/otel-config.yaml \
  -jar your-application.jar
```

## Basic YAML Configuration Structure

A minimal configuration file includes service identification and exporter settings:

```yaml
# otel-config.yaml - Basic configuration
# Service identification
service:
  name: payment-service
  version: 1.2.3

# Resource attributes for filtering and grouping
resource:
  attributes:
    deployment.environment: production
    service.namespace: payments
    team: platform-engineering

# OTLP exporter configuration
exporter:
  otlp:
    endpoint: http://otel-collector:4318
    protocol: http/protobuf
    timeout: 10000  # milliseconds

# Trace configuration
traces:
  exporter: otlp
```

Start your application with this configuration:

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=otel-config.yaml \
  -jar payment-service.jar
```

## Comprehensive Configuration Example

A production-ready configuration covers traces, metrics, logs, and sampling:

```yaml
# production-otel-config.yaml
# Complete OpenTelemetry Java agent configuration for production

# Service identification
# These attributes identify your service in the observability backend
service:
  name: payment-service
  version: ${APP_VERSION:1.0.0}  # Support environment variable substitution
  instance.id: ${HOSTNAME:unknown}

# Resource attributes
# Applied to all telemetry signals (traces, metrics, logs)
resource:
  attributes:
    # Deployment metadata
    deployment.environment: production
    deployment.region: us-east-1
    deployment.datacenter: dc1

    # Service organization
    service.namespace: payments
    service.team: platform-engineering

    # Infrastructure metadata
    host.name: ${HOSTNAME}
    host.type: container
    cloud.provider: aws
    cloud.region: us-east-1

# Propagators configuration
# Controls how trace context is propagated across service boundaries
propagators:
  - tracecontext  # W3C Trace Context (recommended)
  - baggage       # W3C Baggage
  - b3multi       # Zipkin B3 multi-header (for legacy systems)

# Trace configuration
traces:
  # Exporter selection (otlp, zipkin, jaeger, logging, none)
  exporter: otlp

  # Sampling configuration
  # Parent-based sampling respects upstream sampling decisions
  sampler:
    type: parentbased_traceidratio
    arg: 0.1  # Sample 10% of traces

# Metrics configuration
metrics:
  exporter: otlp

  # Metrics export interval in milliseconds
  export-interval: 60000

  # Instrument specific metrics
  exemplars:
    enabled: true  # Link metrics to traces

# Logs configuration
logs:
  exporter: otlp

  # Include trace context in logs
  include-trace-context: true

# OTLP exporter configuration
exporter:
  otlp:
    # Collector endpoint
    endpoint: http://otel-collector.observability.svc.cluster.local:4318

    # Protocol selection (http/protobuf or grpc)
    protocol: http/protobuf

    # Timeout for export requests
    timeout: 10000

    # Compression (none, gzip)
    compression: gzip

    # Authentication headers
    headers:
      api-key: ${OTEL_API_KEY}  # Load from environment
      x-tenant-id: payments-team

    # Retry configuration
    retry:
      enabled: true
      max-attempts: 5

# Batch span processor configuration
# Controls how spans are batched before export
batch-span-processor:
  # Maximum time to wait before exporting
  schedule-delay-millis: 5000

  # Maximum number of spans in queue
  max-queue-size: 2048

  # Maximum batch size for export
  max-export-batch-size: 512

  # Timeout for export operation
  export-timeout-millis: 30000

# Instrumentation configuration
# Control which libraries are instrumented
instrumentation:
  # Default behavior for instrumentations
  common:
    default-enabled: true

  # HTTP instrumentations
  http:
    client:
      enabled: true
      # Capture request and response headers
      capture-request-headers:
        - User-Agent
        - X-Request-Id
      capture-response-headers:
        - X-Response-Time

    server:
      enabled: true
      capture-request-headers:
        - User-Agent
        - X-Request-Id
        - Content-Type

  # Spring framework instrumentation
  spring-web:
    enabled: true
  spring-webmvc:
    enabled: true
  spring-webflux:
    enabled: true

  # Database instrumentation
  jdbc:
    enabled: true
    # Capture SQL statements (be careful with PII)
    statement-sanitizer:
      enabled: true

  # Messaging instrumentation
  kafka:
    enabled: true
    experimental-span-attributes: true

  rabbitmq:
    enabled: true

  # Redis instrumentation
  redis:
    enabled: true
    capture-statement: true

  # MongoDB instrumentation
  mongo:
    enabled: true
    capture-statement: true

  # gRPC instrumentation
  grpc:
    enabled: true

# Extensions configuration
# Load custom extensions for specialized instrumentation
extensions:
  # Path to custom extension JARs
  - /opt/otel-extensions/custom-instrumentation.jar
  - /opt/otel-extensions/business-metrics.jar

# Logging configuration for the agent itself
agent:
  # Enable debug logging for troubleshooting
  debug: false

  # Logging level (TRACE, DEBUG, INFO, WARN, ERROR)
  logging:
    level: INFO
```

## Environment-Specific Configurations

Maintain separate configuration files for different environments:

```yaml
# development-otel-config.yaml
# Development environment with verbose logging and 100% sampling

service:
  name: payment-service
  version: dev

resource:
  attributes:
    deployment.environment: development

traces:
  exporter: logging  # Output to console
  sampler:
    type: always_on  # Sample everything in dev

metrics:
  exporter: logging

logs:
  exporter: logging

agent:
  debug: true  # Verbose agent logging
  logging:
    level: DEBUG
```

```yaml
# staging-otel-config.yaml
# Staging environment configuration

service:
  name: payment-service
  version: ${APP_VERSION}

resource:
  attributes:
    deployment.environment: staging

exporter:
  otlp:
    endpoint: http://otel-collector.staging:4318
    protocol: http/protobuf

traces:
  exporter: otlp
  sampler:
    type: parentbased_traceidratio
    arg: 0.5  # 50% sampling in staging

metrics:
  exporter: otlp
  export-interval: 30000  # More frequent in staging

logs:
  exporter: otlp
```

Select configuration based on environment:

```bash
# Development
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=development-otel-config.yaml \
  -jar payment-service.jar

# Staging
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=staging-otel-config.yaml \
  -jar payment-service.jar

# Production
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=production-otel-config.yaml \
  -jar payment-service.jar
```

## Docker Integration

Mount configuration files as volumes in Docker containers:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Download OpenTelemetry agent
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.1.0/opentelemetry-javaagent.jar \
  /app/opentelemetry-javaagent.jar

# Copy application JAR
COPY target/payment-service.jar /app/app.jar

# Configuration will be mounted at runtime
ENV OTEL_JAVAAGENT_CONFIGURATION_FILE=/etc/otel/config.yaml

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
    service:
      name: payment-service
      version: 1.2.3

    resource:
      attributes:
        deployment.environment: production
        service.namespace: payments

    propagators:
      - tracecontext
      - baggage

    traces:
      exporter: otlp
      sampler:
        type: parentbased_traceidratio
        arg: 0.1

    metrics:
      exporter: otlp
      export-interval: 60000

    logs:
      exporter: otlp

    exporter:
      otlp:
        endpoint: http://otel-collector.observability.svc.cluster.local:4318
        protocol: http/protobuf
        compression: gzip

    batch-span-processor:
      schedule-delay-millis: 5000
      max-queue-size: 2048
      max-export-batch-size: 512

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
        - name: OTEL_JAVAAGENT_CONFIGURATION_FILE
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

Configure sophisticated sampling strategies in YAML:

```yaml
# advanced-sampling-config.yaml
traces:
  sampler:
    # Use rule-based sampler for complex logic
    type: rules

    # Sampling rules (evaluated in order)
    rules:
      # Always sample errors and slow requests
      - span_kind: SERVER
        attributes:
          http.status_code: 5xx
        sample: always

      - span_kind: SERVER
        attributes:
          http.duration_ms: ">1000"
        sample: always

      # Sample 50% of authentication requests
      - span_kind: SERVER
        attributes:
          http.route: "/api/auth/*"
        sample: 0.5

      # Sample 10% of everything else
      - sample: 0.1
```

Note: The rules-based sampler syntax shown above is conceptual. The actual Java agent currently supports these sampling types:

```yaml
# Supported sampler types
traces:
  sampler:
    # Always sample
    type: always_on

    # Never sample
    type: always_off

    # Sample based on trace ID ratio
    type: traceidratio
    arg: 0.1

    # Parent-based with ratio (recommended)
    type: parentbased_traceidratio
    arg: 0.1

    # Parent-based always on
    type: parentbased_always_on

    # Parent-based always off
    type: parentbased_always_off
```

## Selective Instrumentation Configuration

Fine-tune which libraries are instrumented:

```yaml
# selective-instrumentation-config.yaml
instrumentation:
  # Disable all instrumentations by default
  common:
    default-enabled: false

  # Enable only what you need
  spring-webmvc:
    enabled: true

  jdbc:
    enabled: true

  kafka:
    enabled: true

  redis:
    enabled: true

  # Keep others disabled
  netty:
    enabled: false

  grpc:
    enabled: false
```

This reduces overhead and startup time when you don't need comprehensive instrumentation.

## HTTP Header Capture Configuration

Control which HTTP headers are captured in spans:

```yaml
# http-capture-config.yaml
instrumentation:
  http:
    client:
      enabled: true
      # Capture specific request headers
      capture-request-headers:
        - User-Agent
        - X-Request-Id
        - X-Correlation-Id
        - Accept
        - Content-Type

      # Capture specific response headers
      capture-response-headers:
        - X-Response-Time
        - X-Cache-Status
        - Content-Type

      # Capture full URLs (be careful with sensitive data)
      capture-url-parameters: false

    server:
      enabled: true
      capture-request-headers:
        - User-Agent
        - X-Forwarded-For
        - X-Request-Id
        - Content-Type
        - Authorization  # Be careful with sensitive headers

      capture-response-headers:
        - X-Response-Time
        - Cache-Control
```

## Database Statement Capture

Configure database instrumentation to capture or sanitize SQL statements:

```yaml
# database-config.yaml
instrumentation:
  jdbc:
    enabled: true

    # Capture SQL statements
    # WARNING: May capture sensitive data
    statement-sanitizer:
      enabled: true

      # Mask actual values in SQL
      mask-values: true

  mongo:
    enabled: true

    # Capture MongoDB commands
    capture-statement: true

  redis:
    enabled: true

    # Capture Redis commands
    capture-statement: true
```

## Multi-Backend Export Configuration

Export to multiple backends simultaneously:

```yaml
# multi-backend-config.yaml
traces:
  # Export to multiple destinations
  exporter: otlp,zipkin

exporter:
  # Primary backend (OTLP)
  otlp:
    endpoint: http://primary-collector:4318
    protocol: http/protobuf
    headers:
      api-key: ${PRIMARY_API_KEY}

  # Secondary backend (Zipkin)
  zipkin:
    endpoint: http://zipkin-server:9411/api/v2/spans
```

## Configuration Validation

Validate your YAML configuration before deployment:

```bash
# Use yamllint to check syntax
yamllint otel-config.yaml

# Test configuration with a dry-run
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=otel-config.yaml \
  -Dotel.javaagent.debug=true \
  -jar payment-service.jar

# Check agent startup logs for configuration errors
```

## Configuration Override Precedence

Understanding the configuration precedence is crucial:

1. System properties (`-Dotel.property=value`) - Highest priority
2. Environment variables (`OTEL_PROPERTY=value`)
3. YAML configuration file
4. Default values - Lowest priority

```yaml
# config.yaml
service:
  name: payment-service  # Can be overridden
```

```bash
# Override service name via system property
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.javaagent.configuration-file=config.yaml \
  -Dotel.service.name=payment-service-v2 \
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
exporter:
  otlp:
    endpoint: http://collector:4318
    headers:
      api-key: ${OTEL_API_KEY}  # Loaded from environment
```

YAML configuration transforms the OpenTelemetry Java agent from a command-line tool into a maintainable, version-controlled component of your infrastructure. By centralizing configuration, you gain better visibility, easier debugging, and simpler updates across your entire microservices fleet.

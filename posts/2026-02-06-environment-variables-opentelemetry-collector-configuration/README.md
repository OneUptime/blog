# How to Use Environment Variables in OpenTelemetry Collector Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Environment Variables, DevOps

Description: Master environment variable usage in OpenTelemetry Collector configurations for flexible, secure, and environment-specific deployments across different infrastructures.

Environment variables provide a flexible way to configure the OpenTelemetry Collector across different environments without modifying configuration files. This approach is essential for containerized deployments, CI/CD pipelines, and managing sensitive credentials securely.

## Understanding Environment Variable Expansion

The OpenTelemetry Collector supports environment variable expansion using the `${ENV_VAR}` or `${env:ENV_VAR}` syntax. When the collector starts, it replaces these placeholders with actual environment variable values from the system.

Environment variable expansion happens at startup time, not runtime. If you change an environment variable after the collector starts, you must restart the collector for changes to take effect.

```mermaid
graph LR
    A[Config File with ${ENV_VAR}] --> B[Collector Startup]
    B --> C[Read Environment]
    C --> D[Replace Variables]
    D --> E[Parsed Configuration]
```

## Basic Environment Variable Usage

Here's a simple example showing how to use environment variables for endpoint configuration:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        # Use environment variable for the listening endpoint
        endpoint: ${OTLP_GRPC_ENDPOINT}
      http:
        endpoint: ${OTLP_HTTP_ENDPOINT}

exporters:
  otlp:
    # Configure backend endpoint from environment
    endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT}

  prometheus:
    endpoint: ${PROMETHEUS_ENDPOINT}

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp]

    metrics:
      receivers: [otlp]
      exporters: [prometheus]
```

Set the environment variables before starting the collector:

```bash
export OTLP_GRPC_ENDPOINT="0.0.0.0:4317"
export OTLP_HTTP_ENDPOINT="0.0.0.0:4318"
export OTEL_EXPORTER_OTLP_ENDPOINT="backend.example.com:4317"
export PROMETHEUS_ENDPOINT="0.0.0.0:8889"

./otelcol --config collector-config.yaml
```

## Default Values with Environment Variables

The collector supports default values using the syntax `${ENV_VAR:-default_value}`. If the environment variable is not set, the default value is used:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        # Use port 4317 if GRPC_PORT is not set
        endpoint: 0.0.0.0:${GRPC_PORT:-4317}
      http:
        # Use port 4318 if HTTP_PORT is not set
        endpoint: 0.0.0.0:${HTTP_PORT:-4318}

processors:
  batch:
    # Default to 10 second timeout if not specified
    timeout: ${BATCH_TIMEOUT:-10s}

    # Default to 1000 spans per batch
    send_batch_size: ${BATCH_SIZE:-1000}

exporters:
  otlp:
    endpoint: ${BACKEND_ENDPOINT:-localhost:4317}

    # Use secure connection by default
    tls:
      insecure: ${INSECURE_MODE:-false}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

This configuration works out of the box with sensible defaults while allowing customization through environment variables.

## Managing Sensitive Credentials

Never hardcode sensitive credentials in configuration files. Use environment variables to inject API keys, tokens, and passwords at runtime:

```yaml
receivers:
  # Receive data from Kafka with SASL authentication
  kafka:
    protocol_version: 2.0.0
    brokers:
      - ${KAFKA_BROKER_1}
      - ${KAFKA_BROKER_2}
    topic: otel-traces
    auth:
      sasl:
        username: ${KAFKA_USERNAME}
        password: ${KAFKA_PASSWORD}
        mechanism: PLAIN

exporters:
  # Export to Datadog with API key from environment
  datadog:
    api:
      key: ${DATADOG_API_KEY}
      site: ${DATADOG_SITE:-datadoghq.com}

  # Export to New Relic with license key
  otlphttp:
    endpoint: https://otlp.nr-data.net:4318
    headers:
      api-key: ${NEW_RELIC_LICENSE_KEY}

  # Export to Elastic with authentication
  elasticsearch:
    endpoints:
      - ${ELASTIC_ENDPOINT}
    auth:
      authenticator: basicauth
    user: ${ELASTIC_USERNAME}
    password: ${ELASTIC_PASSWORD}

service:
  pipelines:
    traces:
      receivers: [kafka]
      exporters: [datadog, otlphttp, elasticsearch]
```

Store these credentials securely using secret management tools:

```bash
# Using AWS Secrets Manager
export DATADOG_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id datadog-api-key \
  --query SecretString \
  --output text)

# Using HashiCorp Vault
export KAFKA_PASSWORD=$(vault kv get -field=password secret/kafka)

# Using Kubernetes secrets (mounted as files)
export NEW_RELIC_LICENSE_KEY=$(cat /var/run/secrets/newrelic/license-key)
```

## Environment-Specific Configurations

Use environment variables to customize collector behavior across different environments (development, staging, production):

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: ${OTLP_ENDPOINT:-0.0.0.0:4317}

processors:
  # Batch processor with environment-specific settings
  batch:
    timeout: ${BATCH_TIMEOUT:-10s}
    send_batch_size: ${BATCH_SIZE:-1000}

  # Sampling processor for production environments
  probabilistic_sampler:
    # Sample 100% in dev, 10% in prod
    sampling_percentage: ${SAMPLING_RATE:-100}

  # Resource processor to add environment labels
  resource:
    attributes:
      - key: environment
        value: ${ENVIRONMENT:-development}
        action: upsert
      - key: deployment.region
        value: ${AWS_REGION}
        action: upsert
      - key: k8s.cluster.name
        value: ${CLUSTER_NAME}
        action: upsert

exporters:
  # Debug exporter enabled only in development
  debug:
    verbosity: ${DEBUG_VERBOSITY:-basic}

  # Production backend
  otlp:
    endpoint: ${BACKEND_ENDPOINT}
    compression: ${COMPRESSION_TYPE:-gzip}

service:
  # Enable telemetry in production
  telemetry:
    logs:
      level: ${LOG_LEVEL:-info}
    metrics:
      level: ${METRICS_LEVEL:-detailed}
      address: ${TELEMETRY_ADDRESS:-localhost:8888}

  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, probabilistic_sampler, batch]
      exporters: [otlp, debug]
```

Create environment-specific configuration files:

```bash
# development.env
export ENVIRONMENT="development"
export LOG_LEVEL="debug"
export DEBUG_VERBOSITY="detailed"
export SAMPLING_RATE="100"
export BATCH_TIMEOUT="5s"
export BACKEND_ENDPOINT="localhost:4317"
export COMPRESSION_TYPE="none"

# production.env
export ENVIRONMENT="production"
export LOG_LEVEL="warn"
export DEBUG_VERBOSITY="basic"
export SAMPLING_RATE="10"
export BATCH_TIMEOUT="30s"
export BACKEND_ENDPOINT="prod-backend.example.com:4317"
export COMPRESSION_TYPE="gzip"
```

Load the appropriate environment file:

```bash
# Development
source development.env
./otelcol --config collector-config.yaml

# Production
source production.env
./otelcol --config collector-config.yaml
```

## Docker and Kubernetes Deployments

Environment variables integrate seamlessly with containerized deployments.

Docker Compose example:

```yaml
# docker-compose.yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel/config.yaml"]
    volumes:
      - ./collector-config.yaml:/etc/otel/config.yaml
    environment:
      # Receiver configuration
      OTLP_GRPC_ENDPOINT: "0.0.0.0:4317"
      OTLP_HTTP_ENDPOINT: "0.0.0.0:4318"

      # Exporter configuration
      BACKEND_ENDPOINT: "tempo:4317"
      PROMETHEUS_ENDPOINT: "0.0.0.0:8889"

      # Processing configuration
      BATCH_TIMEOUT: "10s"
      BATCH_SIZE: "1000"

      # Environment labels
      ENVIRONMENT: "staging"
      CLUSTER_NAME: "staging-cluster"

      # Log level
      LOG_LEVEL: "info"
    env_file:
      - ./secrets.env  # Load sensitive credentials from file
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"
```

Kubernetes deployment example:

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args: ["--config=/conf/collector-config.yaml"]
        env:
          # Configuration from ConfigMap
          - name: OTLP_GRPC_ENDPOINT
            value: "0.0.0.0:4317"
          - name: OTLP_HTTP_ENDPOINT
            value: "0.0.0.0:4318"

          # Downward API for pod information
          - name: POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.name
          - name: POD_NAMESPACE
            valueFrom:
              fieldRef:
                fieldPath: metadata.namespace
          - name: NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName

          # Secrets from Kubernetes Secret
          - name: DATADOG_API_KEY
            valueFrom:
              secretKeyRef:
                name: observability-secrets
                key: datadog-api-key
          - name: NEW_RELIC_LICENSE_KEY
            valueFrom:
              secretKeyRef:
                name: observability-secrets
                key: newrelic-license-key

          # ConfigMap for non-sensitive config
          - name: BACKEND_ENDPOINT
            valueFrom:
              configMapKeyRef:
                name: otel-config
                key: backend-endpoint
          - name: ENVIRONMENT
            valueFrom:
              configMapKeyRef:
                name: otel-config
                key: environment

        volumeMounts:
        - name: config
          mountPath: /conf

        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http

      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

Create the ConfigMap and Secret:

```yaml
# k8s-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: observability
data:
  backend-endpoint: "tempo.observability.svc.cluster.local:4317"
  environment: "production"
  cluster-name: "prod-us-east-1"

---
apiVersion: v1
kind: Secret
metadata:
  name: observability-secrets
  namespace: observability
type: Opaque
stringData:
  datadog-api-key: "your-datadog-key"
  newrelic-license-key: "your-newrelic-key"
```

## Complex Variable Substitution

The collector supports nested environment variable expansion for building complex configuration values:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        # Combine multiple environment variables
        endpoint: ${HOST_IP:-0.0.0.0}:${GRPC_PORT:-4317}

exporters:
  otlp:
    # Build complete URL from components
    endpoint: ${BACKEND_PROTOCOL:-https}://${BACKEND_HOST}:${BACKEND_PORT:-4317}

    headers:
      # Construct authorization header
      authorization: "Bearer ${API_TOKEN}"

  loki:
    # Build Loki endpoint with tenant ID
    endpoint: ${LOKI_ENDPOINT}/loki/api/v1/push
    headers:
      X-Scope-OrgID: ${TENANT_ID}

processors:
  attributes:
    actions:
      # Use environment variables in attribute values
      - key: deployment.id
        value: ${DEPLOYMENT_ID}
        action: upsert
      - key: build.version
        value: ${BUILD_VERSION:-unknown}
        action: upsert
```

## Validation and Debugging

When using environment variables, validation is crucial. The collector provides helpful error messages for missing required variables.

Enable debug logging to see resolved configuration values:

```bash
# Start collector with debug logging
export LOG_LEVEL="debug"
./otelcol --config collector-config.yaml 2>&1 | grep "environment variable"
```

Create a validation script to check required environment variables:

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "OTLP_GRPC_ENDPOINT"
  "BACKEND_ENDPOINT"
  "DATADOG_API_KEY"
  "ENVIRONMENT"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "Error: Missing required environment variables:"
  printf '  - %s\n' "${MISSING_VARS[@]}"
  exit 1
fi

echo "All required environment variables are set."
```

Run validation before starting the collector:

```bash
./validate-env.sh && ./otelcol --config collector-config.yaml
```

## Best Practices

**Use Default Values**: Provide sensible defaults for non-critical configuration to enable quick testing and development.

**Document Variables**: Maintain a list of all environment variables your configuration uses, including their purpose and default values.

**Separate Secrets**: Use dedicated secret management tools for sensitive data rather than plain environment variables.

**Validate on Startup**: Implement validation scripts to catch missing variables before the collector starts.

**Environment Files**: Use `.env` files for local development but never commit them to version control.

**Naming Conventions**: Use consistent prefixes like `OTEL_` or `COLLECTOR_` for all collector-related variables.

For dynamic configuration changes without restarts, explore the [file provider for dynamic collector configuration](https://oneuptime.com/blog/post/file-provider-dynamic-collector-configuration/view) or [HTTP provider for remote configuration](https://oneuptime.com/blog/post/http-provider-remote-collector-configuration/view).

## Conclusion

Environment variables are essential for flexible, secure OpenTelemetry Collector deployments. They enable environment-specific configurations, protect sensitive credentials, and integrate seamlessly with modern infrastructure tools like Docker and Kubernetes. By following the patterns and best practices outlined here, you can build robust, maintainable collector configurations that adapt to any deployment environment.

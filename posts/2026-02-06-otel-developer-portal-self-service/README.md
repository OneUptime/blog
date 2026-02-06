# How to Build an Internal OpenTelemetry Developer Portal with Self-Service Instrumentation Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Developer Portal, Self-Service, Templates, Platform Engineering

Description: Build an internal developer portal that provides self-service OpenTelemetry instrumentation templates for consistent adoption across teams.

Getting every team in your organization to adopt OpenTelemetry is harder than instrumenting a single service. Different teams use different languages, have different levels of familiarity with observability, and face different time pressures. An internal developer portal with self-service instrumentation templates lowers the barrier to adoption by giving every team a clear starting point.

## What the Portal Provides

The portal is a simple internal website or Git repository that offers:
- Pre-built instrumentation templates for each language your organization uses
- A collector configuration generator
- Copy-paste code snippets for common patterns
- A getting-started guide tailored to your infrastructure

You do not need a fancy UI. A well-organized Git repository with good documentation works perfectly.

## Repository Structure

```
otel-portal/
  templates/
    node/
      basic-express/
        tracing.js
        package.json.template
        README.md
      advanced-grpc/
        tracing.js
        README.md
    python/
      basic-flask/
        tracing.py
        requirements.txt.template
        README.md
      basic-fastapi/
        tracing.py
        README.md
    go/
      basic-http/
        tracing.go
        README.md
    dotnet/
      basic-aspnet/
        TracingExtensions.cs
        README.md
  collector/
    configs/
      basic.yaml
      with-sampling.yaml
      with-filtering.yaml
    docker-compose.yaml
  docs/
    getting-started.md
    faq.md
    troubleshooting.md
```

## Node.js Template Example

`templates/node/basic-express/tracing.js`:

```javascript
// OpenTelemetry initialization for Express applications
// Copy this file to your project and require it before your app code:
//   node --require ./tracing.js app.js
//
// Required environment variables:
//   OTEL_SERVICE_NAME - your service name
//   OTEL_EXPORTER_OTLP_ENDPOINT - collector URL (default: http://localhost:4318)

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const serviceName = process.env.OTEL_SERVICE_NAME;
if (!serviceName) {
  console.warn('[tracing] OTEL_SERVICE_NAME is not set. Traces will use "unknown-service".');
}

const resource = new Resource({
  'service.name': serviceName || 'unknown-service',
  'service.version': process.env.SERVICE_VERSION || 'unknown',
  'deployment.environment': process.env.NODE_ENV || 'development',
});

const exporter = new OTLPTraceExporter({
  url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318') + '/v1/traces',
});

const sdk = new NodeSDK({
  resource,
  spanProcessors: [new BatchSpanProcessor(exporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown
const shutdown = () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[tracing] Shutdown error:', err);
      process.exit(1);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[tracing] Initialized for service: ${serviceName || 'unknown-service'}`);
```

`templates/node/basic-express/package.json.template`:

```json
{
  "// NOTE": "Add these dependencies to your existing package.json",
  "dependencies": {
    "@opentelemetry/api": "^1.8.0",
    "@opentelemetry/sdk-node": "^0.49.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.49.0",
    "@opentelemetry/auto-instrumentations-node": "^0.43.0",
    "@opentelemetry/resources": "^1.22.0",
    "@opentelemetry/sdk-trace-base": "^1.22.0"
  }
}
```

## Collector Configuration Generator

Create a simple script that generates a collector configuration based on answers to a few questions. This can be a shell script, a Python script, or even a web form.

`collector/generate-config.sh`:

```bash
#!/bin/bash
# Interactive collector configuration generator

echo "OpenTelemetry Collector Configuration Generator"
echo "================================================"

read -p "Service name: " SERVICE_NAME
read -p "Enable Jaeger export? (y/n): " USE_JAEGER
read -p "Enable Prometheus metrics? (y/n): " USE_PROMETHEUS
read -p "Jaeger endpoint (default: jaeger:4317): " JAEGER_ENDPOINT
JAEGER_ENDPOINT=${JAEGER_ENDPOINT:-jaeger:4317}

# Generate the config file
cat > collector-config.yaml << EOF
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
    send_batch_size: 512
  resource:
    attributes:
      - key: service.namespace
        value: ${SERVICE_NAME}
        action: upsert

exporters:
  debug:
    verbosity: basic
EOF

if [ "$USE_JAEGER" = "y" ]; then
cat >> collector-config.yaml << EOF
  otlp/jaeger:
    endpoint: ${JAEGER_ENDPOINT}
    tls:
      insecure: true
EOF
fi

if [ "$USE_PROMETHEUS" = "y" ]; then
cat >> collector-config.yaml << EOF
  prometheus:
    endpoint: 0.0.0.0:8889
EOF
fi

# Build the service section
TRACE_EXPORTERS="debug"
METRIC_EXPORTERS="debug"

[ "$USE_JAEGER" = "y" ] && TRACE_EXPORTERS="debug, otlp/jaeger"
[ "$USE_PROMETHEUS" = "y" ] && METRIC_EXPORTERS="debug, prometheus"

cat >> collector-config.yaml << EOF

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [${TRACE_EXPORTERS}]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [${METRIC_EXPORTERS}]
EOF

echo ""
echo "Generated collector-config.yaml"
echo "Run: docker compose up -d"
```

## Self-Service Workflow

A developer who wants to add tracing to their service follows these steps:

1. Browse the portal repository to find the template for their language and framework
2. Copy the tracing initialization file into their project
3. Add the listed dependencies to their package manager
4. Run the collector config generator if they need a local collector
5. Set the environment variables and start their application

The whole process takes about 15 minutes, compared to hours of reading documentation and trial-and-error.

## Keeping Templates Current

Assign an owner to the portal. This person (or team) is responsible for:
- Updating dependency versions when new OpenTelemetry releases come out
- Adding templates for new languages or frameworks as the organization adopts them
- Updating configurations when infrastructure changes (new collector endpoints, new backends)
- Reviewing pull requests from other teams who want to contribute templates

Set up a CI pipeline that tests each template to make sure it still works:

```yaml
# .github/workflows/test-templates.yml
name: Test Templates
on:
  push:
    paths:
      - 'templates/**'

jobs:
  test-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd templates/node/basic-express && npm install
      - run: cd templates/node/basic-express && node -e "require('./tracing')"
```

This ensures templates do not break when dependencies are updated.

The portal does not need to be complex. A Git repository with well-organized templates and clear documentation is enough to significantly accelerate OpenTelemetry adoption across your organization.

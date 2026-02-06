# How to Configure Environment-Specific OpenTelemetry Settings Using .env Files and OTEL_* Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Environment Variables, Configuration, .env Files, Best Practices

Description: Use .env files and standard OTEL_* environment variables to manage OpenTelemetry configuration across development, staging, and production.

OpenTelemetry SDKs are designed to be configured through environment variables. The specification defines a set of standard `OTEL_*` variables that every SDK implementation respects. By managing these variables through `.env` files, you get environment-specific telemetry configuration without changing any application code. This post covers the key variables and how to organize them.

## Why Environment Variables

The OpenTelemetry specification standardizes environment variable names across all languages. This means the same `OTEL_SERVICE_NAME=order-service` works whether your app is written in Node.js, Python, Go, Java, or .NET. Your deployment tooling sets the variables, and the SDK reads them automatically.

This is better than hardcoding configuration in your application because:
- The same code runs in every environment
- Configuration changes do not require code changes or redeployment
- Sensitive values like API keys stay out of source control

## The Key OTEL_* Variables

Here are the variables you will use most often:

```bash
# Service identification
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.2.3,deployment.environment=staging

# Exporter configuration
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Sampling (reduce volume in production)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Propagation format
OTEL_PROPAGATORS=tracecontext,baggage

# Batch processor tuning
OTEL_BSP_MAX_QUEUE_SIZE=2048
OTEL_BSP_SCHEDULE_DELAY=5000
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
```

## Organizing .env Files by Environment

Create separate `.env` files for each environment:

**.env.development**:
```bash
# Local development settings
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=development

# Export to local console for quick feedback
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=none
OTEL_LOGS_EXPORTER=none

# No sampling in development - capture everything
OTEL_TRACES_SAMPLER=always_on
```

**.env.staging**:
```bash
# Staging environment
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=staging,service.version=${SERVICE_VERSION}

# Export via OTLP to the staging collector
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.staging:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Sample 50% of traces in staging
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5
```

**.env.production**:
```bash
# Production environment
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=${SERVICE_VERSION}

# Export via OTLP to the production collector
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.prod:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=${OTEL_API_KEY}

# Sample 10% of traces in production
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Tune batch processing for production throughput
OTEL_BSP_MAX_QUEUE_SIZE=4096
OTEL_BSP_SCHEDULE_DELAY=5000
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=1024
```

## Loading .env Files

**Node.js with dotenv:**

```javascript
// Load the environment-specific .env file
const dotenv = require('dotenv');
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });

// Now require the tracing setup - it reads OTEL_* vars automatically
require('./tracing');

// Your app code
const app = require('./app');
app.listen(3000);
```

**Python with python-dotenv:**

```python
# load_env.py
import os
from dotenv import load_dotenv

env = os.environ.get("APP_ENV", "development")
load_dotenv(f".env.{env}")

# After loading, the OTel SDK picks up the variables
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# The exporter reads OTEL_EXPORTER_OTLP_ENDPOINT automatically
provider = TracerProvider()
exporter = OTLPSpanExporter()  # No arguments needed
```

**Docker Compose:**

```yaml
services:
  app:
    build: .
    env_file:
      - .env.${APP_ENV:-development}
```

**Kubernetes with ConfigMaps:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
data:
  OTEL_SERVICE_NAME: order-service
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
  OTEL_TRACES_SAMPLER: parentbased_traceidratio
  OTEL_TRACES_SAMPLER_ARG: "0.1"
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: otel-config
```

## The .gitignore Setup

Add environment-specific files with secrets to `.gitignore`:

```
# Keep templates in version control
# .env.development is safe to commit (no secrets)
.env.staging
.env.production

# Keep a template for reference
!.env.example
```

Create an `.env.example` that shows all available variables without real values:

```bash
# .env.example - Copy to .env.{environment} and fill in values
OTEL_SERVICE_NAME=your-service-name
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=your-env
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_TRACES_SAMPLER=always_on
OTEL_TRACES_SAMPLER_ARG=
```

## Verifying Configuration

Add a startup check that logs the active OpenTelemetry configuration:

```javascript
// Log active OTEL configuration at startup
const otelVars = Object.entries(process.env)
  .filter(([key]) => key.startsWith('OTEL_'))
  .map(([key, value]) => {
    // Mask sensitive values
    if (key.includes('KEY') || key.includes('TOKEN') || key.includes('HEADER')) {
      return `  ${key}=****`;
    }
    return `  ${key}=${value}`;
  });

console.log('[otel] Active configuration:');
otelVars.forEach(v => console.log(v));
```

This prints the active configuration on every startup, making it easy to verify that the right `.env` file was loaded. Sensitive values are masked to avoid leaking them to logs.

Using `.env` files with standard `OTEL_*` variables keeps your OpenTelemetry configuration clean, portable, and separate from your application code. Every environment gets exactly the telemetry behavior it needs without a single `if` statement in your instrumentation.

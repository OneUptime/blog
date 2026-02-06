# How to Build an OpenTelemetry Sandbox Environment with Gitpod for Team Onboarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gitpod, Team Onboarding, Cloud IDE, Developer Experience

Description: Create a Gitpod-based OpenTelemetry sandbox environment that new team members can use to learn instrumentation hands-on.

Onboarding new developers to a codebase with OpenTelemetry instrumentation can be slow. They need to understand the SDK, the collector, and how traces flow through the system. A Gitpod sandbox gives new team members a pre-built environment where they can experiment with instrumentation, see traces in real time, and learn by doing. This post shows you how to build one.

## Why Gitpod for Onboarding

Gitpod spins up cloud development environments from a Git repository. New developers click a link and get a fully configured workspace in their browser. No local setup, no dependency conflicts, no "it works on my machine" issues.

For an OpenTelemetry sandbox, this means the collector, trace viewer, and sample application are all running and connected from the moment the workspace starts.

## The Gitpod Configuration

Create a `.gitpod.yml` file in your repository:

```yaml
image:
  file: .gitpod.Dockerfile

tasks:
  - name: Start Observability Stack
    init: docker compose -f docker-compose.otel.yml pull
    command: docker compose -f docker-compose.otel.yml up -d

  - name: Install Dependencies
    init: npm install
    command: |
      echo "Waiting for collector to be ready..."
      sleep 5
      echo "Run 'npm start' to launch the sample app"
      echo "Jaeger UI: $(gp url 16686)"

ports:
  - port: 3000
    onOpen: ignore
    visibility: public
  - port: 4317
    onOpen: ignore
  - port: 4318
    onOpen: ignore
  - port: 16686
    onOpen: open-preview
    visibility: public
```

The configuration starts the observability stack automatically and opens the Jaeger UI in a preview pane. New developers see traces immediately.

## The Gitpod Dockerfile

Create `.gitpod.Dockerfile`:

```dockerfile
FROM gitpod/workspace-full

# Install Docker Compose (Gitpod workspace-full includes Docker)
RUN sudo apt-get update && sudo apt-get install -y docker-compose-plugin

# Pre-install OpenTelemetry packages
RUN npm install -g \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/auto-instrumentations-node
```

## The Observability Stack

Create `docker-compose.otel.yml`:

```yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    volumes:
      - ./sandbox/collector-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

And `sandbox/collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, debug]
```

## The Sample Application

Create a simple application that new developers can modify. This is the hands-on part of the sandbox.

```javascript
// sandbox/app.js - Sample instrumented application
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { trace } = require('@opentelemetry/api');

// Initialize the SDK
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'sandbox-app',
});
sdk.start();

const express = require('express');
const app = express();
const tracer = trace.getTracer('sandbox');

// Exercise 1: This endpoint has basic auto-instrumentation
app.get('/', (req, res) => {
  res.json({ message: 'Hello from the sandbox!' });
});

// Exercise 2: This endpoint uses manual instrumentation
app.get('/process', (req, res) => {
  tracer.startActiveSpan('process-request', (span) => {
    // Add attributes to help identify this span in Jaeger
    span.setAttribute('request.type', 'sandbox-exercise');

    // Simulate some work
    const result = heavyComputation();
    span.setAttribute('result.value', result);

    span.end();
    res.json({ result });
  });
});

// Exercise 3: Add your own instrumented endpoint below
// Hint: Use tracer.startActiveSpan() to create a span
// Add attributes with span.setAttribute()
// Remember to call span.end() when done

function heavyComputation() {
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += Math.random();
  }
  return sum;
}

app.listen(3000, () => {
  console.log('Sandbox app running on port 3000');
  console.log('Try these endpoints:');
  console.log('  GET / - Basic auto-instrumented endpoint');
  console.log('  GET /process - Manually instrumented endpoint');
});
```

## The Onboarding Guide

Create a `sandbox/EXERCISES.md` file that guides new developers through learning exercises:

```markdown
# OpenTelemetry Sandbox Exercises

## Exercise 1: Explore Auto-Instrumentation
1. Run `node sandbox/app.js`
2. Hit http://localhost:3000/ a few times
3. Open Jaeger and find the traces for "sandbox-app"
4. Examine the auto-generated spans for the HTTP request

## Exercise 2: Understand Manual Instrumentation
1. Hit http://localhost:3000/process
2. Find the trace in Jaeger
3. Notice the custom span "process-request" with its attributes
4. Look at the code in sandbox/app.js to see how it was created

## Exercise 3: Add Your Own Instrumentation
1. Add a new endpoint to sandbox/app.js
2. Create a custom span with meaningful attributes
3. Add nested spans to represent sub-operations
4. Verify your spans appear in Jaeger

## Exercise 4: Experiment with Errors
1. Add an endpoint that throws an error
2. Use span.recordException() to record it
3. Set span.setStatus() to mark it as an error
4. Find the error trace in Jaeger and examine the details
```

## Sharing the Sandbox

The best part about Gitpod is sharing. Generate a link that anyone on your team can click:

```
https://gitpod.io/#https://github.com/your-org/your-repo
```

Put this link in your onboarding documentation, team wiki, or Slack channel. A new developer clicks it, waits a minute or two for the workspace to build, and starts the exercises. No local setup required.

## Keeping It Fresh

Update the sandbox periodically to reflect your team's current practices. If you adopt new instrumentation patterns or switch to a different collector configuration, update the sandbox so new team members learn the current approach from day one.

Pre-build the workspace to speed up startup times:

```yaml
# Add to .gitpod.yml
github:
  prebuilds:
    master: true
    branches: true
    pullRequests: true
    addBadge: true
```

This tells Gitpod to build the workspace image ahead of time. When someone opens the workspace, it starts in seconds instead of minutes.

A well-maintained sandbox reduces onboarding time from days to hours and ensures every developer on your team has a solid understanding of how OpenTelemetry works in your system.

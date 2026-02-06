# How to Configure OpenTelemetry in DevPod Cloud Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DevPod, Cloud Development, Instrumentation, Developer Experience

Description: Configure OpenTelemetry instrumentation inside DevPod cloud development environments for consistent observability across your team.

DevPod is an open-source tool that creates reproducible development environments on any infrastructure. Unlike vendor-locked solutions, DevPod works with Docker, Kubernetes, AWS, GCP, and Azure. Adding OpenTelemetry to your DevPod configuration means every developer gets pre-configured tracing regardless of where their environment runs.

## Understanding DevPod Workspaces

DevPod uses a `devcontainer.json` specification (the same one VS Code uses) but adds the flexibility of running on remote providers. Your configuration lives in the repository, and DevPod spins up an environment matching that spec wherever you point it.

The key insight is that OpenTelemetry setup becomes part of your workspace definition, not something each developer does manually.

## Setting Up the Workspace Configuration

Create a `.devcontainer/devcontainer.json` in your project:

```json
{
  "name": "OTel-Enabled Workspace",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  },
  "forwardPorts": [4317, 4318, 16686],
  "postCreateCommand": "bash .devcontainer/setup-otel.sh",
  "containerEnv": {
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_SERVICE_NAME": "devpod-app",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp"
  }
}
```

The `containerEnv` section sets the standard OTEL environment variables so any OpenTelemetry SDK will automatically know where to send data. The `postCreateCommand` runs a script that starts the observability stack.

## The Setup Script

Create `.devcontainer/setup-otel.sh`:

```bash
#!/bin/bash
set -e

echo "Starting OpenTelemetry infrastructure..."

# Create a Docker network for the observability stack
docker network create otel-net 2>/dev/null || true

# Start Jaeger for trace visualization
docker run -d --name jaeger \
  --network otel-net \
  -p 16686:16686 \
  jaegertracing/all-in-one:1.54

# Write the collector config
mkdir -p /tmp/otel
cat > /tmp/otel/collector-config.yaml << 'YAML'
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

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
YAML

# Start the OpenTelemetry Collector
docker run -d --name otel-collector \
  --network otel-net \
  -p 4317:4317 \
  -p 4318:4318 \
  -v /tmp/otel/collector-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:0.96.0

echo "OpenTelemetry Collector running on ports 4317 (gRPC) and 4318 (HTTP)"
echo "Jaeger UI available at http://localhost:16686"
```

Make it executable:

```bash
chmod +x .devcontainer/setup-otel.sh
```

## Launching the DevPod Workspace

Install DevPod on your machine and create a workspace from your repository:

```bash
# Create a workspace using Docker as the provider
devpod up github.com/your-org/your-repo --provider docker

# Or use a cloud provider like AWS
devpod up github.com/your-org/your-repo --provider aws
```

DevPod pulls the repository, builds the container from your `devcontainer.json`, and runs the post-create script. Within a few minutes, you have a full development environment with OpenTelemetry infrastructure running.

## Connecting Your IDE

DevPod supports VS Code and JetBrains IDEs. Connect to your workspace:

```bash
# Open in VS Code
devpod up your-workspace --ide vscode

# Open in JetBrains (e.g., IntelliJ)
devpod up your-workspace --ide intellij
```

Your IDE connects to the remote workspace, and port forwarding makes the Jaeger UI and collector ports available locally.

## Instrumenting Your Application

With the environment variables already set, your application needs minimal configuration. Here is a Node.js Express example:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// The SDK reads OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_SERVICE_NAME
// from environment variables automatically
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Because `OTEL_EXPORTER_OTLP_ENDPOINT` is already set in the container environment, the exporter connects to the collector without any hardcoded URLs.

## Team Workflow

The real benefit shows up when the whole team uses DevPod. Every developer gets the same observability stack:

1. Clone the repo (or let DevPod do it)
2. Run `devpod up` with their preferred provider
3. Start coding with tracing already working

No more "works on my machine" issues with tracing configuration. No more skipping instrumentation because the setup is too complicated.

## Provider-Specific Considerations

When running on cloud providers, be aware of resource allocation. The OpenTelemetry Collector and Jaeger are lightweight, but they do consume memory:

```bash
# Check resource usage inside the workspace
docker stats --no-stream
```

For AWS or GCP providers, make sure your instance type has at least 4GB of RAM. The default DevPod instance sizes usually cover this, but it is worth verifying if traces are not showing up.

## Cleanup

DevPod makes cleanup straightforward:

```bash
# Stop the workspace (preserves state)
devpod stop your-workspace

# Delete the workspace entirely
devpod delete your-workspace
```

This is especially useful with cloud providers where you want to avoid unnecessary costs. Stop the workspace when you take a break, and delete it when you finish the task.

Adding OpenTelemetry to your DevPod configuration is a one-time investment that pays off every time a developer starts a new workspace. The traces are there from the first request, giving your team visibility into application behavior right from the start of development.

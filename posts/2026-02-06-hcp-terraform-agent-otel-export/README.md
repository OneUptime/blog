# How to Configure HCP Terraform Agent Telemetry Export via OpenTelemetry Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HCP Terraform, Terraform Cloud, Agent Telemetry

Description: Configure HCP Terraform agents to export operational telemetry via OpenTelemetry Protocol for visibility into cloud runs.

HCP Terraform (formerly Terraform Cloud) runs your Terraform operations in managed agents. Getting visibility into what those agents are doing, how long runs take, and where failures occur is critical for platform teams. This post shows how to configure HCP Terraform agents to export telemetry data using the OpenTelemetry Protocol.

## Why Monitor HCP Terraform Agents

When your organization has hundreds of Terraform workspaces running through HCP Terraform, understanding operational health becomes important:

- Which workspaces have the slowest plan times?
- How often do applies fail, and for which providers?
- Are agents running out of memory or CPU?
- What is the queue wait time before a run starts?

## Agent Architecture

HCP Terraform agents run in your infrastructure but are orchestrated by HCP Terraform. You control the agent environment, which means you can install an OpenTelemetry Collector alongside the agent and configure it to capture telemetry.

## Setting Up the OTel Collector Sidecar

Deploy the Collector as a sidecar to the HCP Terraform agent:

```yaml
# docker-compose.yaml for self-hosted agents
version: "3.8"
services:
  tfc-agent:
    image: hashicorp/tfc-agent:latest
    environment:
      TFC_AGENT_TOKEN: ${TFC_AGENT_TOKEN}
      TFC_AGENT_NAME: agent-otel-enabled
      # Point Terraform provider logs to a file the Collector can tail
      TF_LOG: JSON
      TF_LOG_PATH: /var/log/terraform/terraform.log
      # OpenTelemetry environment variables
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      OTEL_SERVICE_NAME: hcp-terraform-agent
      OTEL_RESOURCE_ATTRIBUTES: >
        agent.name=agent-01,
        agent.pool=production,
        cloud.provider=aws,
        deployment.environment=production
    volumes:
      - terraform-logs:/var/log/terraform
      - agent-hooks:/opt/tfc-agent/hooks

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
      - terraform-logs:/var/log/terraform:ro
    ports:
      - "4317:4317"

volumes:
  terraform-logs:
  agent-hooks:
```

## Collector Configuration

Configure the Collector to capture agent metrics, Terraform logs, and hook-generated traces:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Tail Terraform JSON logs
  filelog:
    include:
      - /var/log/terraform/*.log
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: "2006-01-02T15:04:05.000Z"
      - type: severity_parser
        parse_from: attributes.level
        mapping:
          error: error
          warn: warn
          info: info
          debug: debug

  # Collect agent host metrics
  hostmetrics:
    collection_interval: 15s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      process:
        include:
          match_type: regexp
          names: ["terraform.*", "tfc-agent.*"]

processors:
  batch:
    send_batch_size: 2048
    timeout: 5s

  resource:
    attributes:
      - key: service.name
        value: hcp-terraform-agent
        action: upsert
      - key: agent.pool
        value: production
        action: upsert

exporters:
  otlphttp:
    endpoint: https://your-backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp]
    logs:
      receivers: [filelog]
      processors: [resource, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [hostmetrics]
      processors: [resource, batch]
      exporters: [otlphttp]
```

## Using Agent Hooks for Tracing

HCP Terraform agents support pre-plan, pre-apply, and post-apply hooks. Use these to create OpenTelemetry spans:

```bash
#!/bin/bash
# /opt/tfc-agent/hooks/pre-plan.sh

# Extract workspace info from environment
WORKSPACE_NAME="${TFC_WORKSPACE_NAME:-unknown}"
RUN_ID="${TFC_RUN_ID:-unknown}"

# Create a span using the otel-cli tool
otel-cli span \
  --service "hcp-terraform" \
  --name "terraform.plan.${WORKSPACE_NAME}" \
  --attrs "workspace.name=${WORKSPACE_NAME},run.id=${RUN_ID},hook.type=pre-plan" \
  --tp-print \
  > /tmp/otel-span-context.txt

echo "Started tracing for workspace: ${WORKSPACE_NAME}, run: ${RUN_ID}"
```

```bash
#!/bin/bash
# /opt/tfc-agent/hooks/post-apply.sh

WORKSPACE_NAME="${TFC_WORKSPACE_NAME:-unknown}"
RUN_ID="${TFC_RUN_ID:-unknown}"

# Read the parent context from the pre-plan hook
PARENT_CTX=""
if [ -f /tmp/otel-span-context.txt ]; then
  PARENT_CTX="--tp-carrier /tmp/otel-span-context.txt"
fi

# Determine if the apply succeeded
if [ "${TFC_RUN_STATUS}" = "applied" ]; then
  STATUS="ok"
else
  STATUS="error"
fi

otel-cli span \
  --service "hcp-terraform" \
  --name "terraform.apply.${WORKSPACE_NAME}.complete" \
  --attrs "workspace.name=${WORKSPACE_NAME},run.id=${RUN_ID},run.status=${TFC_RUN_STATUS},hook.type=post-apply" \
  --status "${STATUS}" \
  ${PARENT_CTX}

# Clean up
rm -f /tmp/otel-span-context.txt
```

## Kubernetes Agent Deployment

For production, deploy agents in Kubernetes with the Collector as a sidecar:

```yaml
# agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfc-agent
  namespace: terraform
spec:
  replicas: 5
  selector:
    matchLabels:
      app: tfc-agent
  template:
    metadata:
      labels:
        app: tfc-agent
    spec:
      containers:
        - name: tfc-agent
          image: hashicorp/tfc-agent:latest
          env:
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfc-agent-secret
                  key: token
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: http://localhost:4317
          volumeMounts:
            - name: hooks
              mountPath: /opt/tfc-agent/hooks

        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config", "/etc/otel/config.yaml"]
          volumeMounts:
            - name: collector-config
              mountPath: /etc/otel

      volumes:
        - name: hooks
          configMap:
            name: tfc-agent-hooks
            defaultMode: 0755
        - name: collector-config
          configMap:
            name: otel-collector-config
```

## Wrapping Up

Exporting telemetry from HCP Terraform agents gives platform teams the visibility they need to manage hundreds of Terraform workspaces effectively. By combining agent hooks for tracing, file log collection, and host metrics, you get a complete picture of every Terraform run from queue time through apply completion.

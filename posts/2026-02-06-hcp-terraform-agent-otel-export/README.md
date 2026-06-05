# How to Configure HCP Terraform Agent Telemetry Export via OpenTelemetry Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HCP Terraform, Terraform Cloud, Agent Telemetry

Description: Configure HCP Terraform agents to export operational telemetry via OpenTelemetry Protocol for visibility into cloud runs.

HCP Terraform (formerly Terraform Cloud) can run your Terraform operations in self-managed agents. Getting visibility into what those agents are doing, how long runs take, and where failures occur is critical for platform teams. This post shows how to configure HCP Terraform agents to export telemetry data using the OpenTelemetry Protocol.

## Why Monitor HCP Terraform Agents

When your organization has hundreds of Terraform workspaces running through HCP Terraform, understanding operational health becomes important:

- Which workspaces have the slowest plan times?
- How often do applies fail, and for which providers?
- Are agents running out of memory or CPU?
- How long does the agent spend fetching and handling run jobs?

## Agent Architecture

HCP Terraform agents run in your infrastructure but are orchestrated by HCP Terraform. You control the agent environment, which means you can configure the agent to emit OpenTelemetry Protocol telemetry to a Collector running alongside it.

## Setting Up the OTel Collector Sidecar

Deploy the Collector as a sidecar to the HCP Terraform agent:

```yaml
# docker-compose.yaml for self-hosted agents

version: "3.8"
services:
  tfc-agent:
    # Custom image based on hashicorp/tfc-agent:latest that includes otel-cli.
    image: hashicorp/tfc-agent:otel-hooks
    environment:
      TFC_AGENT_TOKEN: ${TFC_AGENT_TOKEN}
      TFC_AGENT_NAME: agent-otel-enabled
      TFC_AGENT_DATA_DIR: /home/tfc-agent/.tfc-agent
      # HCP Terraform agent telemetry uses this agent-specific setting.
      TFC_AGENT_OTLP_ADDRESS: otel-collector:4317
      # Point Terraform provider logs to a file the Collector can tail
      TF_LOG: JSON
      TF_LOG_PATH: /var/log/terraform/terraform.log
      # OpenTelemetry environment variables for hook scripts that use otel-cli
      OTEL_EXPORTER_OTLP_ENDPOINT: otel-collector:4317
      OTEL_SERVICE_NAME: hcp-terraform-agent
      OTEL_RESOURCE_ATTRIBUTES: >
        agent.name=agent-01,
        agent.pool=production,
        cloud.provider=aws,
        deployment.environment=production
    volumes:
      - terraform-logs:/var/log/terraform
      - ./hooks:/home/tfc-agent/.tfc-agent/hooks:ro

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
      - terraform-logs:/var/log/terraform:ro
    ports:
      - "4317:4317"

volumes:
  terraform-logs:
```

## Collector Configuration

Configure the Collector to capture HCP Terraform agent telemetry, Terraform logs, and hook-generated traces:

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
          parse_from: attributes["@timestamp"]
          layout: "%Y-%m-%dT%H:%M:%S.%fZ"
        severity:
          parse_from: attributes["@level"]

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

HCP Terraform agents support pre-plan, post-plan, pre-apply, and post-apply hooks. Use these to create OpenTelemetry spans:

```bash
#!/bin/bash
# /home/tfc-agent/.tfc-agent/hooks/terraform-pre-apply

# Extract workspace info from environment
WORKSPACE_NAME="${TFC_WORKSPACE_NAME:-unknown}"
RUN_ID="${TFC_RUN_ID:-unknown}"

# Create a span using the otel-cli tool
otel-cli span \
  --service "hcp-terraform" \
  --name "terraform.apply.${WORKSPACE_NAME}.start" \
  --attrs "workspace.name=${WORKSPACE_NAME},run.id=${RUN_ID},hook.type=pre-apply" \
  --tp-print \
  > /tmp/otel-span-context.txt

echo "Started apply tracing for workspace: ${WORKSPACE_NAME}, run: ${RUN_ID}"
```

```bash
#!/bin/bash
# /home/tfc-agent/.tfc-agent/hooks/terraform-post-apply

WORKSPACE_NAME="${TFC_WORKSPACE_NAME:-unknown}"
RUN_ID="${TFC_RUN_ID:-unknown}"

# Read the parent context from the pre-apply hook
PARENT_CTX=""
if [ -f /tmp/otel-span-context.txt ]; then
  PARENT_CTX="--tp-carrier /tmp/otel-span-context.txt"
fi

otel-cli span \
  --service "hcp-terraform" \
  --name "terraform.apply.${WORKSPACE_NAME}.complete" \
  --attrs "workspace.name=${WORKSPACE_NAME},run.id=${RUN_ID},hook.type=post-apply" \
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
          # Custom image based on hashicorp/tfc-agent:latest that includes otel-cli.
          image: hashicorp/tfc-agent:otel-hooks
          env:
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfc-agent-secret
                  key: token
            - name: TFC_AGENT_DATA_DIR
              value: /home/tfc-agent/.tfc-agent
            - name: TFC_AGENT_OTLP_ADDRESS
              value: localhost:4317
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: localhost:4317
          volumeMounts:
            - name: hooks
              mountPath: /home/tfc-agent/.tfc-agent/hooks

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

Exporting telemetry from HCP Terraform agents gives platform teams the visibility they need to manage hundreds of Terraform workspaces effectively. By combining native agent telemetry, hook spans, file log collection, and host metrics, you get a more complete picture of every Terraform run from job handling through apply completion.

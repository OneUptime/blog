# How to Use OpAMP with BindPlane for GUI-Based Collector Fleet Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, BindPlane, Fleet Management GUI

Description: Use BindPlane as a graphical management interface on top of OpAMP to visually manage your OpenTelemetry Collector fleet without writing code.

Not everyone on your team wants to interact with the OpAMP server through code or API calls. BindPlane OP (by observIQ) provides a full graphical user interface for managing OpenTelemetry Collector fleets using OpAMP under the hood. It gives you point-and-click configuration management, visual fleet monitoring, and drag-and-drop pipeline building.

## What BindPlane OP Offers

BindPlane OP is an open-source management platform for OpenTelemetry Collectors that uses OpAMP as its communication protocol. It adds a web UI on top of the raw OpAMP protocol, giving you:

- A visual dashboard showing all connected collectors and their health
- A configuration editor with validation
- Pipeline builder with visual receiver/processor/exporter chains
- Group-based configuration management
- Rollout history and audit logs

## Installing BindPlane OP

BindPlane OP can be installed as a standalone binary or run in a container. Here is the Docker approach:

```bash
# Pull the BindPlane OP image
docker pull ghcr.io/observiq/bindplane-op:latest

# Run with default settings
docker run -d \
  --name bindplane \
  -p 3001:3001 \
  -v bindplane-data:/data \
  ghcr.io/observiq/bindplane-op:latest \
  serve \
  --host 0.0.0.0 \
  --port 3001 \
  --storage-dir /data
```

For a production setup, use a proper configuration file:

```yaml
# bindplane-config.yaml
host: 0.0.0.0
port: 3001

# Storage backend
storage:
  type: bbolt
  bbolt:
    path: /data/bindplane.db

# Authentication
auth:
  type: basic
  basic:
    username: admin
    password: "${BINDPLANE_PASSWORD}"

# OpAMP server settings
opamp:
  listenAddress: 0.0.0.0:4320
  tls:
    certFile: /etc/bindplane/tls/server.crt
    keyFile: /etc/bindplane/tls/server.key
```

Run with the config file:

```bash
docker run -d \
  --name bindplane \
  -p 3001:3001 \
  -p 4320:4320 \
  -v bindplane-data:/data \
  -v ./bindplane-config.yaml:/etc/bindplane/config.yaml \
  -v ./tls:/etc/bindplane/tls \
  -e BINDPLANE_PASSWORD=your-secure-password \
  ghcr.io/observiq/bindplane-op:latest \
  serve --config /etc/bindplane/config.yaml
```

## Connecting Collectors to BindPlane

Install the observIQ collector distribution (which includes OpAMP supervisor support) on your hosts:

```bash
# Install on Linux using the install script
curl -fsS https://install.observiq.com | bash -s -- \
  --endpoint ws://bindplane-server:4320/v1/opamp \
  --labels "env=production,region=us-east-1,team=platform"
```

Or configure an existing OpenTelemetry Collector with the OpAMP supervisor pointing to BindPlane:

```yaml
# supervisor.yaml
server:
  endpoint: ws://bindplane-server:4320/v1/opamp

agent:
  executable: /usr/local/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor

  # Labels that appear in the BindPlane UI
  description:
    identifying_attributes:
      service.name: "otel-collector"
      service.instance.id: "collector-prod-001"
    non_identifying_attributes:
      os.type: "linux"
      host.name: "prod-node-001"

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
  reports_own_metrics: true
  accepts_packages: true
```

## Using the BindPlane Web UI

Once your collectors connect, open the BindPlane UI at `http://bindplane-server:3001`. You will see:

### The Agents Page
This shows every connected collector with its status, version, labels, and last heartbeat time. You can filter agents by label, search by hostname, and see at a glance which agents are healthy.

### Creating a Configuration
Navigate to Configurations and click "Create Configuration". The visual editor lets you build a pipeline:

1. Select receivers (OTLP, Prometheus, filelog, etc.)
2. Add processors (batch, filter, transform, etc.)
3. Choose exporters (OTLP, Prometheus Remote Write, etc.)
4. Configure each component through form fields

Behind the scenes, BindPlane generates the YAML configuration and pushes it to agents through OpAMP.

### Applying Configurations to Agent Groups

BindPlane uses labels to organize agents into groups. Apply a configuration to a group using the CLI:

```bash
# Using the BindPlane CLI
bindplanectl apply configuration \
  --name "production-traces" \
  --file production-traces-config.yaml

# Assign the configuration to agents with matching labels
bindplanectl apply agent-group \
  --name "production-collectors" \
  --selector "env=production" \
  --configuration "production-traces"
```

All agents matching the `env=production` label selector will receive the configuration automatically.

## Managing Configurations with the CLI

BindPlane also has a CLI for automation:

```bash
# List all connected agents
bindplanectl get agents

# View a specific agent's details
bindplanectl get agent collector-prod-001

# List all configurations
bindplanectl get configurations

# Export a configuration to YAML
bindplanectl get configuration production-traces -o yaml > backup.yaml

# Apply a configuration from file
bindplanectl apply -f new-config.yaml

# View rollout status
bindplanectl get rollouts
```

## Integrating BindPlane with CI/CD

Store your configurations in Git and apply them through your CI/CD pipeline:

```yaml
# .github/workflows/deploy-collector-config.yaml
name: Deploy Collector Config
on:
  push:
    branches: [main]
    paths: ['collector-configs/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install BindPlane CLI
        run: |
          curl -L https://github.com/observIQ/bindplane-op/releases/latest/download/bindplanectl-linux-amd64 -o bindplanectl
          chmod +x bindplanectl

      - name: Apply Configurations
        env:
          BINDPLANE_ENDPOINT: ${{ secrets.BINDPLANE_ENDPOINT }}
          BINDPLANE_USERNAME: ${{ secrets.BINDPLANE_USERNAME }}
          BINDPLANE_PASSWORD: ${{ secrets.BINDPLANE_PASSWORD }}
        run: |
          for config in collector-configs/*.yaml; do
            ./bindplanectl apply -f "$config"
          done
```

BindPlane bridges the gap between the raw power of OpAMP and the usability that operations teams need day to day. You get the protocol-level benefits of OpAMP with a visual interface that anyone on the team can use to understand the state of the collector fleet.

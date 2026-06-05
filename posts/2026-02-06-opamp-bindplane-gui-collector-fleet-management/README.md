# How to Use OpAMP with BindPlane for GUI-Based Collector Fleet Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, BindPlane, Fleet Management GUI

Description: Use BindPlane as a graphical management interface on top of OpAMP to visually manage your OpenTelemetry Collector fleet without writing code.

Not everyone on your team wants to interact with the OpAMP server through code or API calls. Bindplane (by observIQ) provides a full graphical user interface for managing OpenTelemetry Collector fleets using OpAMP under the hood. It gives you point-and-click configuration management, visual fleet monitoring, and drag-and-drop pipeline building.

## What Bindplane Offers

Bindplane is a management platform for OpenTelemetry Collectors that uses OpAMP as its communication protocol. It adds a web UI on top of the raw OpAMP protocol, giving you:

- A visual dashboard showing all connected collectors and their health
- A configuration editor with validation
- Pipeline builder with visual receiver/processor/exporter chains
- Group-based configuration management
- Rollout history and audit logs

## Installing Bindplane

Bindplane can be installed as a standalone binary or run in a container. Here is the Docker Compose approach:

```yaml
# docker-compose.yaml
version: "3"

volumes:
  bindplane:
  prometheus:

services:
  bindplane:
    container_name: bindplane-server
    restart: always
    image: ghcr.io/observiq/bindplane-ee:latest
    ports:
      - "3001:3001"
    environment:
      - BINDPLANE_LICENSE=${BINDPLANE_LICENSE}
      - BINDPLANE_USERNAME=admin
      - BINDPLANE_PASSWORD=${BINDPLANE_PASSWORD}
      - BINDPLANE_REMOTE_URL=http://localhost:3001
      - BINDPLANE_SESSION_SECRET=${BINDPLANE_SESSION_SECRET}
      - BINDPLANE_LOG_OUTPUT=stdout
      - BINDPLANE_ACCEPT_EULA=true
      - BINDPLANE_PROMETHEUS_ENABLE=true
      - BINDPLANE_PROMETHEUS_ENABLE_REMOTE=true
      - BINDPLANE_PROMETHEUS_HOST=prometheus
      - BINDPLANE_PROMETHEUS_PORT=9090
      - BINDPLANE_TRANSFORM_AGENT_ENABLE_REMOTE=true
      - BINDPLANE_TRANSFORM_AGENT_REMOTE_AGENTS=transform:4568
      - BINDPLANE_STORE_TYPE=postgres
      - BINDPLANE_POSTGRES_HOST=postgres
      - BINDPLANE_POSTGRES_PORT=5432
      - BINDPLANE_POSTGRES_DATABASE=bindplane
      - BINDPLANE_POSTGRES_USERNAME=bindplane
      - BINDPLANE_POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      - postgres
      - prometheus
      - transform
  postgres:
    container_name: bindplane-postgres
    restart: always
    image: postgres:16
    environment:
      - POSTGRES_DB=bindplane
      - POSTGRES_USER=bindplane
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - bindplane:/var/lib/postgresql/data
  prometheus:
    container_name: bindplane-prometheus
    restart: always
    image: ghcr.io/observiq/bindplane-prometheus:latest
    volumes:
      - prometheus:/prometheus
  transform:
    container_name: bindplane-transform-agent
    restart: always
    image: ghcr.io/observiq/bindplane-transform-agent:latest
```

For a production setup, use a proper configuration file:

```yaml
# bindplane-config.yaml
apiVersion: bindplane.observiq.com/v1

network:
  host: 0.0.0.0
  port: "3001"
  remoteURL: https://bindplane.example.com
  tlsCert: /etc/bindplane/tls/server.crt
  tlsKey: /etc/bindplane/tls/server.key

# Storage backend
store:
  type: postgres
  postgres:
    host: postgres
    port: "5432"
    database: bindplane
    sslmode: disable
    username: bindplane
    password: "${POSTGRES_PASSWORD}"

# Authentication
auth:
  username: admin
  password: "${BINDPLANE_PASSWORD}"
  secretKey: "${BINDPLANE_SECRET_KEY}"
  sessionSecret: "${BINDPLANE_SESSION_SECRET}"
```

Run Docker Compose with the required secrets:

```bash
export BINDPLANE_LICENSE=your-license-key
export BINDPLANE_PASSWORD=your-secure-password
export BINDPLANE_SECRET_KEY=$(uuidgen)
export BINDPLANE_SESSION_SECRET=$(uuidgen)
export POSTGRES_PASSWORD=your-postgres-password

docker compose up -d
```

## Connecting Collectors to BindPlane

Install the Bindplane Distro for OpenTelemetry (BDOT) Collector on your hosts. In the Bindplane UI, go to the Agents page, select Install Agent, and copy the generated install command. For containerized collectors, the OpAMP settings are provided as environment variables:

```yaml
volumes:
  bdot-collector-storage:

services:
  bdot-collector:
    image: ghcr.io/observiq/bindplane-agent:latest
    container_name: bdot-collector
    hostname: bdot-collector
    volumes:
      - bdot-collector-storage:/etc/otel/storage
    environment:
      OPAMP_ENDPOINT: "ws://bindplane-server:3001/v1/opamp"
      OPAMP_SECRET_KEY: "<YOUR_BINDPLANE_SECRET_KEY>"
      OPAMP_LABELS: "env=production,region=us-east-1,team=platform"
      MANAGER_YAML_PATH: /etc/otel/storage/manager.yaml
```

Or configure a custom OpenTelemetry Collector distribution with the OpAMP supervisor pointing to BindPlane:

```yaml
# supervisor.yaml
server:
  endpoint: ws://bindplane-server:3001/v1/opamp
  headers:
    Authorization: "Secret-Key <YOUR_BINDPLANE_SECRET_KEY>"
  tls:
    insecure: true

agent:
  executable: /usr/local/bin/otelcol-contrib
  config_apply_timeout: 30s
  bootstrap_timeout: 5s

  # Labels that appear in the BindPlane UI
  description:
    identifying_attributes:
      service.name: "otel-collector"
      service.instance.id: "collector-prod-001"
    non_identifying_attributes:
      os.type: "linux"
      host.name: "prod-node-001"

storage:
  directory: /var/lib/opamp-supervisor

capabilities:
  accepts_remote_config: true
  reports_remote_config: true
  reports_available_components: true
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

### Applying Configurations to Fleets

BindPlane uses labels to organize agents into fleets. Apply a configuration to a fleet using the CLI:

```bash
# Using the BindPlane CLI
bindplane apply -f production-traces-config.yaml

# Assign the configuration to a fleet with matching labels
bindplane apply -f production-collectors-fleet.yaml
```

All agents matching the fleet's label selector will receive the configuration automatically after the configuration has been rolled out.

## Managing Configurations with the CLI

BindPlane also has a CLI for automation:

```bash
# List all connected agents
bindplane get agents

# View a specific agent's details
bindplane get agent collector-prod-001

# List all configurations
bindplane get configurations

# Export a configuration to YAML
bindplane get configuration production-traces --export --output yaml > backup.yaml

# Apply a configuration from file
bindplane apply -f new-config.yaml

# View rollout status
bindplane rollout status production-traces
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
          mkdir -p ~/bindplane
          curl -L -o ~/bindplane/bindplane.zip https://storage.googleapis.com/bindplane-op-releases/bindplane/latest/bindplane-ee-linux-amd64.zip
          unzip ~/bindplane/bindplane.zip -d ~/bindplane/
          sudo mv ~/bindplane/bindplane /usr/local/bin/bindplane

      - name: Apply Configurations
        env:
          BINDPLANE_ENDPOINT: ${{ secrets.BINDPLANE_ENDPOINT }}
          BINDPLANE_USERNAME: ${{ secrets.BINDPLANE_USERNAME }}
          BINDPLANE_PASSWORD: ${{ secrets.BINDPLANE_PASSWORD }}
        run: |
          bindplane profile set ci \
            --remote-url "$BINDPLANE_ENDPOINT" \
            --username "$BINDPLANE_USERNAME" \
            --password "$BINDPLANE_PASSWORD"
          bindplane profile use ci

          for config in collector-configs/*.yaml; do
            bindplane apply -f "$config"
          done
```

BindPlane bridges the gap between the raw power of OpAMP and the usability that operations teams need day to day. You get the protocol-level benefits of OpAMP with a visual interface that anyone on the team can use to understand the state of the collector fleet.

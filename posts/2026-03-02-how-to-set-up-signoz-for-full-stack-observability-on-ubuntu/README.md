# How to Set Up SigNoz for Full-Stack Observability on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Observability, Monitoring, OpenTelemetry, Docker

Description: A practical guide to deploying SigNoz on Ubuntu for full-stack observability, covering installation, configuration, and instrumentation of your applications.

---

Modern applications span multiple services, databases, and external dependencies. When something breaks, you need traces, metrics, and logs in one place. SigNoz is an open-source observability platform built on OpenTelemetry that gives you exactly that without the licensing costs of Datadog or New Relic.

This guide walks through setting up SigNoz on Ubuntu, instrumenting an application, and getting meaningful dashboards running.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker Engine 20.10+ and Docker Compose v2
- At least 8 GB RAM (16 GB recommended for production)
- 4 CPU cores
- 50 GB disk space for data retention

## Installing Docker

SigNoz ships as a Docker Compose stack. If Docker is not installed:

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group change without logging out
newgrp docker

# Verify
docker --version
docker compose version
```

## Deploying SigNoz

SigNoz provides a script that clones the repository and starts all services:

```bash
# Clone the SigNoz repository
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy

# Review the docker-compose file before running it
cat docker-compose.yaml

# Start SigNoz (this pulls several images - give it a few minutes)
./install.sh
```

The stack starts these containers:

- **ClickHouse** - columnar database for traces and logs
- **Zookeeper** - coordination for ClickHouse cluster
- **otel-collector** - receives telemetry from your apps
- **query-service** - backend API for the SigNoz UI
- **frontend** - the web dashboard

Check that everything is up:

```bash
docker compose -f docker-compose.yaml ps
```

Access the UI at `http://your-server-ip:3301`. On first visit, create your admin account.

## Configuring the OpenTelemetry Collector

SigNoz uses an OpenTelemetry Collector as the telemetry ingestion point. The collector config is at `deploy/docker/clickhouse-setup/otel-collector-config.yaml`.

By default, it listens on these ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 4317 | gRPC | OTLP traces, metrics, logs |
| 4318 | HTTP | OTLP traces, metrics, logs |

To accept telemetry from external hosts, ensure your firewall allows these ports:

```bash
# Open OTLP ports (adjust if using ufw)
sudo ufw allow 4317/tcp
sudo ufw allow 4318/tcp
sudo ufw allow 3301/tcp  # UI access
```

## Instrumenting a Node.js Application

Install the OpenTelemetry SDK:

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc
```

Create a tracing setup file `tracing.js`:

```javascript
// tracing.js - load this before your main app code
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const sdk = new NodeSDK({
  // Point to your SigNoz collector endpoint
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://your-signoz-host:4317',
  }),
  // Auto-instrument Express, HTTP, MongoDB, Redis, etc.
  instrumentations: [getNodeAutoInstrumentations()],
  // Service name appears in SigNoz service map
  serviceName: 'my-api-service',
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Start your app with tracing:

```bash
node -r ./tracing.js server.js
```

## Instrumenting a Python Application

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

Run your Flask or FastAPI app with auto-instrumentation:

```bash
# Set environment variables for the collector endpoint and service name
export OTEL_EXPORTER_OTLP_ENDPOINT="http://your-signoz-host:4318"
export OTEL_SERVICE_NAME="my-python-service"

# opentelemetry-instrument wraps your app and handles all instrumentation
opentelemetry-instrument python app.py
```

## Sending Logs to SigNoz

SigNoz can ingest logs through the OpenTelemetry Collector. Configure a file log receiver in the collector config:

```yaml
# Add to otel-collector-config.yaml receivers section
receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    operators:
      # Parse JSON log lines
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

# Add to service pipelines
service:
  pipelines:
    logs:
      receivers: [filelog, otlp]
      processors: [batch]
      exporters: [clickhouselogsexporter]
```

Restart the collector after config changes:

```bash
docker compose -f docker-compose.yaml restart otel-collector
```

## Setting Up Alerts

SigNoz supports metric-based alerting. Navigate to Alerts in the sidebar and create a new alert:

1. Choose a metric (e.g., `signoz_calls_total`)
2. Set a condition (e.g., error rate > 5%)
3. Configure a notification channel (Slack, PagerDuty, email)

For Slack notifications, add a webhook URL under Settings > Alert Channels.

## Persisting Data

By default, data lives in Docker volumes. For production, mount named volumes to dedicated disk paths:

```yaml
# In docker-compose.yaml, update the ClickHouse volume mounts
volumes:
  signoz-clickhouse-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/signoz/clickhouse
```

Create the directory first:

```bash
sudo mkdir -p /data/signoz/clickhouse
sudo chown -R 101:101 /data/signoz/clickhouse  # ClickHouse UID
```

## Upgrading SigNoz

```bash
cd signoz/deploy

# Pull the latest changes
git pull

# Pull new images and recreate containers
docker compose -f docker-compose.yaml pull
docker compose -f docker-compose.yaml up -d
```

## Retention and Storage Management

ClickHouse handles data retention through TTL settings. The default is 3 days for traces. To extend it, set the `STORAGE` environment variable before starting:

```bash
# Set 15-day retention (in hours: 15 * 24 = 360)
export STORAGE=360
./install.sh
```

Or modify the ClickHouse TTL directly:

```bash
# Connect to ClickHouse
docker exec -it signoz-clickhouse clickhouse-client

# Check current TTL on the traces table
SHOW CREATE TABLE signoz_traces.signoz_index_v2;
```

## Monitoring SigNoz Itself

SigNoz exposes its own internal metrics. You can create dashboards to track:

- Collector throughput (spans/sec, bytes/sec)
- ClickHouse insert latency
- Query service response times

These are available under the built-in `signoz-*` services in the service map.

## Troubleshooting Common Issues

**Traces not appearing:**
```bash
# Check if the collector is receiving data
docker logs signoz-otel-collector --tail 50

# Verify the endpoint is reachable from your app host
curl -v http://your-signoz-host:4318/v1/traces
```

**High memory usage:**
ClickHouse is memory-hungry. If the server is running out of RAM, reduce the `max_memory_usage` setting in the ClickHouse configuration or add more RAM.

**Frontend not loading:**
```bash
# Check if query-service is healthy
docker logs signoz-query-service --tail 100
```

SigNoz gives you a solid foundation for observability without vendor lock-in. Once traces are flowing, explore the service map to understand dependencies, use the trace explorer to debug slow requests, and set up dashboards for your key business metrics.

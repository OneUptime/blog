# How to Run InfluxDB in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, InfluxDB, Time Series, Monitoring, Metric

Description: Learn how to run InfluxDB in a Podman container with persistent storage, automated setup, and data ingestion using the Flux query language.

---

> InfluxDB in Podman provides a purpose-built time-series database in a rootless container ready for metrics, IoT, and real-time analytics.

InfluxDB is a high-performance time-series database designed for storing and querying large volumes of timestamped data. Running it in a Podman container simplifies deployment, provides consistent environments, and makes it easy to manage the database lifecycle. This guide covers setup, automated initialization, data ingestion, querying with Flux, and persistent storage.

---

## Pulling the InfluxDB Image

Download the official InfluxDB 2.x image.

```bash
# Pull a specific InfluxDB 2.x image

podman pull docker.io/library/influxdb:2.7

# Verify the image
podman images | grep influxdb
```

## Running a Basic InfluxDB Container

Start InfluxDB with default settings.

```bash
# Run InfluxDB in detached mode
podman run -d \
  --name my-influxdb \
  -p 8086:8086 \
  influxdb:2.7

# Check the container is running
podman ps

# Verify InfluxDB is responding
curl -s http://localhost:8086/health | python3 -m json.tool
```

## Automated Setup with Environment Variables

Initialize InfluxDB with a user, organization, and bucket on first start.

```bash
# Create a volume for persistent data
podman volume create influxdb-data

# Run InfluxDB with automated setup
podman run -d \
  --name influxdb-setup \
  -p 8087:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=admin-secret-password \
  -e DOCKER_INFLUXDB_INIT_ORG=myorg \
  -e DOCKER_INFLUXDB_INIT_BUCKET=mybucket \
  -e DOCKER_INFLUXDB_INIT_RETENTION=30d \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-token \
  -v influxdb-data:/var/lib/influxdb2:Z \
  influxdb:2.7

# Wait for setup to complete
sleep 5

# Verify the setup using the API token
curl -s -H "Authorization: Token my-super-secret-token" \
  http://localhost:8087/api/v2/orgs | python3 -m json.tool | head -15
```

## Writing Data to InfluxDB

Ingest time-series data using the Line Protocol.

```bash
# Write a single data point using the InfluxDB Line Protocol
curl -s -X POST "http://localhost:8087/api/v2/write?org=myorg&bucket=mybucket&precision=s" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: text/plain" \
  --data-raw "cpu,host=server01,region=us-east usage_idle=85.5,usage_system=10.2 $(date +%s)"

# Write multiple data points at once
cat <<'EOF' | curl -s -X POST "http://localhost:8087/api/v2/write?org=myorg&bucket=mybucket&precision=s" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: text/plain" \
  --data-binary @-
cpu,host=server01,region=us-east usage_idle=82.1,usage_system=12.3
cpu,host=server02,region=us-west usage_idle=90.3,usage_system=5.1
memory,host=server01 used_percent=65.4,available=8589934592
memory,host=server02 used_percent=45.2,available=12884901888
EOF

echo "Data written successfully"
```

## Querying Data with Flux

Use the Flux query language to retrieve and analyze data.

```bash
# Query CPU usage data from the last hour
curl -s -X POST "http://localhost:8087/api/v2/query?org=myorg" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: application/vnd.flux" \
  --data 'from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")'

# Query with aggregation - average CPU by host
curl -s -X POST "http://localhost:8087/api/v2/query?org=myorg" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: application/vnd.flux" \
  --data 'from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> mean()
  |> group(columns: ["host"])'
```

## Managing Buckets and Organizations

Use the InfluxDB CLI inside the container for administrative tasks.

```bash
# List all buckets
podman exec influxdb-setup influx bucket list \
  --token my-super-secret-token

# Create a new bucket with 7-day retention
podman exec influxdb-setup influx bucket create \
  --name logs-bucket \
  --retention 7d \
  --org myorg \
  --token my-super-secret-token

# List all organizations
podman exec influxdb-setup influx org list \
  --token my-super-secret-token

# Create an API token with read-only access
podman exec influxdb-setup influx auth create \
  --org myorg \
  --read-buckets \
  --description "Read-only token" \
  --token my-super-secret-token
```

## Custom InfluxDB Configuration

Mount a custom configuration file for advanced settings.

```bash
# Create a config directory
mkdir -p ~/influxdb-config

# Write a custom InfluxDB configuration
cat > ~/influxdb-config/config.toml <<'EOF'
# InfluxDB 2.x configuration
bolt-path = "/var/lib/influxdb2/influxd.bolt"
engine-path = "/var/lib/influxdb2/engine"
http-bind-address = ":8086"
storage-wal-max-concurrent-writes = 128
storage-wal-max-write-delay = "10m"
query-concurrency = 10
query-queue-size = 100
EOF

# Run InfluxDB with custom config
podman run -d \
  --name influxdb-custom \
  -p 8088:8086 \
  -v ~/influxdb-config/config.toml:/etc/influxdb2/config.toml:Z \
  -v influxdb-data:/var/lib/influxdb2:Z \
  influxdb:2.7
```

## Managing the Container

Common management operations.

```bash
# View InfluxDB logs
podman logs influxdb-setup

# Stop and start
podman stop influxdb-setup
podman start influxdb-setup

# Remove containers and volumes
podman rm -f my-influxdb influxdb-setup influxdb-custom
podman volume rm influxdb-data
```

## Summary

Running InfluxDB in a Podman container gives you a purpose-built time-series database with automated setup and persistent storage. Environment variables handle initial configuration including user creation, organization setup, and bucket provisioning. The Line Protocol API makes data ingestion straightforward, while Flux queries provide powerful analytics capabilities. Named volumes ensure your data persists, and the InfluxDB CLI simplifies bucket and token management. Podman's rootless mode provides security isolation for your metrics infrastructure.

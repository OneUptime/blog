# How to Deploy InfluxDB via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, InfluxDB, Time Series, Metric, Telegraf, Grafana

Description: Learn how to deploy InfluxDB 2.x via Portainer for time-series data storage, along with Telegraf for metrics collection and Grafana for visualization.

---

InfluxDB is a purpose-built time-series database ideal for metrics, IoT data, and monitoring. This guide deploys InfluxDB 2.x with Telegraf and Grafana as a complete observability stack.

## Stack Definition

```yaml
version: "3.8"

services:
  influxdb:
    image: influxdb:2.7-alpine
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: adminpassword
      DOCKER_INFLUXDB_INIT_ORG: myorg
      DOCKER_INFLUXDB_INIT_BUCKET: metrics
      DOCKER_INFLUXDB_INIT_RETENTION: 30d
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: my-super-secret-token
    ports:
      - "8086:8086"
    volumes:
      - influxdb_data:/var/lib/influxdb2
      - influxdb_config:/etc/influxdb2
    networks:
      - metrics_net
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  telegraf:
    image: telegraf:1.29-alpine
    volumes:
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - metrics_net
    depends_on:
      influxdb:
        condition: service_healthy

  grafana:
    image: grafana/grafana:10.3.1
    environment:
      GF_SECURITY_ADMIN_PASSWORD: grafanapassword
      GF_INSTALL_PLUGINS: grafana-clock-panel
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - metrics_net
    depends_on:
      - influxdb

volumes:
  influxdb_data:
  influxdb_config:
  grafana_data:

networks:
  metrics_net:
    driver: bridge
```

## Telegraf Configuration

Create `telegraf.conf` to scrape Docker metrics and write to InfluxDB:

```toml
[agent]
  interval = "10s"
  flush_interval = "10s"

[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "my-super-secret-token"
  organization = "myorg"
  bucket = "metrics"

[[inputs.docker]]
  endpoint = "unix:///var/run/docker.sock"
  gather_services = false
  container_names = []
  source_tag = false
  container_name_include = []
  container_name_exclude = []
  timeout = "5s"
  perdevice = true
  total = false

[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false

[[inputs.mem]]

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]
```

## Writing Data with the InfluxDB CLI

Use the `influx` CLI inside the container for quick writes and queries:

```bash
# Write a test data point

docker exec -it $(docker ps -qf name=influxdb) influx write \
  --org myorg \
  --bucket metrics \
  --token my-super-secret-token \
  "temperature,location=server_room value=23.5"

# Query the last 5 minutes of temperature data
docker exec -it $(docker ps -qf name=influxdb) influx query \
  --org myorg \
  --token my-super-secret-token \
  'from(bucket:"metrics") |> range(start: -5m) |> filter(fn: (r) => r._measurement == "temperature")'
```

## Writing Data from an Application

Use the InfluxDB client library for programmatic writes:

```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(
    url="http://influxdb:8086",
    token="my-super-secret-token",
    org="myorg"
)

write_api = client.write_api(write_options=SYNCHRONOUS)

point = Point("cpu_usage") \
    .tag("host", "server1") \
    .field("value", 75.4)

write_api.write(bucket="metrics", record=point)
```

## Grafana Dashboard Setup

In Grafana, add InfluxDB as a data source:

1. Go to **Connections > Data sources > Add new data source**.
2. Select **InfluxDB** and choose query language **Flux**.
3. Set URL to `http://influxdb:8086`.
4. Set organization, token, and default bucket.
5. Click **Save & Test**.

Import the official Docker monitoring dashboard (ID `1150`) or build custom panels using Flux queries.

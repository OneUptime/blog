# How to Use Dapr InfluxDB Output Binding for Time-Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, InfluxDB, Time-Series, Observability

Description: Learn how to configure the Dapr InfluxDB output binding to write time-series metrics and events from microservices to an InfluxDB instance.

---

## Why InfluxDB for Time-Series Data

InfluxDB is optimized for high-frequency time-series data like metrics, IoT sensor readings, and application performance data. The Dapr InfluxDB binding lets any service write data points without managing InfluxDB client libraries.

## Start InfluxDB Locally

```bash
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=adminpass \
  -e DOCKER_INFLUXDB_INIT_ORG=myorg \
  -e DOCKER_INFLUXDB_INIT_BUCKET=metrics \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-token \
  influxdb:2
```

## Configure the InfluxDB Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: influxdb-metrics
spec:
  type: bindings.influx
  version: v1
  metadata:
  - name: url
    value: http://localhost:8086
  - name: token
    secretKeyRef:
      name: influxdb-secret
      key: token
  - name: org
    value: myorg
  - name: bucket
    value: metrics
```

## Write a Data Point

```bash
curl -X POST http://localhost:3500/v1.0/bindings/influxdb-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "measurement": "cpu_usage",
      "tags": "host=server-01,region=us-east",
      "values": "value=72.5"
    }
  }'
```

The `data` field is a JSON object with three keys: `measurement` (the metric name), `tags` (comma-separated tag key=value pairs), and `values` (comma-separated field key=value pairs).

## Write Multiple Data Points

The binding writes one data point per request. To write multiple points, make separate calls:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/influxdb-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "measurement": "cpu",
      "tags": "host=web-01",
      "values": "value=45.2"
    }
  }'

curl -X POST http://localhost:3500/v1.0/bindings/influxdb-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "measurement": "memory",
      "tags": "host=web-01",
      "values": "used=2048,total=8192"
    }
  }'

curl -X POST http://localhost:3500/v1.0/bindings/influxdb-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "measurement": "disk",
      "tags": "host=web-01,path=/",
      "values": "used_percent=68.4"
    }
  }'
```

## Application Code for Writing Metrics

```python
import requests

class MetricsWriter:
    def __init__(self, dapr_port: int = 3500):
        self.url = f"http://localhost:{dapr_port}/v1.0/bindings/influxdb-metrics"

    def write(self, measurement: str, values: dict, tags: dict = None):
        tags_str = ""
        if tags:
            tags_str = ",".join(f"{k}={v}" for k, v in tags.items())

        values_str = ",".join(f"{k}={v}" for k, v in values.items())

        data = {
            "measurement": measurement,
            "tags": tags_str,
            "values": values_str,
        }

        requests.post(
            self.url,
            json={"operation": "create", "data": data},
        )

metrics = MetricsWriter()

# Write application metrics
metrics.write(
    measurement="request_duration",
    values={"duration_ms": 142, "status": 200},
    tags={"service": "order-api", "endpoint": "/orders"},
)
```

## Writing Multiple Points in a Loop

```python
def write_point(measurement: str, tags: str, values: str):
    requests.post(
        "http://localhost:3500/v1.0/bindings/influxdb-metrics",
        json={
            "operation": "create",
            "data": {
                "measurement": measurement,
                "tags": tags,
                "values": values,
            },
        },
    )

# Write each sensor reading as a separate data point
for reading in sensor_readings:
    write_point(
        measurement="temperature",
        tags=f"sensor={reading.id}",
        values=f"value={reading.temp}",
    )
```

## Summary

The Dapr InfluxDB output binding enables any microservice to write time-series data to InfluxDB. Configure the URL, token, org, and bucket in the component YAML, then POST JSON data objects with `measurement`, `tags`, and `values` fields to the binding endpoint.

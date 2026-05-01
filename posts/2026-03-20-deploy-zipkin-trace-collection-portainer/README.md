# How to Deploy Zipkin for Trace Collection via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Zipkin, Distributed Tracing, Portainer, Docker, Observability, Microservice

Description: Deploy Zipkin for distributed trace collection using Portainer, configure persistent MySQL storage, and connect your services to start visualizing request flows.

---

Zipkin is a battle-tested distributed tracing system with a simple HTTP API and a built-in web UI. It's lightweight, easy to set up, and supports many language instrumentation libraries. Deploying it via Portainer takes under five minutes.

## Step 1: Deploy Zipkin Stack in Portainer

Go to **Stacks > Add Stack** and use the following definition. This setup includes Zipkin with the `zipkin-mysql` test image and a persistent volume:

```yaml
# zipkin-stack.yml

version: "3.8"

services:
  zipkin:
    image: ghcr.io/openzipkin/zipkin:3.6.1
    environment:
      # Use MySQL for persistent trace storage
      - STORAGE_TYPE=mysql
      - MYSQL_HOST=zipkin-db
      - MYSQL_USER=zipkin
      - MYSQL_PASS=zipkin
    ports:
      - "9411:9411"   # Zipkin HTTP API and UI
    depends_on:
      - zipkin-db
    restart: unless-stopped
    networks:
      - zipkin-net

  zipkin-db:
    image: ghcr.io/openzipkin/zipkin-mysql:3.6.1
    volumes:
      - zipkin-mysql-data:/mysql/data
    networks:
      - zipkin-net

networks:
  zipkin-net:
    driver: bridge

volumes:
  zipkin-mysql-data:
```

## Step 2: Access the Zipkin UI

Once deployed, navigate to `http://<host>:9411/zipkin`. The UI allows you to:

- Search traces by service name, span name, and time range
- View the waterfall diagram for each trace
- Inspect span tags and annotations

## Step 3: Send Traces from Your Applications

Zipkin supports multiple protocols. The simplest is the HTTP JSON reporter:

```python
# Python example using py_zipkin
from py_zipkin.encoding import Encoding
from py_zipkin.transport import SimpleHTTPTransport
from py_zipkin.zipkin import zipkin_span

transport = SimpleHTTPTransport(address="zipkin", port=9411)

@zipkin_span(
    service_name="payment-service",
    span_name="process_payment",
    transport_handler=transport,
    sample_rate=100.0,
    encoding=Encoding.V2_JSON,
)
def process_payment(order_id):
    # Your business logic here
    return {"status": "ok"}
```

For applications already using OpenTelemetry, you can export traces to Zipkin from the OTel Collector. Add the Zipkin exporter to your OTel pipeline:

```yaml
# In your OTel Collector config
exporters:
  zipkin:
    # Send spans to Zipkin's HTTP API
    endpoint: "http://zipkin:9411/api/v2/spans"

service:
  pipelines:
    traces:
      exporters: [zipkin]
```

## Step 4: Configure Sampling

For production use, enable probabilistic sampling to avoid collecting every trace:

```bash
# Set in the Zipkin service environment in Portainer
COLLECTOR_SAMPLE_RATE=0.1   # Collect 10% of traces
```

## Step 5: Use Cassandra for Higher-Volume Environments

Replace MySQL with Cassandra for higher write throughput. The `zipkin-cassandra` image shown below is intended for demos and integration tests:

```yaml
services:
  zipkin:
    image: ghcr.io/openzipkin/zipkin:3.6.1
    environment:
      - STORAGE_TYPE=cassandra3
      - CASSANDRA_ENSURE_SCHEMA=false
      - CASSANDRA_CONTACT_POINTS=cassandra
    depends_on:
      - cassandra

  cassandra:
    image: ghcr.io/openzipkin/zipkin-cassandra:3.6.1
    volumes:
      - zipkin-cassandra-data:/cassandra/data
```

## Portainer Tips

- Use Portainer's **Environment Variables** section to store credentials without hardcoding them in the stack YAML
- Enable **auto-restart** on the stack so Zipkin comes back after host reboots
- Use Portainer's log viewer to monitor Zipkin startup for storage connection errors

## Summary

Zipkin is one of the easiest distributed tracing backends to run. With Portainer stacks, you can deploy it with a database backend, configure persistence, and have traces flowing in minutes.

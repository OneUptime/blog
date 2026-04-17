# How to Deploy Zipkin for Trace Collection via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Zipkin, Distributed Tracing, Observability, Microservice

Description: Deploy Zipkin trace collection and visualization via Portainer to track request flows across microservices with a simple, resource-efficient distributed tracing solution.

## Introduction

Zipkin is a lightweight, battle-tested distributed tracing system originally developed at Twitter. It has a smaller footprint than Jaeger and simpler configuration, making it ideal for smaller deployments or as a getting-started tracing solution. Zipkin supports multiple storage backends (in-memory, MySQL, Cassandra, Elasticsearch) and has client libraries in virtually every language. This guide covers deploying Zipkin via Portainer with MySQL storage and service instrumentation.

## Step 1: Deploy Zipkin All-In-One (Development)

```yaml
# docker-compose.yml - Zipkin all-in-one (in-memory storage)

version: "3.8"

services:
  zipkin:
    image: openzipkin/zipkin:latest
    container_name: zipkin
    restart: unless-stopped
    ports:
      - "9411:9411"   # Zipkin UI and API
    environment:
      # In-memory storage for development
      - STORAGE_TYPE=mem
      - MEM_MAX_SPANS=500000   # Keep 500K spans in memory
    networks:
      - tracing_net
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://localhost:9411/health"]
      interval: 30s
      timeout: 5s
      retries: 5

networks:
  tracing_net:
    driver: bridge
    name: tracing_net
```

## Step 2: Deploy Zipkin with MySQL Storage (Production)

```yaml
# docker-compose.yml - Zipkin with MySQL persistence
version: "3.8"

services:
  zipkin:
    image: openzipkin/zipkin:latest
    container_name: zipkin
    restart: unless-stopped
    environment:
      - STORAGE_TYPE=mysql
      - MYSQL_HOST=zipkin-mysql
      - MYSQL_DB=zipkin
      - MYSQL_USER=zipkin
      - MYSQL_PASS=zipkin_password
      - MYSQL_MAX_CONNECTIONS=10
      # How far back the query API will look (retention is managed by the storage backend, not this setting)
      - QUERY_LOOKBACK=604800000  # milliseconds (7 days)
    ports:
      - "9411:9411"
    networks:
      - tracing_net
    depends_on:
      zipkin-mysql:
        condition: service_healthy

  # MySQL storage backend
  zipkin-mysql:
    image: openzipkin/zipkin-mysql:latest  # Pre-configured schema
    container_name: zipkin_mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
    volumes:
      - zipkin_mysql_data:/var/lib/mysql
    networks:
      - tracing_net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-uzipkin", "-pzipkin_password"]
      interval: 10s
      timeout: 5s
      retries: 10

  # Zipkin Dependencies job (computes service dependency graph)
  # This is a one-shot Apache Spark batch job that processes the current day's
  # spans and then exits. Run it on a schedule (cron / CronJob) near end-of-day
  # UTC rather than as a long-running container.
  zipkin-dependencies:
    image: openzipkin/zipkin-dependencies:latest
    container_name: zipkin_dependencies
    restart: "no"
    environment:
      - STORAGE_TYPE=mysql
      - MYSQL_HOST=zipkin-mysql
      - MYSQL_DB=zipkin
      - MYSQL_USER=zipkin
      - MYSQL_PASS=zipkin_password
    networks:
      - tracing_net
    depends_on:
      - zipkin-mysql

volumes:
  zipkin_mysql_data:

networks:
  tracing_net:
    driver: bridge
    name: tracing_net
```

## Step 3: Instrument a Spring Boot Service

```xml
<!-- pom.xml - Spring Boot Zipkin integration -->
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
  <groupId>io.zipkin.reporter2</groupId>
  <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
# application.yml - Spring Boot 3.x Zipkin config (Micrometer Tracing)
spring:
  application:
    name: user-service

management:
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
  tracing:
    sampling:
      probability: 0.1  # 10% sampling in production (use 1.0 in dev)
```

## Step 4: Instrument a Python Service

```python
# main.py - Python service with Zipkin tracing
from flask import Flask
from py_zipkin.zipkin import zipkin_span, ZipkinAttrs
from py_zipkin.transport import SimpleHTTPTransport
import functools

app = Flask(__name__)

# Configure Zipkin transport (host and port are separate positional args)
zipkin_transport = SimpleHTTPTransport("zipkin", 9411)

def http_transport(encoded_span):
    zipkin_transport.send(encoded_span)

@app.before_request
def start_trace():
    # Extract trace context from incoming headers
    pass

@app.route("/api/users/<user_id>")
def get_user(user_id):
    with zipkin_span(
        service_name="user-service",
        span_name="get_user",
        transport_handler=http_transport,
        sample_rate=10,  # 10% sampling
        annotations={"user.id": user_id}
    ):
        user = db.get_user(user_id)
        return {"id": user_id, "name": user["name"]}
```

```python
# OpenTelemetry with Zipkin exporter (modern approach)
from opentelemetry import trace
from opentelemetry.exporter.zipkin.json import ZipkinExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# Configure Zipkin exporter
zipkin_exporter = ZipkinExporter(
    endpoint="http://zipkin:9411/api/v2/spans"
)

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(zipkin_exporter))
trace.set_tracer_provider(provider)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
```

## Step 5: Deploy Instrumented Services to Portainer

```yaml
# docker-compose.yml - Application services with Zipkin
version: "3.8"

services:
  user-service:
    image: myapp/user-service:latest
    environment:
      - ZIPKIN_BASE_URL=http://zipkin:9411
      - SERVICE_NAME=user-service
      - SAMPLE_RATE=0.1   # 10% in production
    networks:
      - app_net
      - tracing_net  # Must be on same network as Zipkin

  order-service:
    image: myapp/order-service:latest
    environment:
      - ZIPKIN_BASE_URL=http://zipkin:9411
      - SERVICE_NAME=order-service
      - SAMPLE_RATE=0.1
    networks:
      - app_net
      - tracing_net

  payment-service:
    image: myapp/payment-service:latest
    environment:
      - ZIPKIN_BASE_URL=http://zipkin:9411
      - SERVICE_NAME=payment-service
      - SAMPLE_RATE=1.0   # 100% sampling for critical payment paths
    networks:
      - app_net
      - tracing_net

networks:
  app_net:
    driver: bridge
  tracing_net:
    external: true
```

## Step 6: Use Zipkin API for Programmatic Trace Analysis

```bash
# Zipkin HTTP API queries

# Find traces by service and duration
curl -s "http://localhost:9411/api/v2/traces?serviceName=user-service&minDuration=1000000" | \
  jq '.[].[] | {traceId: .traceId, duration: .duration, name: .name}'
# Duration is in microseconds

# Find traces with specific tags
curl -s "http://localhost:9411/api/v2/traces?serviceName=api&annotationQuery=error=true" | \
  jq '.[].[] | select(.tags.error == "true") | .traceId'

# Get service dependency graph
curl -s "http://localhost:9411/api/v2/dependencies?endTs=$(date +%s)000&lookback=86400000" | \
  jq '.[] | "\(.parent) -> \(.child): \(.callCount) calls"'

# Get all service names
curl -s "http://localhost:9411/api/v2/services" | jq '.[]'

# Get all spans for a trace
curl -s "http://localhost:9411/api/v2/trace/YOUR_TRACE_ID" | \
  jq '.[] | {id: .id, name: .name, duration: .duration, service: .localEndpoint.serviceName}'
```

## Conclusion

Zipkin provides distributed tracing with minimal operational overhead. The MySQL storage backend with the `openzipkin/zipkin-mysql` image comes pre-configured with the correct schema, making deployment straightforward. The `zipkin-dependencies` service computes the service dependency graph daily, showing you which services call which - invaluable for understanding microservice architectures. Zipkin's API supports both the native Zipkin format and B3 propagation headers, ensuring compatibility with virtually any tracing client library. For large-scale deployments, switch to Elasticsearch storage, which Zipkin supports natively. Portainer manages the complete tracing stack alongside your application services, with a single redeploy command to update Zipkin when new versions are released.

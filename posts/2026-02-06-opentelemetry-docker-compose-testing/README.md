# How to Test OpenTelemetry Instrumentation in Docker Compose Environments Before Kubernetes Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Compose, Testing, Pre-Kubernetes, Integration Testing

Description: Validate your OpenTelemetry instrumentation in Docker Compose before deploying to Kubernetes to catch configuration issues early.

Deploying OpenTelemetry instrumentation directly to Kubernetes without testing locally is a recipe for frustration. Environment variables get misconfigured, collector endpoints are wrong, and context propagation breaks across service boundaries. Docker Compose lets you spin up your entire stack locally with the exact same OpenTelemetry configuration and verify everything works before it goes near a cluster.

## The Docker Compose Test Stack

Build a compose file that mirrors your production setup: your services, an OpenTelemetry Collector, and a lightweight trace backend for verification.

```yaml
# docker-compose.test.yaml
version: '3.8'

services:
  # Your application services
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8080:8080"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=api-gateway
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=test
      - ORDER_SERVICE_URL=http://order-service:8081
    depends_on:
      - otel-collector
      - order-service

  order-service:
    build: ./services/order-service
    ports:
      - "8081:8081"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=order-service
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=test
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/orders
      - PAYMENT_SERVICE_URL=http://payment-service:8082
    depends_on:
      - otel-collector
      - postgres

  payment-service:
    build: ./services/payment-service
    ports:
      - "8082:8082"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=payment-service
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=test
    depends_on:
      - otel-collector

  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml
    command: ["--config", "/etc/otel/config.yaml"]
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"

  # Jaeger for trace visualization during testing
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14250:14250"  # gRPC

  # PostgreSQL for the order service
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

## Collector Configuration for Testing

Configure the collector to export to Jaeger for visual inspection and to a file for automated validation:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 128

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  file:
    path: /tmp/traces.json
    rotation:
      max_megabytes: 10

  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, file, debug]
```

## Writing the Integration Test Script

Create a test script that starts the stack, sends requests, and validates the traces:

```bash
#!/bin/bash
# test-otel-integration.sh
set -e

echo "Starting test stack..."
docker compose -f docker-compose.test.yaml up -d --build --wait

# Wait for services to be healthy
echo "Waiting for services to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "Services are ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Services did not become ready in time."
    docker compose -f docker-compose.test.yaml logs
    exit 1
  fi
  sleep 2
done

echo "Sending test requests..."
# Create an order (triggers spans across all three services)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "items": [{"sku": "WIDGET-1", "qty": 2}]}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" -ne 201 ]; then
  echo "FAIL: Expected 201, got $HTTP_CODE"
  echo "Body: $BODY"
  exit 1
fi

echo "Order created successfully. Waiting for traces to flush..."
sleep 5

echo "Validating traces..."
python3 validate_traces.py

echo "All validations passed."
docker compose -f docker-compose.test.yaml down
```

## The Trace Validation Script

```python
# validate_traces.py
import requests
import sys

JAEGER_URL = "http://localhost:16686"

def get_traces(service_name, limit=10):
    """Fetch recent traces from Jaeger for a service."""
    resp = requests.get(f"{JAEGER_URL}/api/traces", params={
        "service": service_name,
        "limit": limit,
        "lookback": "1h",
    })
    return resp.json().get("data", [])

def validate():
    errors = []

    # Check 1: All services are reporting traces
    for service in ["api-gateway", "order-service", "payment-service"]:
        traces = get_traces(service)
        if not traces:
            errors.append(f"No traces found for service '{service}'")
            continue
        print(f"Found {len(traces)} traces for {service}")

    # Check 2: Traces span multiple services (context propagation works)
    gateway_traces = get_traces("api-gateway")
    if gateway_traces:
        trace = gateway_traces[0]
        services_in_trace = set()
        for span in trace.get("spans", []):
            process_id = span.get("processID")
            process = trace.get("processes", {}).get(process_id, {})
            svc = process.get("serviceName", "unknown")
            services_in_trace.add(svc)

        expected_services = {"api-gateway", "order-service", "payment-service"}
        missing = expected_services - services_in_trace
        if missing:
            errors.append(
                f"Context propagation broken. Missing services in trace: {missing}. "
                f"Found: {services_in_trace}"
            )
        else:
            print(f"Context propagation verified: {services_in_trace}")

    # Check 3: Spans have expected attributes
    for trace in gateway_traces[:1]:
        for span in trace.get("spans", []):
            tags = {t["key"]: t["value"] for t in span.get("tags", [])}
            if span.get("operationName", "").startswith("POST"):
                if "http.response.status_code" not in tags and "http.status_code" not in tags:
                    errors.append(
                        f"Span '{span['operationName']}' missing HTTP status code attribute"
                    )

    # Check 4: No orphan spans (all non-root spans have parents)
    for trace in gateway_traces[:1]:
        span_ids = {s["spanID"] for s in trace.get("spans", [])}
        for span in trace.get("spans", []):
            refs = span.get("references", [])
            if refs:
                parent_id = refs[0].get("spanID")
                if parent_id not in span_ids:
                    errors.append(
                        f"Orphan span detected: '{span['operationName']}' "
                        f"references parent {parent_id} not in trace"
                    )

    if errors:
        print("\nValidation FAILED:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nAll validations passed.")

if __name__ == "__main__":
    validate()
```

## Comparing Docker Compose Config with Kubernetes Manifests

A useful bonus step is to verify that your Docker Compose environment variables match your Kubernetes manifests:

```python
# compare_configs.py
import yaml
import re

def extract_otel_env(compose_file):
    """Extract OTEL_ environment variables from docker-compose."""
    with open(compose_file) as f:
        compose = yaml.safe_load(f)

    env_vars = {}
    for svc_name, svc in compose.get("services", {}).items():
        env_list = svc.get("environment", [])
        otel_vars = {}
        for env in env_list:
            if isinstance(env, str) and env.startswith("OTEL_"):
                key, value = env.split("=", 1)
                otel_vars[key] = value
        if otel_vars:
            env_vars[svc_name] = otel_vars
    return env_vars

def extract_k8s_env(deployment_file):
    """Extract OTEL_ environment variables from a Kubernetes deployment."""
    with open(deployment_file) as f:
        docs = list(yaml.safe_load_all(f))

    env_vars = {}
    for doc in docs:
        if doc and doc.get("kind") == "Deployment":
            name = doc["metadata"]["name"]
            containers = doc["spec"]["template"]["spec"]["containers"]
            for container in containers:
                otel_vars = {}
                for env in container.get("env", []):
                    if env["name"].startswith("OTEL_"):
                        otel_vars[env["name"]] = env.get("value", "<from-ref>")
                if otel_vars:
                    env_vars[name] = otel_vars
    return env_vars

# Compare and report differences
compose_env = extract_otel_env("docker-compose.test.yaml")
k8s_env = extract_k8s_env("k8s/deployments.yaml")

for service in compose_env:
    k8s_match = k8s_env.get(service, {})
    for key in compose_env[service]:
        if key not in k8s_match:
            print(f"WARNING: {service} has {key} in Compose but not in K8s")
```

Testing your OpenTelemetry setup in Docker Compose before deploying to Kubernetes saves hours of debugging in a more complex environment. The traces either show up correctly in Jaeger or they do not, and you can fix the problem on your laptop instead of SSHing into pods.

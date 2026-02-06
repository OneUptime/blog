# How to Set Up Trace-Based Testing with Tracetest and the OpenTelemetry Collector in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracetest, CI/CD, Testing

Description: Set up trace-based testing with Tracetest and the OpenTelemetry Collector to validate distributed system behavior in your CI/CD pipeline.

Traditional integration tests verify that an API returns the right response. But in a distributed system, the response only tells you half the story. Did the request hit the cache or the database? Did it call the downstream payment service? Was the message published to the correct queue? Trace-based testing answers these questions by asserting on the spans your application produces, not just the HTTP response.

Tracetest is a tool built specifically for this purpose. It triggers a request, waits for the resulting trace to be collected, and then runs assertions against the spans. This post walks through setting it up with the OpenTelemetry Collector in a CI/CD pipeline.

## Architecture

The setup involves four components:

1. **Your application** - instrumented with OpenTelemetry, exporting traces via OTLP.
2. **OpenTelemetry Collector** - receives traces and forwards them to both your observability backend and Tracetest.
3. **Tracetest server** - stores traces and runs test assertions.
4. **Tracetest CLI** - triggers tests and reports results (used in CI/CD).

## Setting Up the OpenTelemetry Collector

The Collector needs to forward traces to Tracetest in addition to your regular backend:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  # Your regular observability backend
  otlp/backend:
    endpoint: "https://otel-backend:4317"

  # Tracetest OTLP ingestion endpoint
  otlp/tracetest:
    endpoint: "tracetest:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/backend, otlp/tracetest]
```

## Docker Compose Setup

Here is a docker-compose file that runs all the components together:

```yaml
# docker-compose.yaml
version: "3.9"
services:
  # Your application
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=my-api
    depends_on:
      - otel-collector

  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - tracetest

  # Tracetest server
  tracetest:
    image: kubeshop/tracetest:latest
    ports:
      - "11633:11633"
    environment:
      TRACETEST_DEV: "true"
    volumes:
      - ./tracetest-config.yaml:/app/tracetest.yaml
      - ./tracetest-provision.yaml:/app/provisioning.yaml
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:11633"]
      interval: 5s
      timeout: 3s
      retries: 20

  # PostgreSQL for Tracetest
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tracetest
```

Tracetest configuration:

```yaml
# tracetest-config.yaml
postgres:
  host: postgres
  port: 5432
  user: postgres
  password: postgres
  dbname: tracetest

telemetry:
  exporters:
    collector:
      serviceName: tracetest
      sampling: 100
      exporter:
        type: collector
        collector:
          endpoint: otel-collector:4317

server:
  telemetry:
    exporter: collector
```

```yaml
# tracetest-provision.yaml
type: DataStore
spec:
  name: OpenTelemetry Collector
  type: otlp
  default: true
```

## Writing Your First Trace-Based Test

Tracetest tests are defined in YAML. Each test specifies a trigger (the request to make) and assertions (what the resulting trace should look like):

```yaml
# tests/test-create-order.yaml
type: Test
spec:
  name: "Create Order - Happy Path"
  description: "Verifies that creating an order produces the correct trace structure"

  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
        - key: Authorization
          value: "Bearer test-token-123"
      body: |
        {
          "product_id": "prod-456",
          "quantity": 2,
          "shipping_address": "123 Main St"
        }

  specs:
    # Assert on the HTTP response
    - selector: span[tracetest.span.type="http" name="POST /api/v1/orders"]
      name: "API returns 201 Created"
      assertions:
        - attr:http.status_code = 201

    # Assert that the order was saved to the database
    - selector: span[tracetest.span.type="database" name="INSERT orders"]
      name: "Order is persisted to the database"
      assertions:
        - attr:db.system = "postgresql"
        - attr:db.operation = "INSERT"
        - attr:db.sql.table = "orders"

    # Assert that the payment service was called
    - selector: span[tracetest.span.type="http" name="POST /api/v1/payments"]
      name: "Payment service is called"
      assertions:
        - attr:http.status_code = 200
        - attr:http.method = "POST"

    # Assert that an event was published to the message queue
    - selector: span[tracetest.span.type="messaging" name="orders.created publish"]
      name: "Order created event is published"
      assertions:
        - attr:messaging.system = "rabbitmq"
        - attr:messaging.destination.name = "orders.created"
        - attr:messaging.operation = "publish"

    # Assert the total trace duration is under 500ms
    - selector: span[tracetest.span.type="general" name="POST /api/v1/orders"]
      name: "Total request time is under 500ms"
      assertions:
        - attr:tracetest.span.duration < 500ms
```

## Running Tests Locally

Run the test using the Tracetest CLI:

```bash
# Install the CLI
curl -L https://raw.githubusercontent.com/kubeshop/tracetest/main/install-cli.sh | bash

# Configure the CLI to point to your Tracetest server
tracetest configure --server-url http://localhost:11633

# Run the test
tracetest run test --file tests/test-create-order.yaml --wait-for-result
```

The output looks like this:

```
Test "Create Order - Happy Path" - PASSED

  API returns 201 Created .................... PASSED
  Order is persisted to the database ......... PASSED
  Payment service is called .................. PASSED
  Order created event is published ........... PASSED
  Total request time is under 500ms .......... PASSED

  Duration: 1.2s
  Spans collected: 8
```

## Integrating with GitHub Actions

Here is a GitHub Actions workflow that runs trace-based tests on every pull request:

```yaml
# .github/workflows/trace-tests.yaml
name: Trace-Based Tests
on:
  pull_request:
    branches: [main]

jobs:
  trace-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose up -d --wait

      - name: Wait for services to be healthy
        run: |
          # Wait for the API to be ready
          timeout 60 bash -c 'until curl -s http://localhost:8080/health; do sleep 2; done'
          # Wait for Tracetest to be ready
          timeout 60 bash -c 'until curl -s http://localhost:11633; do sleep 2; done'

      - name: Install Tracetest CLI
        run: curl -L https://raw.githubusercontent.com/kubeshop/tracetest/main/install-cli.sh | bash

      - name: Configure Tracetest
        run: tracetest configure --server-url http://localhost:11633

      - name: Run trace-based tests
        run: |
          # Run all test files in the tests directory
          for test_file in tests/test-*.yaml; do
            echo "Running $test_file"
            tracetest run test --file "$test_file" --wait-for-result
          done

      - name: Collect logs on failure
        if: failure()
        run: docker compose logs > docker-compose-logs.txt

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: docker-compose-logs
          path: docker-compose-logs.txt

      - name: Cleanup
        if: always()
        run: docker compose down -v
```

## Writing More Test Cases

Here is a test that verifies error handling:

```yaml
# tests/test-order-validation-error.yaml
type: Test
spec:
  name: "Create Order - Validation Error"
  description: "Verifies proper error handling when order data is invalid"

  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: |
        {
          "product_id": "",
          "quantity": -1
        }

  specs:
    - selector: span[tracetest.span.type="http" name="POST /api/v1/orders"]
      name: "Returns 400 Bad Request"
      assertions:
        - attr:http.status_code = 400

    # The database should NOT be called for invalid requests
    - selector: span[tracetest.span.type="database"]
      name: "No database calls for invalid requests"
      assertions:
        - attr:tracetest.selected_spans.count = 0

    # The payment service should NOT be called
    - selector: span[tracetest.span.type="http" name="POST /api/v1/payments"]
      name: "Payment service is not called"
      assertions:
        - attr:tracetest.selected_spans.count = 0
```

## Summary

Trace-based testing with Tracetest fills a gap that traditional integration tests cannot cover. Instead of just checking the HTTP response, you can verify the entire internal behavior of your distributed system: which services were called, what database operations ran, which messages were published, and how long each step took. Combined with the OpenTelemetry Collector and a CI/CD pipeline, it gives you confidence that your system behaves correctly at every layer, not just at the API boundary.

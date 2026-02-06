# How to Troubleshoot the Collector validate Command Missing Pipeline Wiring Errors for Connectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Validation, Connectors

Description: Work around limitations of the Collector validate command that does not catch connector pipeline wiring errors before deployment.

The Collector's `validate` command is supposed to catch configuration errors before deployment. But for connectors, it has a blind spot: it validates that connectors are syntactically correct and referenced in pipelines, but it does not validate that the connector's input and output pipelines are of the correct types.

## The Problem

Consider this configuration:

```yaml
connectors:
  spanmetrics:
    dimensions:
    - name: http.method

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics]
    # BUG: spanmetrics outputs metrics, but this is a traces pipeline
    traces/from-connector:
      receivers: [spanmetrics]
      exporters: [otlp]
```

Running `otelcol-contrib validate --config config.yaml` might return:

```
Config validation succeeded.
```

But at runtime, the connector sends metrics to a traces pipeline, and the data is silently lost or the Collector panics.

## Why validate Misses This

The `validate` command checks:
1. YAML syntax is valid
2. All referenced components are defined
3. All defined components are referenced in at least one pipeline
4. Component-specific configuration is valid

It does not check:
1. Whether a connector's output type matches the receiving pipeline's type
2. Whether the data flow through connectors is semantically correct
3. Whether a connector that converts traces-to-metrics is actually wired to a metrics pipeline

## Workaround: Manual Pipeline Type Verification

Create a checklist for each connector in your config:

```
Connector: spanmetrics
  Input type: traces (receives spans)
  Output type: metrics (produces metrics)
  Check: exporter pipeline is traces type? YES
  Check: receiver pipeline is metrics type? [verify this]
```

For the `spanmetrics` connector:
- It must be listed as an exporter in a **traces** pipeline
- It must be listed as a receiver in a **metrics** pipeline

Correct wiring:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics, otlp]  # spanmetrics as exporter in traces pipeline

    metrics:
      receivers: [spanmetrics]         # spanmetrics as receiver in metrics pipeline
      exporters: [prometheusremotewrite]
```

## Common Connector Type Mappings

| Connector | Input Pipeline Type | Output Pipeline Type |
|-----------|-------------------|---------------------|
| spanmetrics | traces | metrics |
| count | traces/metrics/logs | metrics |
| servicegraph | traces | metrics |
| routing | any | same type |
| forward | any | same type |

## Automated Validation Script

Write a script that checks connector wiring:

```bash
#!/bin/bash
# validate-connectors.sh
# Validates that connector pipeline types are correct

CONFIG_FILE=$1

if [ -z "$CONFIG_FILE" ]; then
    echo "Usage: $0 <config-file>"
    exit 1
fi

# First run the built-in validation
otelcol-contrib validate --config "$CONFIG_FILE"
if [ $? -ne 0 ]; then
    echo "Built-in validation failed"
    exit 1
fi

echo "Built-in validation passed, checking connector wiring..."

# Check spanmetrics connector wiring
if grep -q "spanmetrics" "$CONFIG_FILE"; then
    echo "Checking spanmetrics connector..."

    # spanmetrics should be an exporter in a traces pipeline
    # and a receiver in a metrics pipeline
    TRACES_EXPORTER=$(grep -A5 "traces:" "$CONFIG_FILE" | grep "exporters:" | grep "spanmetrics")
    METRICS_RECEIVER=$(grep -A5 "metrics:" "$CONFIG_FILE" | grep "receivers:" | grep "spanmetrics")

    if [ -z "$TRACES_EXPORTER" ]; then
        echo "WARNING: spanmetrics not found as exporter in a traces pipeline"
    fi
    if [ -z "$METRICS_RECEIVER" ]; then
        echo "ERROR: spanmetrics not found as receiver in a metrics pipeline"
        exit 1
    fi
    echo "spanmetrics wiring looks correct"
fi

echo "Connector validation complete"
```

## Integration Test Approach

The most reliable way to validate connector wiring is to run the Collector with test data and verify the output:

```bash
#!/bin/bash
# test-connector-wiring.sh

# Start the Collector with your config
docker run -d --name test-collector \
  -v $(pwd)/config.yaml:/etc/otelcol/config.yaml \
  -p 4317:4317 -p 8889:8889 \
  otel/opentelemetry-collector-contrib:0.121.0

# Wait for startup
sleep 5

# Check if the Collector started successfully
if ! docker logs test-collector 2>&1 | grep -q "Everything is ready"; then
    echo "Collector failed to start"
    docker logs test-collector
    docker rm -f test-collector
    exit 1
fi

# Send a test span
otel-cli span \
  --service "test" \
  --name "test-span" \
  --endpoint "localhost:4317" \
  --attrs "http.method=GET"

# Wait for processing
sleep 10

# Check if metrics were generated by spanmetrics
METRICS=$(curl -s http://localhost:8889/metrics | grep "span_")
if [ -z "$METRICS" ]; then
    echo "ERROR: No metrics from spanmetrics connector"
    docker rm -f test-collector
    exit 1
fi

echo "Connector wiring verified - metrics are being generated"
docker rm -f test-collector
```

## CI/CD Pipeline Integration

Add both built-in and custom validation to your CI:

```yaml
jobs:
  validate-collector:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Built-in validation
      run: |
        docker run --rm \
          -v ${{ github.workspace }}/config.yaml:/config.yaml \
          otel/opentelemetry-collector-contrib:0.121.0 \
          validate --config /config.yaml

    - name: Connector wiring validation
      run: ./scripts/validate-connectors.sh config.yaml

    - name: Integration test
      run: ./scripts/test-connector-wiring.sh
```

## Summary

The Collector `validate` command does not catch connector pipeline type mismatches. A spanmetrics connector wired to a traces output pipeline instead of a metrics pipeline will pass validation but fail at runtime. Use manual checklists, custom validation scripts, and integration tests to catch these errors before deployment.

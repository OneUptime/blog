# How to Use the OTTL Playground to Test and Validate Transform Processor Statements Before Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Testing, Playground

Description: Use the OTTL playground and local testing approaches to validate transform processor statements before deploying them to production Collectors.

Deploying untested OTTL statements to a production Collector can break your telemetry pipeline. A malformed statement might drop all spans, an incorrect condition might modify data you did not intend to change, or a typo might cause the Collector to fail to start. Testing OTTL statements before deployment is essential, and there are several approaches available.

## Approach 1: Local Collector with Debug Exporter

The simplest testing approach is running a local Collector with your transform processor and a debug exporter that prints output to stdout:

```yaml
# test-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  transform/test:
    trace_statements:
      - context: span
        statements:
          # Your statements to test go here
          - set(attributes["test.result"], "transformed")
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/test]
      exporters: [debug]
```

Run the Collector locally:

```bash
# Run the Collector
otelcol-contrib --config test-config.yaml
```

Then send test data:

```bash
# Send a test span with curl
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "test-service"}}
        ]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5b8aa5a2d2c872e8321cf37308d69df2",
          "spanId": "051581bf3cb55c13",
          "name": "GET /api/users",
          "kind": 2,
          "startTimeUnixNano": "1704067200000000000",
          "endTimeUnixNano": "1704067200500000000",
          "attributes": [
            {"key": "http.method", "value": {"stringValue": "GET"}},
            {"key": "http.route", "value": {"stringValue": "/api/users"}},
            {"key": "http.response.status_code", "value": {"intValue": "500"}}
          ],
          "status": {"code": 0}
        }]
      }]
    }]
  }'
```

Check the Collector's stdout for the transformed span. Look for your added attributes and modified status.

## Approach 2: Docker-Based Testing

Create a reproducible test environment with Docker:

```dockerfile
# Dockerfile.test
FROM otel/opentelemetry-collector-contrib:latest
COPY test-config.yaml /etc/otelcol-contrib/config.yaml
```

```bash
# Build and run
docker build -f Dockerfile.test -t otel-test .
docker run --rm -p 4317:4317 -p 4318:4318 otel-test
```

## Approach 3: Using the Collector's Validate Command

The Collector has a `validate` command that checks configuration syntax without starting the full pipeline:

```bash
# Validate the configuration file
otelcol-contrib validate --config test-config.yaml

# If valid, you see no output and exit code 0
# If invalid, you see the error message
echo $?
```

This catches syntax errors in OTTL statements like missing quotes, incorrect function names, or invalid field references.

## Approach 4: Writing Test Cases with telemetrygen

The `telemetrygen` tool generates test telemetry data:

```bash
# Install telemetrygen
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Generate test traces
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 10 \
  --service "test-service" \
  --span-duration 100ms \
  --status-code Error
```

## Approach 5: Automated Testing Script

Create a script that validates your OTTL statements:

```bash
#!/bin/bash
# test-ottl.sh - Automated OTTL testing script

CONFIG_FILE=$1
if [ -z "$CONFIG_FILE" ]; then
    echo "Usage: ./test-ottl.sh <config-file>"
    exit 1
fi

echo "Step 1: Validating configuration syntax..."
otelcol-contrib validate --config "$CONFIG_FILE"
if [ $? -ne 0 ]; then
    echo "FAIL: Configuration syntax error"
    exit 1
fi
echo "PASS: Syntax valid"

echo "Step 2: Starting Collector in background..."
otelcol-contrib --config "$CONFIG_FILE" &
COLLECTOR_PID=$!
sleep 3

# Check if Collector started successfully
if ! kill -0 $COLLECTOR_PID 2>/dev/null; then
    echo "FAIL: Collector failed to start"
    exit 1
fi
echo "PASS: Collector started"

echo "Step 3: Sending test data..."
# Send a span that should trigger the transform
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:4318/v1/traces \
    -H "Content-Type: application/json" \
    -d '{
        "resourceSpans": [{
            "resource": {
                "attributes": [
                    {"key": "service.name", "value": {"stringValue": "test"}}
                ]
            },
            "scopeSpans": [{
                "spans": [{
                    "traceId": "5b8aa5a2d2c872e8321cf37308d69df2",
                    "spanId": "051581bf3cb55c13",
                    "name": "test-span",
                    "kind": 2,
                    "startTimeUnixNano": "1704067200000000000",
                    "endTimeUnixNano": "1704067200500000000",
                    "attributes": [
                        {"key": "http.response.status_code", "value": {"intValue": "500"}}
                    ],
                    "status": {"code": 0}
                }]
            }]
        }]
    }')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "PASS: Test data accepted"
else
    echo "FAIL: Test data rejected with HTTP $HTTP_CODE"
fi

echo "Step 4: Cleaning up..."
kill $COLLECTOR_PID 2>/dev/null
wait $COLLECTOR_PID 2>/dev/null

echo "Testing complete. Check Collector output above for transformed data."
```

## Common OTTL Errors and How to Spot Them

### Invalid Field Reference

```yaml
# Wrong: "status_code" is not a top-level field
- set(status_code, 2)

# Right: use the correct path
- set(status.code, 2)
```

### Missing Quotes on String Values

```yaml
# Wrong: unquoted string value
- set(attributes["key"], production)

# Right: quoted string value
- set(attributes["key"], "production")
```

### Incorrect Function Name

```yaml
# Wrong: "is_match" uses underscore
- set(attributes["x"], "y") where is_match(name, ".*")

# Right: "IsMatch" uses PascalCase
- set(attributes["x"], "y") where IsMatch(name, ".*")
```

### Wrong Attribute Path

```yaml
# Wrong: using dot notation for attribute lookup
- set(attributes.http.method, "GET")

# Right: using bracket notation with the full key
- set(attributes["http.method"], "GET")
```

## Testing Checklist

Before deploying OTTL changes to production:

1. Validate the config file with `otelcol-contrib validate`
2. Test with the debug exporter locally
3. Send representative test data covering all your conditions
4. Check that unmatched spans pass through unmodified
5. Verify that the transform does not accidentally drop spans
6. Measure processing latency with realistic throughput using `telemetrygen`

Testing OTTL statements before deployment prevents pipeline outages. A few minutes of local testing saves hours of debugging missing or corrupted telemetry in production.

# How to Test Tail-Based Sampling Rules Before Deploying to Production Using telemetrygen

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail-Based Sampling, telemetrygen, OpenTelemetry Collector, Testing

Description: Use telemetrygen to generate synthetic traces and validate that your tail-based sampling rules work correctly before deploying them.

Tail-based sampling is powerful but tricky. A misconfigured rule can either drop important traces or keep too many, blowing your storage budget. Testing these rules before they hit production is not optional. telemetrygen is an official OpenTelemetry tool that generates synthetic telemetry data, making it perfect for validating sampling rules in a controlled environment.

## Installing telemetrygen

telemetrygen is part of the OpenTelemetry Collector contrib repository:

```bash
# Install from the releases page
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Or download a pre-built binary
curl -L -o telemetrygen \
  "https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/download/v0.96.0/telemetrygen_linux_amd64"
chmod +x telemetrygen
```

## Setting Up the Test Environment

You need a collector with tail-based sampling configured and a way to see what it keeps versus what it drops. Set up two exporters: one before sampling (to count total traces) and one after (to count sampled traces).

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Tail-based sampling rules to test
  tail_sampling:
    decision_wait: 10s
    num_traces: 1000
    policies:
      # Always keep error traces
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Keep all traces slower than 2 seconds
      - name: keep-slow
        type: latency
        latency:
          threshold_ms: 2000

      # Sample 10% of successful, fast traces
      - name: sample-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  # Debug exporter to see what gets sampled
  debug:
    verbosity: basic

  # File exporter to count sampled traces
  file/sampled:
    path: /tmp/sampled-traces.json

  # Counting exporter (use logging for simplicity)
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [debug, file/sampled]
```

Start the collector:

```bash
otelcol-contrib --config collector-config.yaml
```

## Generating Test Traces with telemetrygen

Now generate different types of traces to exercise each sampling rule.

### Test 1: Error Traces Should Always Be Kept

```bash
# Generate 100 traces with error status
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 100 \
  --service "test-error-service" \
  --status-code Error \
  --otlp-attributes 'test.scenario=error-traces'

echo "Sent 100 error traces. All 100 should be sampled."
```

### Test 2: Slow Traces Should Always Be Kept

```bash
# Generate 100 traces with high latency (3 seconds per span)
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 100 \
  --service "test-slow-service" \
  --duration 3s \
  --otlp-attributes 'test.scenario=slow-traces'

echo "Sent 100 slow traces. All 100 should be sampled."
```

### Test 3: Normal Traces Should Be Sampled at 10%

```bash
# Generate 1000 normal traces
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 1000 \
  --service "test-normal-service" \
  --duration 100ms \
  --status-code Ok \
  --otlp-attributes 'test.scenario=normal-traces'

echo "Sent 1000 normal traces. Approximately 100 should be sampled (10%)."
```

## Validating the Results

After the decision_wait period (10 seconds in our config), check what the collector kept:

```bash
# Count traces in the output file
cat /tmp/sampled-traces.json | python3 -c "
import sys, json

traces = []
for line in sys.stdin:
    try:
        data = json.loads(line.strip())
        traces.append(data)
    except json.JSONDecodeError:
        continue

# Group by test scenario
from collections import Counter
scenarios = Counter()
for t in traces:
    for rs in t.get('resourceSpans', []):
        for attr in rs.get('resource', {}).get('attributes', []):
            if attr['key'] == 'test.scenario':
                scenarios[attr['value']['stringValue']] += 1

print('Sampled trace counts by scenario:')
for scenario, count in sorted(scenarios.items()):
    print(f'  {scenario}: {count}')
"
```

Expected output should be close to:

```
Sampled trace counts by scenario:
  error-traces: 100
  normal-traces: ~100 (10% of 1000)
  slow-traces: 100
```

## Writing Automated Validation

Turn this into an automated test script:

```bash
#!/bin/bash
# test-sampling-rules.sh

set -e

COLLECTOR_ENDPOINT="localhost:4317"
OUTPUT_FILE="/tmp/sampled-traces.json"
WAIT_TIME=15  # decision_wait + buffer

# Clean previous results
> "$OUTPUT_FILE"

echo "=== Testing tail-based sampling rules ==="

# Send error traces (expect 100% retention)
telemetrygen traces --otlp-endpoint $COLLECTOR_ENDPOINT --otlp-insecure \
  --traces 50 --service error-test --status-code Error --otlp-attributes 'scenario=errors'

# Send slow traces (expect 100% retention)
telemetrygen traces --otlp-endpoint $COLLECTOR_ENDPOINT --otlp-insecure \
  --traces 50 --service slow-test --duration 3s --otlp-attributes 'scenario=slow'

# Send normal traces (expect ~10% retention)
telemetrygen traces --otlp-endpoint $COLLECTOR_ENDPOINT --otlp-insecure \
  --traces 500 --service normal-test --duration 50ms --status-code Ok --otlp-attributes 'scenario=normal'

echo "Waiting ${WAIT_TIME}s for sampling decisions..."
sleep $WAIT_TIME

# Count results
ERROR_COUNT=$(grep -c '"scenario":"errors"' "$OUTPUT_FILE" || echo 0)
SLOW_COUNT=$(grep -c '"scenario":"slow"' "$OUTPUT_FILE" || echo 0)
NORMAL_COUNT=$(grep -c '"scenario":"normal"' "$OUTPUT_FILE" || echo 0)

echo "Results:"
echo "  Error traces: $ERROR_COUNT / 50 (expected: 50)"
echo "  Slow traces:  $SLOW_COUNT / 50 (expected: 50)"
echo "  Normal traces: $NORMAL_COUNT / 500 (expected: ~50)"

# Validate
PASS=true

if [ "$ERROR_COUNT" -ne 50 ]; then
  echo "FAIL: Error traces not fully retained"
  PASS=false
fi

if [ "$SLOW_COUNT" -ne 50 ]; then
  echo "FAIL: Slow traces not fully retained"
  PASS=false
fi

# Allow +/- 30% variance for probabilistic sampling
if [ "$NORMAL_COUNT" -lt 25 ] || [ "$NORMAL_COUNT" -gt 85 ]; then
  echo "FAIL: Normal trace sampling outside expected range (25-85)"
  PASS=false
fi

if [ "$PASS" = true ]; then
  echo "All sampling rules validated successfully."
  exit 0
else
  echo "Some sampling rules failed validation."
  exit 1
fi
```

## Testing Complex Composite Policies

For composite policies that combine multiple conditions, generate traces that match various combinations:

```bash
# Traces that are both slow AND have errors (should definitely be kept)
telemetrygen traces --otlp-endpoint localhost:4317 --otlp-insecure \
  --traces 20 --service composite-test --duration 5s --status-code Error

# Traces that are fast with no errors (should be probabilistically sampled)
telemetrygen traces --otlp-endpoint localhost:4317 --otlp-insecure \
  --traces 200 --service composite-test --duration 10ms --status-code Ok
```

Testing your sampling rules with telemetrygen before deploying them is a low-effort practice that prevents expensive mistakes. A bad sampling rule in production can mean either missing critical error traces or unexpectedly high ingestion costs. Spending ten minutes with telemetrygen saves you from both.

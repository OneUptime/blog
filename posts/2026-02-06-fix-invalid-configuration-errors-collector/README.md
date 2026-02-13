# How to Fix "Invalid Configuration" Errors in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Troubleshooting, Configuration, YAML, Validation

Description: A practical guide to diagnosing and fixing invalid configuration errors in OpenTelemetry Collector, covering YAML syntax issues, schema validation, common misconfigurations, and validation best practices.

---

When the OpenTelemetry Collector fails to start with "invalid configuration" errors, it can be frustrating. The error messages are sometimes cryptic, and the YAML configuration can be complex with receivers, processors, exporters, and service pipelines all needing to be correctly wired together.

This guide breaks down the most common configuration errors, shows you how to validate your configuration before deployment, and provides patterns for building correct configurations from the start.

---

## Understanding Collector Configuration Structure

The Collector configuration has five main sections:

```yaml
# Extensions: Optional capabilities (health checks, auth, etc.)
extensions:
  health_check:
  pprof:

# Receivers: How telemetry enters the Collector
receivers:
  otlp:
  jaeger:

# Processors: Transform/filter telemetry
processors:
  batch:
  memory_limiter:

# Exporters: Where telemetry is sent
exporters:
  otlphttp:
  logging:

# Service: Wire components together and configure pipelines
service:
  extensions: [health_check, pprof]
  pipelines:
    traces:
      receivers: [otlp, jaeger]
      processors: [batch]
      exporters: [otlphttp]
```

Configuration errors happen when:
1. YAML syntax is invalid
2. Components are referenced but not defined
3. Required fields are missing
4. Field values have wrong types
5. Components have incompatible configurations

---

## Validation Tools

### 1. Built-in Validation

The Collector has a `validate` command:

```bash
# Validate configuration file
otelcol --config=/etc/otelcol/config.yaml validate

# Expected output on success:
# "Config validation passed"

# On error, you'll see specific issues:
# Error: failed to validate config: ...
```

### 2. Online YAML Validator

Before deploying, validate your YAML syntax:

```bash
# Check YAML syntax with yamllint
yamllint config.yaml

# Or use yq
yq eval config.yaml

# Common syntax errors will be caught:
# - Indentation problems
# - Missing colons
# - Invalid characters
```

### 3. Dry-run in Docker

Test configuration in isolation:

```bash
# Run Collector with your config
docker run --rm \
  -v $(pwd)/config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config=/etc/otelcol/config.yaml

# If config is invalid, Collector will exit with error
# If valid, you'll see "Everything is ready. Begin running and processing data."
```

---

## Common Configuration Errors

### Error 1: YAML Indentation

YAML is extremely sensitive to indentation. Spaces vs tabs matter.

**Invalid Configuration:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:
      endpoint: 0.0.0.0:4317  # Wrong indentation!
      http:
        endpoint: 0.0.0.0:4318
```

**Error Message:**
```
Error: yaml: line 5: mapping values are not allowed in this context
```

**Fix - Correct Indentation:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317  # Properly indented
      http:
        endpoint: 0.0.0.0:4318
```

**Rule:** Always use 2 spaces per indentation level. Never use tabs.

### Error 2: Component Referenced but Not Defined

Referencing a component in pipelines that isn't defined.

**Invalid Configuration:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]  # batch processor not defined!
      exporters: [otlphttp]
```

**Error Message:**
```
Error: pipeline "traces" references processor "batch" which is not configured
```

**Fix - Define All Referenced Components:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:

# Add the missing processor definition
processors:
  batch:
    timeout: 5s
    send_batch_size: 8192

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]  # Now defined above
      exporters: [otlphttp]
```

### Error 3: Required Fields Missing

Many components have required configuration fields.

**Invalid Configuration:**
```yaml
exporters:
  otlphttp:
    # Missing required 'endpoint' field
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
```

**Error Message:**
```
Error: exporter "otlphttp" has invalid configuration: endpoint must be specified
```

**Fix - Include Required Fields:**
```yaml
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp  # Required field
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
```

### Error 4: Wrong Type for Field

Field values must match expected types (string, int, bool, etc.).

**Invalid Configuration:**
```yaml
processors:
  batch:
    timeout: "5"  # String instead of duration
    send_batch_size: "8192"  # String instead of integer
```

**Error Message:**
```
Error: failed to parse duration: time: invalid duration "5"
```

**Fix - Use Correct Types:**
```yaml
processors:
  batch:
    # Duration must include unit (s, ms, m, h)
    timeout: 5s
    # Integers don't need quotes
    send_batch_size: 8192
```

**Type Guide:**
- Durations: `5s`, `100ms`, `1m`, `1h`
- Integers: `8192`, `1000`
- Booleans: `true`, `false`
- Strings: `"value"` or `value`

### Error 5: Duplicate Component Names

Each component must have a unique name within its section.

**Invalid Configuration:**
```yaml
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
  otlphttp:  # Duplicate name!
    endpoint: https://backup.example.com/otlp
```

**Error Message:**
```
Error: yaml: unmarshal errors: line 5: key "otlphttp" already defined at line 2
```

**Fix - Use Unique Names with Type Suffix:**
```yaml
exporters:
  # Use component/name format for multiple instances
  otlphttp/primary:
    endpoint: https://oneuptime.com/otlp
  otlphttp/backup:
    endpoint: https://backup.example.com/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlphttp/primary, otlphttp/backup]
```

### Error 6: Empty Pipeline

Pipelines must have at least one receiver and one exporter.

**Invalid Configuration:**
```yaml
service:
  pipelines:
    traces:
      processors: [batch]  # Missing receivers and exporters
```

**Error Message:**
```
Error: pipeline "traces" must have at least one receiver
```

**Fix - Include Receivers and Exporters:**
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]  # Required
      processors: [batch]
      exporters: [otlphttp]  # Required
```

### Error 7: Invalid Environment Variable Syntax

Environment variables must use correct syntax.

**Invalid Configuration:**
```yaml
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: $ONEUPTIME_TOKEN  # Missing braces!
```

**Error Message:**
Variable may not be expanded, or the Collector doesn't support this syntax.

**Fix - Use Correct Syntax:**
```yaml
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      # Use ${VAR} syntax
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
      # Can also provide default values
      x-api-key: ${API_KEY:-default_value}
```

### Error 8: Processor Order Matters

Some processors must be in specific order.

**Invalid Configuration:**
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      # batch before memory_limiter causes issues
      processors: [batch, memory_limiter]
      exporters: [otlphttp]
```

**Best Practice - Correct Order:**
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      # memory_limiter MUST be first to prevent OOM
      # batch should be last before export
      processors: [memory_limiter, attributes, batch]
      exporters: [otlphttp]
```

**Processor Ordering Rules:**
1. `memory_limiter` - Always first
2. Sampling processors - Early (reduce data volume)
3. Transformation processors - Middle
4. `batch` - Always last before exporters

### Error 9: Extension Not Enabled

Extensions must be enabled in the service section.

**Invalid Configuration:**
```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  # health_check not listed, so it's not enabled!
  extensions: []
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlphttp]
```

**Fix - Enable Extensions:**
```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: 0.0.0.0:1777

service:
  # List all extensions to enable them
  extensions: [health_check, pprof]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlphttp]
```

### Error 10: Wrong Collector Distribution

Using components not included in your Collector distribution.

**Invalid Configuration:**
```yaml
# Using 'core' distribution
receivers:
  # kafkareceiver only in 'contrib' distribution
  kafka:
    protocol_version: 2.0.0
```

**Error Message:**
```
Error: unknown receivers type "kafka"
```

**Fix Option 1 - Use Correct Distribution:**
```bash
# Switch to contrib distribution which has more components
docker pull otel/opentelemetry-collector-contrib:latest
```

**Fix Option 2 - Use Available Components:**
```yaml
# Stick with core components
receivers:
  otlp:  # Available in core distribution
    protocols:
      grpc:
      http:
```

**Check available components:**
```bash
# List components in your distribution
otelcol components

# Output shows receivers, processors, exporters, extensions available
```

---

## Complete Valid Configuration Template

Use this as a starting point for your configuration:

```yaml
# Extensions: Optional add-ons
extensions:
  # Health check endpoint for liveness/readiness probes
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health
    check_collector_pipeline:
      enabled: true
      interval: 5m
      exporter_failure_threshold: 5

  # Profiling endpoint for debugging
  pprof:
    endpoint: 0.0.0.0:1777

  # Persistent storage for queues
  file_storage:
    directory: /var/lib/otelcol/queue
    timeout: 10s

# Receivers: Define how telemetry enters
receivers:
  # OTLP receiver for standard protocol
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32
        keepalive:
          server_parameters:
            max_connection_idle: 11s
            max_connection_age: 30s
            time: 30s
            timeout: 5s
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - http://*
            - https://*

# Processors: Transform telemetry
processors:
  # Memory limiter prevents OOM (MUST BE FIRST)
  memory_limiter:
    check_interval: 1s
    limit_mib: 1600
    spike_limit_mib: 400

  # Add resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: ${ENVIRONMENT:-production}
        action: upsert

  # Remove sensitive data
  attributes/redact:
    actions:
      - key: password
        action: delete
      - key: credit_card
        action: delete
      - key: user.email
        action: hash

  # Batch for efficiency (SHOULD BE LAST)
  batch:
    timeout: 10s
    send_batch_size: 8192
    send_batch_max_size: 16384

# Exporters: Define where telemetry goes
exporters:
  # Primary backend
  otlphttp/primary:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    compression: gzip
    timeout: 30s

    # Queue configuration
    sending_queue:
      enabled: true
      queue_size: 50000
      num_consumers: 20
      storage: file_storage

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Debug logging exporter
  logging:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200

# Service: Wire everything together
service:
  # Enable extensions
  extensions: [health_check, pprof, file_storage]

  # Configure internal telemetry
  telemetry:
    logs:
      level: info
      encoding: json
      disable_caller: false
      disable_stacktrace: false
      output_paths:
        - stderr
      error_output_paths:
        - stderr

    metrics:
      level: detailed
      address: 0.0.0.0:8888

      # Export internal metrics
      readers:
        - periodic:
            interval: 60000
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: https://oneuptime.com/otlp
                headers:
                  x-oneuptime-token: ${ONEUPTIME_TOKEN}

  # Define pipelines
  pipelines:
    # Traces pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes/redact, batch]
      exporters: [otlphttp/primary, logging]

    # Metrics pipeline
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlphttp/primary]

    # Logs pipeline
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes/redact, batch]
      exporters: [otlphttp/primary]
```

---

## Configuration Validation Checklist

Before deploying, verify:

**1. YAML Syntax**
```bash
# Validate YAML structure
yamllint config.yaml

# Parse with yq
yq eval config.yaml > /dev/null && echo "Valid YAML"
```

**2. All Components Defined**
```bash
# Extract referenced components
grep -A 100 "service:" config.yaml | grep "receivers:\|processors:\|exporters:" | \
  sed 's/[][]//g' | tr ',' '\n'

# Compare with defined components
grep -E "^receivers:|^processors:|^exporters:" config.yaml
```

**3. Required Fields Present**
```bash
# Check exporters have endpoints
yq eval '.exporters.*.endpoint' config.yaml

# Check receivers have protocols
yq eval '.receivers.otlp.protocols' config.yaml
```

**4. Processor Order**
```bash
# Verify memory_limiter is first
yq eval '.service.pipelines.*.processors' config.yaml

# Should show memory_limiter as first element
```

**5. Environment Variables Set**
```bash
# Extract required env vars
grep -oE '\$\{[A-Z_]+\}' config.yaml | sort -u

# Verify they're set
env | grep -E "ONEUPTIME_TOKEN|ENVIRONMENT"
```

**6. Collector Validation**
```bash
# Final validation with Collector binary
otelcol --config=config.yaml validate

# Or in Docker
docker run --rm \
  -v $(pwd)/config.yaml:/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config=/config.yaml \
  --dry-run
```

---

## Kubernetes ConfigMap Validation

When using ConfigMaps, validate before applying:

```bash
# Create ConfigMap YAML
cat > otel-configmap.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      batch:
        timeout: 5s
    exporters:
      otlphttp:
        endpoint: https://oneuptime.com/otlp
        headers:
          x-oneuptime-token: \${ONEUPTIME_TOKEN}
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlphttp]
EOF

# Extract and validate config
kubectl create configmap otel-collector-config \
  --from-file=config.yaml \
  --dry-run=client -o yaml | \
  yq eval '.data."config.yaml"' - > /tmp/extracted-config.yaml

# Validate extracted config
otelcol --config=/tmp/extracted-config.yaml validate
```

---

## Debug Mode for Configuration Issues

Enable debug logging to see detailed configuration parsing:

```yaml
service:
  telemetry:
    logs:
      # Set to debug to see configuration details
      level: debug
      encoding: console
      disable_caller: false
      disable_stacktrace: false

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]  # Use logging exporter for debugging
```

Run Collector and examine output:

```bash
# Run with debug output
otelcol --config=config.yaml 2>&1 | tee collector-debug.log

# Look for configuration errors
grep -i "error\|fail\|invalid" collector-debug.log
```

---

## Common YAML Gotchas

**1. Tabs vs Spaces**
```yaml
# WRONG (uses tabs)
receivers:
	otlp:  # Tab character

# CORRECT (uses spaces)
receivers:
  otlp:  # Two spaces
```

**2. List Syntax**
```yaml
# Both are valid, but be consistent

# Inline list
receivers: [otlp, jaeger]

# Multi-line list
receivers:
  - otlp
  - jaeger
```

**3. Boolean Values**
```yaml
# Valid boolean values
enabled: true
enabled: false

# Invalid (treated as strings)
enabled: True
enabled: FALSE
enabled: yes
enabled: no
```

**4. Numbers**
```yaml
# Integers
queue_size: 10000

# Floats
sampling_rate: 0.1

# Strings that look like numbers need quotes
version: "1.0"
```

**5. Multi-line Strings**
```yaml
# Use | for literal block (preserves newlines)
description: |
  This is line one
  This is line two

# Use > for folded block (single line)
description: >
  This long text
  will be folded
  into one line
```

---

## Error Message Reference

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `mapping values are not allowed` | YAML indentation error | Fix indentation, use 2 spaces |
| `pipeline X references component Y which is not configured` | Component used but not defined | Define component in receivers/processors/exporters |
| `endpoint must be specified` | Required field missing | Add required field |
| `unknown receivers type` | Component not in distribution | Use contrib distribution or different component |
| `failed to parse duration` | Invalid duration format | Use format like `5s`, `100ms` |
| `yaml: unmarshal errors` | YAML structure invalid | Validate YAML syntax |
| `duplicate key` | Same component name used twice | Use unique names like `component/name` |

---

## Configuration Testing Pipeline

Automate validation in CI/CD:

```yaml
# GitHub Actions example
name: Validate OTel Config

on:
  pull_request:
    paths:
      - 'otel-config/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install yamllint
        run: pip install yamllint

      - name: Validate YAML syntax
        run: yamllint otel-config/config.yaml

      - name: Validate with Collector
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/otel-config:/config \
            otel/opentelemetry-collector-contrib:latest \
            --config=/config/config.yaml \
            validate

      - name: Check for required env vars
        run: |
          required_vars=$(grep -oE '\$\{[A-Z_]+\}' otel-config/config.yaml | sort -u)
          echo "Config requires these environment variables:"
          echo "$required_vars"
```

---

## Related Resources

- [How to Fix Collector Connection Refused on OTLP Ports](https://oneuptime.com/blog/post/2026-02-06-fix-collector-connection-refused-otlp-ports/view)
- [How to Troubleshoot Collector Pipeline Blocked Errors](https://oneuptime.com/blog/post/2026-02-06-troubleshoot-collector-pipeline-blocked-errors/view)
- [What is OpenTelemetry Collector and Why Use One?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)

---

## Summary

Invalid configuration errors in OpenTelemetry Collector are usually caused by:

1. YAML syntax errors (indentation, tabs vs spaces)
2. Referenced components not being defined
3. Missing required fields
4. Wrong data types for fields
5. Incorrect processor ordering
6. Components not available in the distribution

Prevent configuration errors by:
- Using the built-in `validate` command
- Testing in Docker before deploying
- Following the configuration template
- Using the validation checklist
- Automating validation in CI/CD

Always validate configuration changes before deploying to production. A single syntax error can take down your entire observability pipeline.

Need help managing OpenTelemetry configurations? [OneUptime](https://oneuptime.com) provides configuration validation and monitoring for your Collector deployments.

# How to Rename Metric Names and Labels Using the Metrics Transform Processor in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics Transform, Renaming, Collector, Prometheus

Description: Use the metrics transform processor in the OpenTelemetry Collector to rename metric names and labels for backend compatibility.

When you collect metrics from different sources, naming conventions often clash. Prometheus metrics use snake_case, some libraries use dots, and your backend might expect a specific prefix. The metrics transform processor lets you rename metric names and labels in-flight without touching the source instrumentation.

## Why Rename Metrics

Common reasons to rename metrics in the Collector:

- Adding a namespace prefix to avoid collisions (`http_requests_total` becomes `myapp.http_requests_total`)
- Converting between naming conventions (Prometheus snake_case to OTel dot notation)
- Standardizing label names across different services (`host` vs `hostname` vs `server`)
- Removing unwanted prefixes added by auto-instrumentation

## Basic Metric Renaming

The `metricstransform` processor can rename individual metrics:

```yaml
processors:
  metricstransform:
    transforms:
      # Rename a specific metric
      - include: http_requests_total
        match_type: strict
        action: update
        new_name: app.http.requests.total

      # Rename using regex pattern matching
      - include: ^process_(.*)$
        match_type: regexp
        action: update
        new_name: system.process.$${1}
```

## Renaming Labels (Attributes)

You can also rename the labels (attributes) on metrics:

```yaml
processors:
  metricstransform:
    transforms:
      # Rename a label on a specific metric
      - include: http_requests_total
        match_type: strict
        action: update
        operations:
          - action: update_label
            label: method
            new_label: http.request.method
          - action: update_label
            label: status
            new_label: http.response.status_code
          - action: update_label
            label: handler
            new_label: http.route
```

## Complete Collector Configuration

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "my-app"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:8080"]

processors:
  metricstransform:
    transforms:
      # Add a namespace prefix to all metrics from this app
      - include: ^(.*)$
        match_type: regexp
        action: update
        new_name: myapp.$${1}

      # Standardize common label names
      - include: myapp.http_requests_total
        match_type: strict
        action: update
        operations:
          - action: update_label
            label: method
            new_label: http.request.method
          - action: update_label
            label: code
            new_label: http.response.status_code

      # Rename process metrics to match OTel conventions
      - include: myapp.process_cpu_seconds_total
        match_type: strict
        action: update
        new_name: myapp.process.cpu.time

      - include: myapp.process_resident_memory_bytes
        match_type: strict
        action: update
        new_name: myapp.process.memory.usage

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [metricstransform, batch]
      exporters: [otlp]
```

## Adding and Removing Labels

Beyond renaming, you can add new labels or remove existing ones:

```yaml
processors:
  metricstransform:
    transforms:
      # Add a static label to all metrics
      - include: ^.*$
        match_type: regexp
        action: update
        operations:
          - action: add_label
            new_label: environment
            new_value: production

      # Remove a high-cardinality label
      - include: http_requests_total
        match_type: strict
        action: update
        operations:
          - action: delete_label_value
            label: instance
```

## Aggregating Label Values

You can aggregate label values to reduce cardinality:

```yaml
processors:
  metricstransform:
    transforms:
      # Aggregate multiple status codes into groups
      - include: http_requests_total
        match_type: strict
        action: update
        operations:
          - action: aggregate_label_values
            label: http.response.status_code
            aggregated_values: ["200", "201", "204"]
            new_value: "2xx"
            aggregation_type: sum
          - action: aggregate_label_values
            label: http.response.status_code
            aggregated_values: ["400", "401", "403", "404"]
            new_value: "4xx"
            aggregation_type: sum
          - action: aggregate_label_values
            label: http.response.status_code
            aggregated_values: ["500", "502", "503"]
            new_value: "5xx"
            aggregation_type: sum
```

## Combining and Splitting Metrics

You can combine multiple metrics into one:

```yaml
processors:
  metricstransform:
    transforms:
      # Combine two gauges into one with a label
      - include: cache_hits_total
        match_type: strict
        action: combine
        new_name: cache_operations_total
        submatch_case: lower
        operations:
          - action: add_label
            new_label: result
            new_value: hit
      - include: cache_misses_total
        match_type: strict
        action: combine
        new_name: cache_operations_total
        submatch_case: lower
        operations:
          - action: add_label
            new_label: result
            new_value: miss
```

## Practical Example: Prometheus to OTel Convention

Here is a real-world transform that converts common Prometheus metric names to OpenTelemetry semantic conventions:

```yaml
processors:
  metricstransform/prom-to-otel:
    transforms:
      - include: go_goroutines
        match_type: strict
        action: update
        new_name: process.runtime.go.goroutines
      - include: go_memstats_alloc_bytes
        match_type: strict
        action: update
        new_name: process.runtime.go.mem.heap_alloc
      - include: go_gc_duration_seconds
        match_type: strict
        action: update
        new_name: process.runtime.go.gc.pause_ns
      # Bulk rename with regex
      - include: ^go_memstats_(.*)_bytes$
        match_type: regexp
        action: update
        new_name: process.runtime.go.mem.$${1}
```

## Order of Operations

Transform rules are applied in order. If you rename a metric in one rule, subsequent rules should reference the new name:

```yaml
transforms:
  # Step 1: Add prefix
  - include: requests_total
    match_type: strict
    action: update
    new_name: app.requests_total

  # Step 2: Rename labels (use the NEW metric name)
  - include: app.requests_total
    match_type: strict
    action: update
    operations:
      - action: update_label
        label: code
        new_label: status_code
```

The metrics transform processor gives you full control over how metrics are named before they reach your backend. This decouples your instrumentation naming from your storage and querying conventions, making it easier to migrate backends or standardize across teams.

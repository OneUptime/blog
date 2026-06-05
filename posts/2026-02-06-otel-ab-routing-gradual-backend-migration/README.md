# How to Set Up A/B Routing in the Collector for Gradual Backend Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, A/B Routing, Migration, Backend

Description: Set up A/B routing in the OpenTelemetry Collector so you can gradually migrate telemetry between backends without modifying application code.

Migrating from one observability backend to another is nerve-wracking. You cannot just flip a switch because if the new backend has issues, you lose visibility into production. A/B routing in the OpenTelemetry Collector lets you gradually shift traffic from your old backend to the new one, percentage by percentage, until you are confident enough to cut over completely.

## The Migration Strategy

The idea is borrowed from A/B testing in web development. Instead of routing user traffic, you route telemetry. Start by sending 100% to the old backend and 0% to the new one. Then mirror 10% to the new backend while keeping 100% in the old one, then 25%, then 50%, and so on. At each step, verify that the new backend handles the load, returns correct query results, and stays within your cost budget.

## Using the Probabilistic Sampler for Routing

The trick here is to use two pipelines: one full-fidelity pipeline for the backend you currently trust, and one sampled pipeline for the backend you are migrating to. The probabilistic sampler in the collector uses trace IDs for consistent hashing, meaning the same trace is consistently included or excluded by a given sampler. This is important because you want complete traces in the sampled backend, not random spans split unpredictably.

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # Forward connector duplicates data to both pipelines
  forward:

processors:
  # Send 20% of traces to the new backend
  probabilistic_sampler/new:
    sampling_percentage: 20
    hash_seed: 42

  # Keep sending 100% of traces to the old backend
  probabilistic_sampler/old:
    sampling_percentage: 100
    hash_seed: 42

  batch:
    send_batch_size: 256
    timeout: 5s

exporters:
  otlp/old_backend:
    endpoint: "old-backend.internal:4317"
    tls:
      insecure: false

  otlp/new_backend:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    # Ingestion pipeline forwards to the connector
    traces/ingress:
      receivers: [otlp]
      processors: []
      exporters: [forward]

    # Old backend gets 100% of traces
    traces/old:
      receivers: [forward]
      processors: [probabilistic_sampler/old, batch]
      exporters: [otlp/old_backend]

    # New backend gets 20% of traces
    traces/new:
      receivers: [forward]
      processors: [probabilistic_sampler/new, batch]
      exporters: [otlp/new_backend]
```

## Shifting the Ratio Over Time

Migration is a process. Here is a practical schedule you might follow:

```yaml
# Week 1: Just dip your toes in
probabilistic_sampler/new:
  sampling_percentage: 5
probabilistic_sampler/old:
  sampling_percentage: 100  # Keep sending everything to old

# Week 2: Start comparing data
probabilistic_sampler/new:
  sampling_percentage: 25
probabilistic_sampler/old:
  sampling_percentage: 100

# Week 3: Equal split for thorough comparison
probabilistic_sampler/new:
  sampling_percentage: 50
probabilistic_sampler/old:
  sampling_percentage: 100

# Week 4: New backend becomes primary
probabilistic_sampler/new:
  sampling_percentage: 100
probabilistic_sampler/old:
  sampling_percentage: 25

# Week 5: Cut over
# Remove the old backend pipeline entirely
```

Notice that during the transition, you can send 100% to the old backend while also sending a percentage to the new one. This ensures you never lose data in the system you are currently relying on.

## Automating the Cutover with Config Reloads

You do not want to restart the collector process every time you change the ratio. The collector can reload configuration when it receives a `SIGHUP` signal on Unix-like systems:

```bash
# Start the collector
otelcol-contrib --config=otel-collector-config.yaml
```

Then use a script or CI pipeline to update the config and signal a reload:

```bash
#!/bin/bash
# migrate.sh - Update sampling percentages
NEW_PCT=$1
OLD_PCT=$2

# Use sed to update the config file
sed -i "s/sampling_percentage: .*/sampling_percentage: ${NEW_PCT}/" \
  /etc/otel/new-backend-sampler.yaml

sed -i "s/sampling_percentage: .*/sampling_percentage: ${OLD_PCT}/" \
  /etc/otel/old-backend-sampler.yaml

# Ask the collector to reload its configuration
kill -SIGHUP "$(pidof otelcol-contrib)"

echo "Updated: new=${NEW_PCT}%, old=${OLD_PCT}%"
```

## Validating During Migration

At each step, run these checks:

```bash
# Compare span counts between backends (query each backend's API)
echo "Old backend span count (last hour):"
curl -s "old-backend.internal/api/spans/count?duration=1h" | jq '.count'

echo "New backend span count (last hour):"
curl -s "https://oneuptime.com/api/spans/count?duration=1h" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.count'

# Check for dropped spans in the collector metrics
curl -s "http://localhost:8888/metrics" | \
  grep otelcol_exporter_send_failed_spans
```

Resource Attribute Tagging

Add an attribute so you know which routing path a trace took. This is invaluable for debugging:

```yaml
processors:
  attributes/tag_old:
    actions:
      - key: routing.destination
        value: "old-backend"
        action: insert

  attributes/tag_new:
    actions:
      - key: routing.destination
        value: "new-backend"
        action: insert
```

## Wrapping Up

A/B routing turns a scary migration into a controlled, reversible process. The collector handles the traffic splitting, your applications do not need any changes, and you can roll back instantly by adjusting percentages. The whole migration can be done over a few weeks with full confidence at every step.

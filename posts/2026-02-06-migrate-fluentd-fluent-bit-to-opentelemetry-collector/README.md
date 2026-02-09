# How to Migrate from Fluentd or Fluent Bit to OpenTelemetry Collector for Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fluentd, Fluent Bit, Migration

Description: A practical guide to migrating your log collection pipeline from Fluentd or Fluent Bit to the OpenTelemetry Collector step by step.

Fluentd and Fluent Bit have been the go-to log collection tools for years. They work well, they have massive plugin ecosystems, and there is nothing wrong with continuing to use them. But if you are already using OpenTelemetry for traces and metrics, running a separate log collector adds operational overhead. Consolidating onto the OpenTelemetry Collector means one agent to deploy, one config format to learn, and one pipeline to monitor.

This post walks through the migration process, mapping common Fluentd/Fluent Bit configurations to their OpenTelemetry Collector equivalents.

## When to Migrate

Migration makes sense when:

- You already use OpenTelemetry for traces or metrics
- You want a single collector for all telemetry signals
- You are setting up a new cluster and want to start with one tool
- You need features from the OTel ecosystem like the transform processor or routing connector

Migration does not make sense when:

- You rely heavily on Fluentd plugins that have no OTel equivalent
- Your Fluentd/Fluent Bit setup is stable and you have no reason to change
- You need Fluentd's buffering behavior for specific compliance requirements

## Mapping Concepts

Here is how Fluentd/Fluent Bit concepts map to OpenTelemetry:

| Fluentd / Fluent Bit | OpenTelemetry Collector |
|----------------------|------------------------|
| Input plugin         | Receiver               |
| Filter plugin        | Processor              |
| Output plugin        | Exporter               |
| Match/Tag routing    | Pipelines + Routing connector |
| Buffer               | Sending queue + Batch processor |
| Parser               | Operators (in filelog receiver) |

## Example 1: File Tail Input

**Fluent Bit config:**

```ini
[INPUT]
    Name              tail
    Path              /var/log/apps/*.log
    Tag               app.*
    Parser            json
    Refresh_Interval  5
    Rotate_Wait       30
    Mem_Buf_Limit     5MB
```

**OpenTelemetry Collector equivalent:**

```yaml
receivers:
  filelog:
    include:
      - /var/log/apps/*.log
    start_at: end
    # Poll interval similar to Refresh_Interval
    poll_interval: 5s
    operators:
      # JSON parser equivalent
      - type: json_parser
        parse_from: body
```

## Example 2: Kubernetes Log Collection

**Fluent Bit config (common Kubernetes setup):**

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            cri
    Tag               kube.*
    Refresh_Interval  10
    Skip_Long_Lines   On
    DB                /var/log/flb_kube.db

[FILTER]
    Name              kubernetes
    Match             kube.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_CA_File      /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File   /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log         On
    K8S-Logging.Parser On
```

**OpenTelemetry Collector equivalent:**

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    exclude:
      - /var/log/pods/monitoring_otel-collector*/**
    start_at: end
    include_file_path: true
    # Checkpoint storage equivalent to Fluent Bit's DB
    storage: file_storage
    operators:
      - type: regex_parser
        id: parser-cri
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      - type: move
        from: attributes.log
        to: body

processors:
  # Equivalent to Fluent Bit's kubernetes filter
  k8sattributes:
    auth_type: "serviceAccount"
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
        - k8s.container.name

extensions:
  file_storage:
    directory: /var/lib/otelcol/file_storage
```

## Example 3: Output to Elasticsearch

**Fluentd config:**

```xml
<match app.**>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name app-logs
  type_name _doc
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 5s
    chunk_limit_size 5MB
    retry_max_interval 30s
  </buffer>
</match>
```

**OpenTelemetry Collector equivalent:**

```yaml
exporters:
  elasticsearch:
    endpoints:
      - "https://elasticsearch.example.com:9200"
    logs_index: app-logs
    sending_queue:
      enabled: true
      # Queue size acts similarly to buffer
      queue_size: 1000
    retry_on_failure:
      enabled: true
      max_interval: 30s

processors:
  batch:
    timeout: 5s
    send_batch_max_size: 5000
```

## Example 4: Log Filtering and Modification

**Fluent Bit config:**

```ini
[FILTER]
    Name     grep
    Match    *
    Exclude  log health_check

[FILTER]
    Name     modify
    Match    *
    Add      environment production
    Remove   secret_field
```

**OpenTelemetry Collector equivalent:**

```yaml
processors:
  filter/exclude_health:
    logs:
      log_record:
        # Drop logs containing "health_check"
        - 'IsMatch(body, "health_check")'

  transform/modify:
    log_statements:
      - context: log
        statements:
          # Add a static attribute
          - set(attributes["environment"], "production")
          # Remove a sensitive field
          - delete_key(attributes, "secret_field")
```

## Migration Strategy

Do not try to migrate everything at once. Follow these steps:

**Step 1: Run both collectors side by side.** Deploy the OTel Collector alongside your existing Fluentd/Fluent Bit setup. Configure both to read the same log files and send to the same backend. Compare the output to make sure nothing is lost.

**Step 2: Validate log completeness.** Count the log records from both collectors over a 24-hour period. They should be within 1% of each other. Check that structured fields, timestamps, and metadata are being parsed correctly.

**Step 3: Migrate one namespace at a time.** In Kubernetes, start by switching one low-risk namespace to OTel-only. Monitor for a week. If everything looks good, migrate the next namespace.

**Step 4: Remove the old collector.** Once all namespaces are migrated and you have run in OTel-only mode for at least two weeks without issues, decommission Fluentd/Fluent Bit.

## Common Gotchas

A few things to watch out for during migration:

- **Timestamp parsing**: Fluentd and OTel use different time format syntax. Fluentd uses Ruby's strftime, while OTel uses Go's time layout or strptime patterns. Double-check your timestamp formats.
- **Buffering behavior**: Fluentd has file-based buffering with configurable chunk sizes. OTel Collector uses in-memory sending queues by default. Enable the `file_storage` extension if you need persistence across restarts.
- **Plugin gaps**: Some Fluentd output plugins (like specific SaaS integrations) may not have OTel Collector equivalents. Check the Collector Contrib repository for available exporters before starting.

## Wrapping Up

Migrating from Fluentd or Fluent Bit to the OpenTelemetry Collector is a practical move if you want to consolidate your observability tooling. The concepts map cleanly between the two ecosystems, and the gradual migration approach minimizes risk. Take your time, validate at each step, and you will end up with a simpler, more unified observability stack.

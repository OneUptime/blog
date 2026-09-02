# How to Normalize Kubernetes Log Fields Before Indexing Them in OpenSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Kubernetes, Logging, Observability

Description: Parse container logs, enrich them with Kubernetes resource attributes, and enforce a stable low-cardinality schema before OpenSearch indexing.

---

Kubernetes log records arrive from multiple runtimes and application libraries. Without a schema contract, the same concept appears as `namespace`, `kubernetes.namespace_name`, `k8s.namespace.name`, or an arbitrary label. Dynamic mapping then creates inconsistent fields and dashboards break across clusters.

Normalize before indexing. The OpenTelemetry Kubernetes Attributes Processor is designed to add Kubernetes context to logs, metrics, and traces as resource attributes, which also improves cross-signal correlation.

## Define a canonical document contract

Keep a small stable set searchable:

```text
@timestamp
body
severity_text
service.name
deployment.environment.name
k8s.cluster.name
k8s.namespace.name
k8s.pod.name
k8s.pod.uid
k8s.container.name
k8s.deployment.name
k8s.node.name
app.team
trace_id
span_id
```

Do not promote every pod label and annotation into a separately mapped field. User-generated label keys are effectively unbounded and can cause mapping explosion. Extract an allow-list of operational labels, retain the remainder only in `_source`, or map it as `flat_object` when its limited query behavior meets the retrieval requirement.

## Collect and parse container records

Run a Collector agent as a DaemonSet when reading node-local `/var/log/pods` files. A current Collector Contrib/Kubernetes distribution can use the file log receiver's container parser:

```yaml
receivers:
  file_log:
    include:
      - /var/log/pods/*/*/*.log
    include_file_path: true
    start_at: end
    operators:
      - id: container-parser
        type: container
```

Mount the host log paths read-only. `start_at: end` avoids replay on a brand-new state store but does not replace durable receiver storage. To preserve offsets across Collector restarts, set the receiver's `storage` field to a configured `file_storage` extension and keep its writable directory on persistent storage.

The container operator parses CRI/container framing and automatically recombines runtime-split partial records. Application JSON may require a following JSON parser, and application-level multiline stack traces require a format-specific `recombine` rule. Configure and test both against the exact body format.

## Add Kubernetes metadata

```yaml
processors:
  k8s_attributes:
    auth_type: serviceAccount
    passthrough: false
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid
      - sources:
          - from: connection
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.node.name
      labels:
        - tag_name: app.team
          key: app.kubernetes.io/team
          from: pod

  batch: {}
```

The service account needs the Kubernetes API permissions documented for the processor. If association fails, the processor cannot guess the pod reliably. Check the chosen association source, Collector topology, NAT/proxy behavior, and RBAC.

Add the processor to the logs pipeline:

```yaml
service:
  pipelines:
    logs:
      receivers: [file_log]
      processors: [k8s_attributes, batch]
      exporters: [otlp/data_prepper]
```

Processor order matters: parse enough identity for pod association before enrichment, and normalize/redact before export.

## Normalize keys in Data Prepper

The unified Data Prepper `otlp` source defaults to the OTel output format; set it explicitly so the event shape used by the projection is clear. In that format, log envelope fields use names such as `time`, `severityText`, `traceId`, and `spanId`, while resource attributes remain under `resource/attributes`. Slash paths address nested entries, and dots within an attribute-name segment remain literal:

```yaml
source:
  otlp:
    logs_output_format: otel

processor:
  - rename_keys:
      entries:
        - from_key: time
          to_key: "@timestamp"
        - from_key: severityText
          to_key: severity_text
        - from_key: traceId
          to_key: trace_id
        - from_key: spanId
          to_key: span_id
        - from_key: resource/attributes/service.name
          to_key: service/name
        - from_key: resource/attributes/deployment.environment.name
          to_key: deployment/environment/name
        - from_key: resource/attributes/k8s.cluster.name
          to_key: k8s/cluster/name
        - from_key: resource/attributes/k8s.namespace.name
          to_key: k8s/namespace/name
        - from_key: resource/attributes/k8s.pod.name
          to_key: k8s/pod/name
        - from_key: resource/attributes/k8s.pod.uid
          to_key: k8s/pod/uid
        - from_key: resource/attributes/k8s.container.name
          to_key: k8s/container/name
        - from_key: resource/attributes/k8s.deployment.name
          to_key: k8s/deployment/name
        - from_key: resource/attributes/k8s.node.name
          to_key: k8s/node/name
        - from_key: resource/attributes/app.team
          to_key: app/team
```

If an existing shipper sends a known legacy schema, apply its allow-listed renames in that source's branch:

```yaml
processor:
  - rename_keys:
      entries:
        - from_key: message
          to_key: body
        - from_key: kubernetes/namespace_name
          to_key: k8s/namespace/name
        - from_key: kubernetes/pod_name
          to_key: k8s/pod/name
        - from_key: kubernetes/container_name
          to_key: k8s/container/name
        - from_key: level
          to_key: severity_text
```

`rename_keys` does not overwrite an existing destination by default. Decide precedence when both canonical and legacy values exist; silently overwriting trustworthy resource metadata with application text is usually wrong.

For more complex inputs, parse and test each source family in its own branch rather than building one chain of conditional renames whose result depends on processor-entry order.

## Lock the OpenSearch mapping

Create a template before the first normalized index:

```http
PUT _index_template/kubernetes-logs
{
  "index_patterns": ["logs-k8s-*"],
  "template": {
    "settings": {
      "index.mapping.total_fields.limit": 1000
    },
    "mappings": {
      "dynamic": false,
      "properties": {
        "@timestamp": {"type": "date"},
        "body": {"type": "text"},
        "severity_text": {"type": "keyword"},
        "service.name": {"type": "keyword"},
        "deployment.environment.name": {"type": "keyword"},
        "k8s.cluster.name": {"type": "keyword"},
        "k8s.namespace.name": {"type": "keyword"},
        "k8s.pod.name": {"type": "keyword"},
        "k8s.pod.uid": {"type": "keyword"},
        "k8s.container.name": {"type": "keyword"},
        "k8s.deployment.name": {"type": "keyword"},
        "k8s.node.name": {"type": "keyword"},
        "app.team": {"type": "keyword"},
        "trace_id": {"type": "keyword"},
        "span_id": {"type": "keyword"}
      }
    }
  }
}
```

`dynamic: false` keeps unknown values in `_source` but does not dynamically index them. If you prefer rejection for schema drift, use a strict dynamic policy in a canary environment first; hard rejection without a DLQ can lose production logs.

## Test before rollout

Capture fixtures for container JSON, plain text, multiline exceptions, missing labels, init containers, and renamed workloads. Send them through a canary Collector/Data Prepper pipeline, then validate:

```http
POST logs-k8s-*/_field_caps?fields=@timestamp,severity_text,service.name,deployment.environment.name,k8s.*,app.team,trace_id,span_id
GET logs-k8s-*/_search?size=1&sort=@timestamp:desc
```

Monitor parse errors, dropped records, Kubernetes API failures, mapping rejections, and the count of distinct mapped fields. A normalization pipeline is complete only when failure paths are observable.

## Official References

- [OpenTelemetry Collector components for Kubernetes](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)
- [OpenTelemetry Kubernetes semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)
- [OpenSearch Data Prepper OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch Data Prepper rename-keys processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/rename-keys/)
- [OpenSearch mapping explosion](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)

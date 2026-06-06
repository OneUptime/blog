# Validation Summary: How to Collect Kubernetes Audit Logs with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes audit policy API (`audit.k8s.io/v1`)
- `kube-apiserver` audit log flags
- OpenTelemetry Collector Contrib
- Filelog receiver and stanza operators
- OpenTelemetry Collector processors (`resource`, `filter`, `attributes`, `batch`, `probabilisticsampler`)
- Kubernetes DaemonSet scheduling for control plane nodes
- OTLP exporter

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes `kube-apiserver` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes apiserver audit configuration API (`audit.k8s.io/v1`): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib stanza JSON parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib stanza severity parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- The introduction implied Kubernetes audit logs sit on control plane nodes as files by default. Kubernetes audit logging depends on the audit policy and log backend flags, so I changed the wording to clarify that this applies to self-managed clusters using the API server log backend.
- The audit level descriptions implied `Request` and `RequestResponse` always include bodies. Kubernetes documents that request and response bodies only apply where such bodies exist, so I added that caveat.
- The audit policy did not omit the `RequestReceived` stage, which can create extra audit events before a request outcome is known. I added `omitStages: [RequestReceived]`, matching the Kubernetes documentation's common example and reducing duplicate volume.
- The filelog JSON parser parsed numbers as floating point values by default. I added `parse_ints: true` so HTTP status codes are preserved as integers for severity mapping.
- The timestamp parser relied on the default layout type. I added `layout_type: strptime` to make the `%Y-%m-%dT%H:%M:%S.%fZ` layout explicit.
- The filelog operators moved optional fields such as `objectRef.resource` and `objectRef.namespace` unconditionally. I added `if` guards so non-resource or cluster-scoped events do not cause avoidable operator errors.
- The filter processor example used the older `logs.exclude.record_attributes` style. I updated it to the current OTTL `log_conditions` style documented for Collector versions 0.146.0 and later.
- The DaemonSet used `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated for a 2026 post. I updated it to `0.153.0`, the latest official Collector release found during review.
- The final snippet described a routing processor and used `record_attributes` under the attributes processor. The shown processor only tags matching telemetry, and the attributes processor uses `attributes` for log attribute matching, so I corrected the prose and config.

## Review Notes
- The managed Kubernetes note is directionally correct, but production setups need cloud-specific receivers or exporters depending on whether audit logs are read from CloudWatch, Cloud Logging, object storage, or another sink.
- The `probabilisticsampler` processor supports logs, but log sampling is alpha in the Collector docs. Use it carefully for compliance-sensitive audit logs.

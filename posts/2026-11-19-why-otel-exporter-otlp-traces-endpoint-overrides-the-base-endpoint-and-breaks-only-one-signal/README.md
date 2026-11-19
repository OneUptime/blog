# Why `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` Overrides the Base Endpoint—and Breaks Only One Signal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Configuration, Troubleshooting

Description: Resolve signal-specific OTLP endpoint overrides by inspecting the effective protocol and URL, including the HTTP path that base endpoints append automatically.

Metrics and logs reach the new Collector, but traces still go to the old hostname. You updated `OTEL_EXPORTER_OTLP_ENDPOINT`, so the deployment looks correct at first glance. The trace exporter may also have `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` set, and that more specific setting takes precedence.

There is a second trap when using OTLP over HTTP: the base endpoint and the trace-specific endpoint have different path rules. Moving the same URL between those variables can change where requests go.

## Reconstruct the effective destination

For SDKs implementing the [OTLP exporter configuration specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/), a signal-specific endpoint overrides the generic endpoint for that signal. For HTTP, the generic endpoint gains a signal path; a signal-specific endpoint is used as provided.

| Configuration | Trace request destination |
| --- | --- |
| Base `https://otel.example.com` | `https://otel.example.com/v1/traces` |
| Base `https://otel.example.com/otlp/` | `https://otel.example.com/otlp/v1/traces` |
| Traces endpoint `https://otel.example.com` | Root path `/` |
| Traces endpoint `https://otel.example.com/otlp/v1/traces` | That exact path |

Therefore, this configuration can break only traces:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com/otlp
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://old-otel.example.com
```

The trace request goes to the old host's root path. Metrics and logs derive their paths from the new base endpoint, assuming they have no corresponding overrides. Do not infer the trace destination from the metrics exporter succeeding.

## Choose one configuration pattern

For one common HTTP endpoint, remove stale per-signal endpoint overrides:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com/otlp
unset OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
unset OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
unset OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
```

Also inspect signal-specific protocol settings, such as `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`. A trace-only `grpc` setting can override a generic `http/protobuf` selection. Do not change exporter destinations that were intentionally separate; document those exceptions instead.

If traces intentionally go elsewhere, provide the full HTTP trace URL:

```bash
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://traces.example.com/ingest/v1/traces
```

That custom path works only if the server or proxy actually routes it to the trace ingestion service. With gRPC, use the gRPC endpoint and transport configuration supported by your SDK; do not copy HTTP's `/v1/traces` suffix onto a gRPC destination.

## Inspect where the override came from

Look in the workload manifest, referenced environment configuration, image defaults, launcher scripts, auto-instrumentation injection, and SDK construction code. For Kubernetes, inspecting the Deployment alone can miss environment variables injected into the resulting Pod:

```bash
kubectl -n applications get deployment checkout -o yaml
kubectl -n applications get pod checkout-example -o yaml
```

Replace the example pod name with a running replica. Review endpoint and protocol keys specifically, and avoid dumping unrelated secrets into an incident ticket. A running process keeps its original environment; editing a ConfigMap does not rewrite that environment. Roll out replacement pods using your normal deployment process after correcting the source.

Explicit constructor arguments and language-specific configuration systems can take precedence over environment variables. The [SDK configuration documentation](https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/) describes the common variables, but confirm that your particular exporter package consumes them. For example, manually constructing an HTTP exporter does not make it a gRPC exporter just because a protocol environment variable says `grpc`.

## Verify all three signals independently

Emit a fresh trace, a known metric change, and a log marker. Inspect the proxy's destination and request path without logging authorization headers or production payloads. Confirm each signal arrives in its intended backend.

A root-path 404 or 405 suggests a missing HTTP signal suffix, while a request to the old host suggests a leftover override. Authentication failures on only one signal may instead come from signal-specific headers. Keep protocol, destination, path, and credentials together in the investigation so fixing one does not hide another.

Finally, distinguish SDK configuration from Collector YAML. An SDK environment variable does not automatically configure a Collector exporter; Collector endpoints are configured under the exporter component or explicitly expanded from environment variables. Fix the layer that actually creates the failing request.

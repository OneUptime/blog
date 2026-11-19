# How to Test an OTLP Pipeline Without a Backend: Synthetic Telemetry, Debug Export, and File Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Testing

Description: Build a repeatable OTLP smoke test with a generated span, debug output, and a local JSON capture so you can isolate pipeline failures without a backend.

A backend dashboard combines several moving parts: ingestion, storage, indexing, permissions, and query time ranges. When a new application produces no visible telemetry, remove those variables first. Send one identifiable span through a local Collector and inspect exactly what emerges.

The useful test has three assertions: the request reaches the receiver, the expected record survives processing, and the exporter writes that record. An empty HTTP 200 response alone proves much less.

## Start a small capture pipeline

Use a Collector distribution containing the `otlp` receiver and the `debug` and `file` exporters. Check its component list and pin the chosen release. Save this as `capture.yaml` and run the Collector as a local process with a writable current directory:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
exporters:
  debug:
    verbosity: detailed
  file/traces:
    path: ./traces.jsonl
    format: json
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug, file/traces]
```

```bash
otelcol-contrib components
otelcol-contrib validate --config=capture.yaml
otelcol-contrib --config=capture.yaml
```

Run the final command in a dedicated terminal. The [file exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/fileexporter) describes its newline-delimited JSON format and filesystem requirements. Its default behavior can truncate an existing capture on startup, so preserve any evidence before restarting. For a container, explicitly bind the receiver to the container interface, publish only to host loopback, and mount a directory writable by the container user.

The detailed debug exporter is for controlled diagnostics. Avoid sending production payloads containing credentials or personal data into an unrestricted terminal or log sink.

## Generate a real, identifiable span

In a second terminal, create fresh timestamps and IDs with Python's standard library:

```python
import json
import secrets
import time
from pathlib import Path

start = time.time_ns()
trace_id = secrets.token_hex(16)
span_id = secrets.token_hex(8)
payload = {
    "resourceSpans": [{
        "resource": {"attributes": [{
            "key": "service.name",
            "value": {"stringValue": "otlp-smoke-test"}
        }]},
        "scopeSpans": [{
            "scope": {"name": "manual-smoke-test"},
            "spans": [{
                "traceId": trace_id,
                "spanId": span_id,
                "name": "pipeline-probe",
                "kind": 1,
                "startTimeUnixNano": str(start),
                "endTimeUnixNano": str(start + 1_000_000)
            }]
        }]
    }]
}
Path("probe.json").write_text(json.dumps(payload))
print(trace_id, span_id)
```

The hexadecimal IDs, integer enum, and string timestamps follow [OTLP's JSON encoding rules](https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding). Send the file unchanged:

```bash
curl --silent --show-error --fail-with-body \
  -D response.headers -o response.json \
  -H 'Content-Type: application/json' \
  --data-binary @probe.json \
  http://127.0.0.1:4318/v1/traces
```

Inspect the status and response body. Then find the printed trace ID in the debug output and in `traces.jsonl`. The file exporter can buffer writes; stop the Collector gracefully before inspecting a completed capture if the last record is not yet visible. A successful test contains the expected span name, IDs, and service resource.

## Add complexity one step at a time

Add your actual processors, repeat with a new trace ID, and compare captures. If a filter intentionally removes the probe, adjust the probe's attributes to exercise the intended route. When adding a batch processor, account for its flush timeout before concluding that a record disappeared.

Next place your reverse proxy in front of this same receiver. Repeat through the public URL. This comparison separates a proxy path problem from a Collector processing problem. Finally attach the actual backend exporter and use the already-known trace ID to investigate backend acceptance and querying.

This traces-only pipeline does not test logs or metrics. Add their own signal pipelines and send valid signal-specific payloads when those are under investigation. The [Collector troubleshooting guide](https://opentelemetry.io/docs/collector/troubleshooting/) explains how local exporters and internal telemetry help narrow each stage. A controlled capture gives you a small, reproducible piece of evidence instead of a vague report that the dashboard is empty.

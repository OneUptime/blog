# OTLP Partial-Success Responses: Surface Rejected Spans, Metrics, and Logs Before They Vanish

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Observability, Troubleshooting

Description: Detect OTLP partial-success rejection counts for traces, metrics, and logs, retain diagnostic warnings, and avoid replaying already accepted telemetry.

Your telemetry endpoint returns HTTP 200, exporter requests look healthy, and some data still disappears. OTLP can acknowledge a request while reporting that part of its contents was rejected. Checking only the HTTP status misses that distinction.

Inspect the export response body and make rejected item counts visible alongside transport failures. A partial-success response is not an instruction to resend the whole batch.

## Recognize the response

For a JSON-encoded trace response, a backend might return:

```json
{
  "partialSuccess": {
    "rejectedSpans": "3",
    "errorMessage": "Some span attributes exceed the configured limit"
  }
}
```

The rejection count is an `int64`, represented as a string by normal Protobuf JSON serialization. The units depend on the signal:

| Signal | JSON field | What is counted |
|---|---|---|
| Traces | `rejectedSpans` | Spans |
| Metrics | `rejectedDataPoints` | Metric data points |
| Logs | `rejectedLogRecords` | Log records |

The official [trace](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto), [metrics](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/metrics/v1/metrics_service.proto), and [logs](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/logs/v1/logs_service.proto) schemas define these fields. A zero rejection count with a nonempty message is a warning about an otherwise accepted request. An empty partial-success message is equivalent to full success.

## Capture the body in a controlled check

For an endpoint supporting OTLP JSON, retain both headers and response body:

```bash
curl --silent --show-error \
  --dump-header response-headers.txt \
  --output response.json \
  --header 'Content-Type: application/json' \
  --data-binary @synthetic-traces.json \
  https://telemetry.example.com/v1/traces
```

Supply authentication using your normal secure mechanism. `synthetic-traces.json` must contain an actual valid OTLP request if you want to test rejection behavior; an empty envelope cannot prove acceptance of real records.

For `application/x-protobuf`, decode the body with the matching `ExportTraceServiceResponse`, `ExportMetricsServiceResponse`, or `ExportLogsServiceResponse` message. Do not treat binary protobuf as JSON, and do not assume an HTML 200 response from a proxy is a valid OTLP acknowledgement.

## Turn JSON responses into a useful diagnostic

This small standard-library helper inspects an already captured JSON response. It is for fixtures and diagnostics, not a replacement OTLP exporter:

```python
import json

FIELDS = {
    "traces": "rejectedSpans",
    "metrics": "rejectedDataPoints",
    "logs": "rejectedLogRecords",
}


def inspect_response(body, signal):
    field = FIELDS[signal]
    response = json.loads(body)
    if not isinstance(response, dict):
        raise ValueError("Expected an OTLP JSON response object")
    partial = response.get("partialSuccess", {})
    if not isinstance(partial, dict):
        raise ValueError("partialSuccess must be an object")
    raw_count = partial.get(field, "0")
    if isinstance(raw_count, bool):
        raise ValueError("Rejection count cannot be boolean")
    if isinstance(raw_count, int):
        count = raw_count
    elif isinstance(raw_count, str) and raw_count.isascii() and raw_count.isdigit():
        count = int(raw_count)
    else:
        raise ValueError("Expected a nonnegative integer rejection count")
    if not 0 <= count <= 2**63 - 1:
        raise ValueError("Rejection count is outside int64 range")
    message = partial.get("errorMessage", "")
    if not isinstance(message, str):
        raise ValueError("errorMessage must be a string")
    return {
        "signal": signal,
        "rejected": count,
        "warning": bool(message),
        "message": message,
    }


print(inspect_response(
    '{"partialSuccess":{"rejectedSpans":"3"}}', "traces"
))
```

Keep signal and exporter labels bounded. Do not turn the arbitrary error message into a metric label: it can be high-cardinality and may contain sensitive diagnostic details. Retain it in access-controlled logs with an appropriate retention policy.

## Check what your exporter exposes

A protocol feature does not guarantee a particular SDK metric. Verify the behavior of your actual exporter release with a test receiver returning a partial-success response.

Current upstream Collector OTLP HTTP [implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go) logs a warning with signal-specific dropped counts when the response reports rejection or a warning. It then completes the export without retrying that accepted request. A dashboard tracking only failed HTTP requests will miss this path.

Collect these warnings, compare accepted data at the backend, and inspect the Collector's [internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) for queue and receiver failures as separate causes of loss. Metric names and exporter handling can change, so establish the observed behavior before designing alerts.

## Repair the rejected data

The [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) prohibits retrying a populated partial-success response. Replaying the entire batch can duplicate records already accepted. The response count also does not identify exactly which records failed.

Use the diagnostic message and backend logs to find the incompatible attributes, limits, or data format. Fix the producer or processing rule, then send a new identifiable test batch. Track rejection counts until they return to zero and confirm expected records arrive. Keep warnings visible even when every record was accepted; they can reveal a compatibility problem before it becomes data loss.

# Which OTLP Failures Should Retry? Classifying gRPC Codes and HTTP Statuses Without Retry Storms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Reliability, Troubleshooting

Description: Classify OTLP HTTP and gRPC failures using the protocol retry rules, then bound retries, queues, and concurrency so backend incidents do not become retry storms.

A telemetry exporter should retry a brief service outage. It should not spend minutes resending a batch rejected for invalid credentials or an oversized body. Treating every failure as transient can fill queues, delay newer telemetry, and overload a recovering backend.

OTLP defines retry behavior for its HTTP and gRPC transports. Use those rules first, then budget how long and how much your pipeline can retry.

## Classify the protocol response

For OTLP/HTTP, the retryable status codes are 429, 502, 503, and 504. Other 4xx and 5xx responses are nonretryable under the [OTLP specification](https://opentelemetry.io/docs/specs/otlp/). That includes HTTP 500, despite the broader retry policy some general-purpose HTTP clients use.

For OTLP/gRPC, the same specification groups statuses as follows:

| Classification | gRPC statuses |
|---|---|
| Retryable | `CANCELLED`, `DEADLINE_EXCEEDED`, `ABORTED`, `OUT_OF_RANGE`, `UNAVAILABLE`, `DATA_LOSS` |
| Conditionally retryable | `RESOURCE_EXHAUSTED`, when the server supplies `RetryInfo` indicating recoverable exhaustion |
| Nonretryable | `UNKNOWN`, `INVALID_ARGUMENT`, `NOT_FOUND`, `ALREADY_EXISTS`, `PERMISSION_DENIED`, `UNAUTHENTICATED`, `FAILED_PRECONDITION`, `UNIMPLEMENTED`, `INTERNAL` |

These are OTLP export rules, not a recommendation for arbitrary business RPCs. A populated partial-success response must not be retried as a whole batch.

A connection failure without a protocol response is a separate case. DNS outages and lost connections can be transient, while a consistently wrong hostname or untrusted certificate needs a configuration repair. Record both the transport failure and its cause; a retry loop cannot decide that an incorrect CA bundle will eventually become correct.

## Honor backpressure

A server can provide a delay through HTTP `Retry-After` or gRPC `RetryInfo`. Respect it. Otherwise, use exponential backoff with jitter as implemented by the exporter rather than immediately looping around every failed call.

Do not add an application-level retry wrapper around an SDK exporter without understanding its existing policy. A proxy retry, SDK retry, and Collector retry can multiply traffic and make incident timing difficult to understand. Their scopes also differ: the application may already have received an acknowledgement from the Collector while the Collector is still retrying its backend.

## Set a finite Collector retry budget

This exporter fragment gives each attempt a timeout and limits the overall retry period:

```yaml
exporters:
  otlp_http/backend:
    endpoint: https://telemetry.example.com
    timeout: 10s
    retry_on_failure:
      enabled: true
      initial_interval: 2s
      max_interval: 20s
      max_elapsed_time: 2m
    sending_queue:
      enabled: true
      num_consumers: 4
      queue_size: 1000
```

Attach it to the appropriate existing pipeline. Current upstream calls the exporter `otlp_http`; older releases may use `otlphttp`. The [exporter helper configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md) defines the retry and queue options. With the default request-based queue sizing, `queue_size` counts queued requests rather than bytes or individual spans.

These values are an example, not a universal recommendation. Four consumers can recover faster than one, but they also create more concurrent requests against a struggling backend. A two-minute retry allowance may be too short for your outage tolerance or too long for the usefulness of stale telemetry.

## Size the buffer using measured traffic

Estimate the request arrival rate after batching. At 20 queued export requests per second, 1,000 request slots represent roughly 50 seconds of arrivals if nothing drains. Actual memory and disk requirements depend on payload sizes, active consumers, and the queue implementation.

Measure representative serialized sizes and observe burst behavior. A capacity expressed in requests hides large variation between a tiny metrics batch and a large logs batch. If your release supports item- or byte-based sizing, evaluate it with the exact configuration and data mix you deploy.

Persistent storage can preserve enqueued data across a restart. It does not make permanent errors retryable or turn an unlimited retry policy into an unlimited buffer. Once storage fills, new data needs a defined failure behavior.

## Verify failure classes deliberately

Use a controlled test backend to return a small matrix of responses:

- 401: confirm an authentication error is surfaced without a long retry cycle.
- 413: confirm the unchanged oversized body is not repeatedly resent.
- 429 with a delay: confirm attempts respect backpressure.
- 503 followed by success: confirm recovery stays within the configured budget.
- 200 with partial rejection: confirm rejected items are reported without replaying the whole request.

Record attempt timestamps, queue size, permanent drops, and backend accepted counts. The Collector's [OTLP HTTP implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go) is useful when checking how your release translates statuses into permanent errors and throttling delays.

During a real incident, fix permanent causes immediately and let bounded retries absorb transient ones. After recovery, watch the backlog drain and verify fresh telemetry is arriving. A quiet error log is insufficient if the queue was exhausted and data was discarded.

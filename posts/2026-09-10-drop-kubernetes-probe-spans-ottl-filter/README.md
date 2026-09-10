# Drop Kubernetes Liveness and Readiness Probe Spans with OTTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Kubernetes, Tracing, Observability

Description: Filter Kubernetes probe spans with precise OTTL conditions that combine server span kind, probe paths, and observed user-agent attributes.

Health probes can dominate request traces for quiet services. Dropping them can make application traffic easier to inspect, but a broad rule such as matching every path containing `health` can also remove real requests. Build the filter from the attributes your instrumentation actually records.

This example targets OpenTelemetry Collector Contrib **0.160.0**. Its current filter configuration uses `trace_conditions`; older `traces.span` configurations remain supported but use a different shape.

## Identify the Probe Signal

Kubernetes HTTP probes normally send a `User-Agent` beginning with `kube-probe/`, although a Pod can override request headers. The [Kubernetes probe documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes) describes those HTTP request details.

Observe a real probe span before writing the rule. Useful fields include the server span kind, request path or route, and user-agent attribute. Current HTTP conventions use `user_agent.original`; older instrumentation may emit `http.user_agent`.

An endpoint name alone does not prove the caller is kubelet. A user can visit `/readyz`, and an external monitor can poll the same path. Decide whether those requests should also be excluded.

## Combine Conditions in One Expression

The following filter requires a server span, an expected probe path, and the expected user-agent prefix:

```yaml
processors:
  filter/kubernetes_probes:
    error_mode: ignore
    trace_conditions:
      - >-
        span.kind == SPAN_KIND_SERVER and
        (span.attributes["url.path"] == "/livez" or
         span.attributes["url.path"] == "/readyz" or
         span.attributes["http.route"] == "/livez" or
         span.attributes["http.route"] == "/readyz") and
        (IsMatch(span.attributes["user_agent.original"], "^kube-probe/") or
         IsMatch(span.attributes["http.user_agent"], "^kube-probe/"))
```

Replace the path list with your configured endpoints. `IsMatch` returns false for a missing target, so a span without either user-agent attribute is retained by this rule.

The [filter processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/filterprocessor/README.md#configuration) states that matching conditions cause telemetry to be dropped. Separate conditions in the list are ORed. Writing the span-kind requirement, path requirement, and user-agent requirement as three list entries would make the filter much broader than intended.

A folded YAML scalar keeps the expression readable while preserving it as one condition. Parentheses make the intended grouping explicit.

## Attach the Filter to the Traces Pipeline

Here is the pipeline wiring for a local test. Combine it with the processor definition above:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
exporters:
  debug:
    verbosity: detailed
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/kubernetes_probes]
      exporters: [debug]
```

For production, place the filter before expensive exporters and usually before batching. Consider its relationship to sampling: removing a server span can change the trace presented to a later tail-sampling processor.

The filter drops matching spans, including their events. It does not automatically remove every descendant span with the same trace ID. If probe handling creates database or client spans, those can remain without their parent. The processor explicitly documents this orphaned-telemetry risk.

If the requirement is to eliminate the entire probe trace, instrumentation-level suppression or a deliberate trace-level sampling policy may fit better. Verify that all spans of the trace are available at the component making that decision.

## Keep Failed Probes if They Are Useful

You may want to retain unsuccessful probes for debugging. Add a success condition only after confirming the status attribute and its type. For standard integer HTTP status codes, a range check can select successful responses, but missing values need an explicit policy.

Do not assume every readiness failure produces `span.status=ERROR`. HTTP status and span status are related by instrumentation rules, and the producer may have incomplete data.

Likewise, use this filter as an observability volume policy, not a security control. A client can often imitate the user-agent string. A spoofed value can make a request match your exclusion rule if it also reaches the selected endpoint.

## Validate a Small Truth Table

Submit synthetic spans for these cases:

| Span | Expected result |
|---|---|
| Server `/readyz`, `kube-probe/1.x` | Dropped |
| Server `/livez`, ordinary browser user-agent | Retained |
| Server `/checkout`, `kube-probe/1.x` | Retained |
| Client `/readyz`, `kube-probe/1.x` | Retained |
| Server `/readyz`, missing user-agent | Retained |

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Compare exported span IDs rather than only total counts. Also inspect a fixture containing a child span so the orphaning behavior is visible before rollout.

## Conclusion

A precise probe filter combines observed path, caller hints, and span kind in one condition. Confirm the filter's drop semantics, preserve useful failure data intentionally, and test what happens to child spans. This reduces probe noise without accidentally hiding unrelated application traffic.

## Official Documentation

- [Filter processor conditions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/filterprocessor/README.md)
- [Kubernetes HTTP probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes)
- [HTTP convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)

# How to Exclude Health Checks, Metrics Endpoints, and Noisy Routes from Beyla Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, HTTP, Filtering, Prometheus

Description: Drop or selectively retain Beyla telemetry for probes, scrape endpoints, static assets, and other high-volume HTTP routes with the routes decorator.

---

Kubernetes probes and Prometheus scrapes can outnumber user requests. If Beyla records every `/healthz`, `/ready`, and `/metrics` call, trace storage fills with low-value spans and request-rate charts describe monitoring traffic rather than product traffic.

Beyla's `routes.ignored_patterns` is documented for filtering HTTP paths before export. The companion `ignore_mode` decides whether to discard traces, metrics, or both.

## Pick the signal you want to suppress

The three modes support different operational goals:

- `all` drops matching metrics and traces. Use it when the traffic should not count in either RED telemetry or trace search.
- `traces` drops only spans while retaining request metrics. Use it when probe latency and failure rate matter but individual probe traces do not.
- `metrics` drops only metrics while retaining spans. This is less common but can retain diagnostic traces while omitting those requests from a Beyla-exported SLO metric.

For complete exclusion:

```yaml
routes:
  ignored_patterns:
    - /health
    - /healthz
    - /live
    - /ready
    - /metrics
    - /internal/metrics
    - /assets/*
  ignore_mode: all
  unmatched: low-cardinality
```

Patterns use the same syntax as route normalization. `*` matches a path prefix, so `/assets/*` covers nested resources and `/assets` itself. List exact probe paths when similarly named product routes must remain visible.

## Keep health metrics but discard health traces

Probe metrics can be useful when they reveal a dependency or startup regression. Keep them without paying trace-storage costs:

```yaml
routes:
  ignored_patterns:
    - /healthz
    - /live
    - /ready
  ignore_mode: traces
```

This does not make the endpoints invisible in metrics. If those samples feed an availability SLI, decide explicitly whether synthetic health traffic belongs in the numerator and denominator. Many teams exclude it from user-facing SLIs while alerting on probe failures separately.

## Filter route events, not entire processes

`discovery.exclude_instrument` prevents Beyla from instrumenting a matching service. It is appropriate for Alloy, Tempo, or an application that should not be observed at all. It is not the right tool for removing one endpoint from an otherwise important API.

Conversely, `routes.ignored_patterns` is documented for HTTP URL paths, but it is not a process or protocol boundary. In standalone Beyla 3.33, the matcher checks each application event's internal path before the HTTP-type check, so a matching gRPC or other non-HTTP event can also be suppressed. It does not affect network flow metrics. For non-HTTP policies, use Beyla's `filter.application` or `filter.network` when it can express the rule, and use a signal-specific Collector filter otherwise.

## Account for path shape

The HTTP path excludes the query string, so configure `/metrics`, not `/metrics?format=prometheus`. Beyla's matcher treats a single trailing slash as the same tokenized path, so `/health` also matches `/health/`. To ignore `/health` plus nested paths such as `/health/dependencies`, use:

```yaml
routes:
  ignored_patterns:
    - /health/*
```

Be cautious with patterns such as `/api/*`. They can erase nearly all application telemetry. Start with an inventory from recent traces or access logs, classify routes by purpose and volume, and review the proposed list with the service owner.

## Use service-specific rules when endpoints differ

A global `/status` exclusion may be correct for one service and hide a customer operation in another. Beyla supports incoming and outgoing route-normalization rules within discovery entries, but ignored patterns are global in the standalone routes decorator. When route semantics conflict across services, use distinct Beyla configurations for clearly separated service groups or filter downstream using signal-appropriate attributes. For example, combine the `service.name` resource attribute with `url.path` on incoming HTTP spans; for Beyla metrics, use an available attribute such as `http.route`, because `url.path` is hidden by default.

Do not broaden a global rule simply to solve one noisy application. The closer a policy is to the service that owns the route, the easier it is to review.

## Validate the result at the source and backend

From an in-cluster shell that can resolve the Service name, generate one request for every excluded path and one normal transaction. Adjust the service, namespace, cluster domain, and port for your cluster:

```bash
for path in /healthz /ready /metrics /api/orders; do
  curl -fsS -o /dev/null "http://checkout.production.svc.cluster.local:8080${path}"
done
```

After the next scrape or metrics-export interval, verify the selected mode, assuming the relevant exporters are enabled and traces survive sampling:

- With `all`, no new matching Beyla span should appear and the matching Beyla HTTP request-duration histogram count should not increase.
- With `traces`, the matching histogram count should increase but Tempo should show no new matching Beyla span.
- With `metrics`, a matching Beyla span remains eligible for export while the matching Beyla histogram count should not increase.
- `/api/orders` should still produce its normal telemetry.

`ignore_mode: metrics` suppresses matching application metrics emitted by Beyla. A Tempo metrics-generator or OpenTelemetry Collector `span_metrics` connector can still derive RED metrics from the retained spans.

Remember that stored traces and historical Prometheus samples remain queryable after the configuration changes. A previously active series can also remain exposed by Beyla until `prometheus_export.ttl` expires, although its histogram count should stop increasing. Compare span timestamps or histogram-count increases; do not treat historical matches as new data.

Watch Beyla logs for configuration errors after rollout, but do not rely on startup validation for `ignore_mode`: standalone Beyla 3.33 accepts an unrecognized value. Use only `all`, `traces`, or `metrics` and verify the result with fresh requests. Pin a tested Beyla release because route capabilities evolve.

## Revisit exclusions as probes evolve

Platform teams frequently add startup probes, service-mesh readiness endpoints, profiling paths, or new scrape paths. Keep exclusions in the same review process as workload health-check configuration. A quarterly query for top routes by request rate often reveals new noise quickly.

Also retain a small path for debugging probe behavior. If `ignore_mode: all` hides evidence needed during incidents, use `traces` to retain probe metrics or `metrics` to retain probe spans. A top-level `ignore_mode` applies to the entire `ignored_patterns` list, so different endpoints cannot select different modes in one standalone configuration. Use separate configurations for disjoint service groups or implement per-endpoint signal filtering downstream; dedicated probe and kubelet metrics are another option.

## Conclusion

Use `ignored_patterns` to remove route-level noise at the source and choose `ignore_mode` according to which signal still has value. Exact, reviewed patterns preserve application visibility; broad wildcards can erase it. Validate excluded and retained routes with fresh requests, then monitor route volume for new probe or scrape endpoints.

## Official Documentation

- [Beyla routes decorator: ignored patterns and modes](https://grafana.com/docs/beyla/latest/configure/routes-decorator/#ignored-patterns)
- [Configure Beyla service discovery exclusions](https://grafana.com/docs/beyla/latest/configure/service-discovery/#exclude-services-from-instrumentation)
- [Configure Beyla metric and trace attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

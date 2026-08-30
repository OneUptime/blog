# How to Exclude Health Checks, Metrics Endpoints, and Noisy Routes from Beyla Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, HTTP, Filtering, Prometheus

Description: Drop or selectively retain Beyla telemetry for probes, scrape endpoints, static assets, and other high-volume HTTP routes with the routes decorator.

---

Kubernetes probes and Prometheus scrapes can outnumber user requests. If Beyla records every `/healthz`, `/ready`, and `/metrics` call, trace storage fills with low-value spans and request-rate charts describe monitoring traffic rather than product traffic.

Beyla's `routes.ignored_patterns` filters HTTP events before export. The companion `ignore_mode` decides whether to discard traces, metrics, or both.

## Pick the signal you want to suppress

The three modes support different operational goals:

- `all` drops matching metrics and traces. Use it when the traffic should not count in either RED telemetry or trace search.
- `traces` drops only spans while retaining request metrics. Use it when probe latency and failure rate matter but individual probe traces do not.
- `metrics` drops only metrics while retaining spans. This is less common but can keep diagnostic traces out of an SLO metric.

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

`discovery.exclude_instrument` prevents Beyla from attaching to a matching service. It is appropriate for Alloy, Tempo, or an application that should not be observed at all. It is not the right tool for removing one endpoint from an otherwise important API.

Conversely, `routes.ignored_patterns` is HTTP-specific. It does not filter database calls, Kafka operations, network flow metrics, or a non-HTTP protocol that happens to share a process. Use signal-specific Collector filters only where Beyla has no source-side equivalent.

## Account for path shape

The HTTP path excludes the query string, so configure `/metrics`, not `/metrics?format=prometheus`. Test trailing-slash behavior rather than assuming `/health` and `/health/` are equivalent in every router:

```yaml
routes:
  ignored_patterns:
    - /health
    - /health/*
```

Be cautious with patterns such as `/api/*`. They can erase nearly all application telemetry. Start with an inventory from recent traces or access logs, classify routes by purpose and volume, and review the proposed list with the service owner.

## Use service-specific rules when endpoints differ

A global `/status` exclusion may be correct for one service and hide a customer operation in another. Beyla supports incoming and outgoing route rules within discovery entries, but ignored patterns are global in the standalone routes decorator. When route semantics conflict across services, use distinct Beyla configurations for clearly separated service groups or filter downstream with a conjunction of `service.name` and `url.path`.

Do not broaden a global rule simply to solve one noisy application. The closer a policy is to the service that owns the route, the easier it is to review.

## Validate the result at the source and backend

Generate one request for every excluded path and one normal transaction:

```bash
for path in /healthz /ready /metrics /api/orders; do
  curl -fsS -o /dev/null "http://checkout.production.svc.cluster.local:8080${path}" || true
done
```

Then verify the selected mode:

- With `all`, no new matching span or RED sample should appear.
- With `traces`, request counters should increase but Tempo should show no new matching span.
- With `metrics`, a trace should remain while the matching metric series does not increase.
- `/api/orders` should still produce its normal telemetry.

Remember that stored traces and stale Prometheus series remain visible after the configuration changes. Compare timestamps or counter increases; do not treat historical results as new data.

Watch Beyla logs for configuration errors after rollout. A misspelled `ignore_mode` should fail validation rather than silently creating an unexpected policy. Pin a tested Beyla release because route capabilities evolve.

## Revisit exclusions as probes evolve

Platform teams frequently add startup probes, service-mesh readiness endpoints, profiling paths, or new scrape paths. Keep exclusions in the same review process as workload health-check configuration. A quarterly query for top routes by request rate often reveals new noise quickly.

Also retain a small path for debugging probe behavior. If `ignore_mode: all` hides evidence needed during incidents, switch critical probes to `traces` mode or observe them through dedicated probe and kubelet metrics.

## Conclusion

Use `ignored_patterns` to remove route-level noise at the source and choose `ignore_mode` according to which signal still has value. Exact, reviewed patterns preserve application visibility; broad wildcards can erase it. Validate excluded and retained routes with fresh requests, then monitor route volume for new probe or scrape endpoints.

## Official Documentation

- [Beyla routes decorator: ignored patterns and modes](https://grafana.com/docs/beyla/latest/configure/routes-decorator/#ignored-patterns)
- [Configure Beyla service discovery exclusions](https://grafana.com/docs/beyla/latest/configure/service-discovery/#exclude-services-from-instrumentation)
- [Configure Beyla metric and trace attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

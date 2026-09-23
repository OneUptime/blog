# How to Aggregate Across a Metric Label Rename During a Rolling Deployment Without Double-Counting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Normalize old and new metric label names per producer, prefer one representation during overlap, and retain counter reset visibility.

---

Renaming a metric label creates new Prometheus series identities. During a rolling deployment, some instances may expose `handler` while others expose `route`; an instance may temporarily expose both forms for compatibility. Adding both query results can double-count the same requests.

Normalize each form to one label schema, preserve producer identity, and select one representation per producer before calculating a service total. The key decision is whether the forms describe duplicate observations or disjoint populations.

## Define an explicit identity

Assume a request counter carries `job`, `instance`, `service`, `method`, and `status`, plus either `handler` or `route`. In this deployment, `job` and `instance` uniquely identify a producer. If they do not, add cluster or tenant identity to every grouping and match clause below.

The old and new label values must mean the same thing. A rename from `handler="checkout"` to `route="/checkout"` also changes the value convention; copying the string does not normalize that semantic difference. Map those values explicitly in instrumentation or a reviewed transformation.

Prometheus's [`label_replace()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#label_replace) can copy a nonempty old value into the new key. It does not remove the source label, so aggregate to the intended identity after replacement.

## Normalize each side independently

For new-format series:

```promql
sum by (job, instance, service, method, status, route) (
  rate(http_requests_total{route!=""}[5m])
)
```

For old-format series:

```promql
sum by (job, instance, service, method, status, route) (
  label_replace(
    rate(http_requests_total{handler!="",route=""}[5m]),
    "route", "$1", "handler", "(.+)"
  )
)
```

The old selector requires a nonempty `handler` and an absent or empty `route`. That avoids treating one series carrying both labels as both representations. The `sum by` removes the old key after copying it, while retaining all the defined producer and request dimensions.

Only aggregate dimensions you have intentionally chosen to discard. If `protocol` or another label distinguishes independent measurements, retaining or combining it must be an explicit decision rather than an accidental side effect of the example's label list.

## Prefer the new representation during overlap

Use `or` with the new side first:

```promql
sum by (service, method, status, route) (
  (
    sum by (job, instance, service, method, status, route) (
      rate(http_requests_total{route!=""}[5m])
    )
  )
  or on (job, instance, service, method, status, route)
  (
    sum by (job, instance, service, method, status, route) (
      label_replace(
        rate(http_requests_total{handler!="",route=""}[5m]),
        "route", "$1", "handler", "(.+)"
      )
    )
  )
)
```

For matching identities, set union keeps the left-hand value. It uses the old result only when the corresponding new result is absent. The [set-operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/) defines that behavior.

Producer identity is essential here. If you aggregate to service before the union, the presence of one upgraded instance can suppress all old instances for that service. Conversely, adding old and new rates indiscriminately counts a dual-emitting instance twice.

## Understand the handoff boundary

A new counter series needs enough samples for a rate. During its first scrapes, the new side can be absent and the old side can remain available. That makes the fallback useful, but it does not guarantee exact historical accounting across the rename.

If the new counter starts at zero while the old counter stops, a window spanning the switch contains partial lifetimes. Extrapolation can affect both rate estimates. If the two names expose the same underlying counter continuously, compare their rates during overlap and ensure instrumentation does not record each request twice into one underlying stream.

For a permanent rename, keep the compatibility query until old samples have aged beyond the longest supported report window or historical queries explicitly choose the appropriate schema. Removing the old query immediately can make earlier dashboard ranges lose data.

## Verify overlap with a controlled rollout

Test four cases: old-only instance, new-only instance, one series carrying both keys, and two separate series exposing equivalent old and new counters. Confirm that the last case contributes once, while independent old and new instances both contribute.

Compare canonical per-instance results with an independent request generator or access-log count over a retained test interval. Also inspect `up` and series presence. A fallback that successfully hides a broken new exporter can delay discovering a migration failure.

Keep labels such as version available for debugging without accidentally treating them as producer identity in the precedence decision. If old and new formats retain different version labels after normalization, a default union may fail to recognize them as duplicates.

## Retire the compatibility layer

Measure which producers still require the old branch, then remove it only after rollout and historical-window requirements are satisfied. Document the final canonical label and update recording rules, alerts, dashboard variables, and links together.

A careful migration preserves the meaning of the rate and the identity of each producer. The compatibility expression is a temporary selection policy; it cannot repair mismatched units, different route semantics, or duplicate collection paths that were already present before the rename.

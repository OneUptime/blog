# How to Keep OpenMetrics Exemplar Labels Within Prometheus Length and Cardinality Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Exemplars, Tracing, Monitoring, Observability

Description: Keep exemplar context within the 128-code-point label budget and control storage volume without creating trace-specific metric series.

---

An exemplar should carry enough context to find one interesting event. It should not reproduce the event's complete metadata. OpenMetrics limits the combined length of an exemplar's label names and values to 128 Unicode code points, and Prometheus stores exemplars in a bounded buffer.

Those are different limits. Passing the per-exemplar size check does not make unlimited exemplar traffic inexpensive, and increasing storage does not make an oversized label set valid.

## Count the decoded label names and values

The [OpenMetrics exemplar definition](https://prometheus.io/docs/specs/om/open_metrics_spec/#exemplars) counts names and values, excluding punctuation used to serialize them. Prometheus defines the same limit in its [exemplar model](https://github.com/prometheus/prometheus/blob/main/model/exemplar/exemplar.go).

A conventional pair is comfortably within the budget:

```python
labels = {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
}
size = sum(len(name) + len(value) for name, value in labels.items())
assert size == 63
assert size <= 128
```

Python's string length counts Unicode code points, which is appropriate here. Counting UTF-8 bytes can overcount non-ASCII values; counting the serialized `{name="value"}` string also includes punctuation that is outside this particular limit. Keep byte-based transport limits separate.

JavaScript's ordinary string length counts UTF-16 code units. If checking arbitrary Unicode in JavaScript, iterate code points, for example with `Array.from(value).length`, rather than assuming `.length` has the same meaning.

## Reject excess context before observing

Choose an allowlist of useful exemplar keys, usually just `trace_id` and optionally `span_id`. Obtain service, region, deployment, and customer context from the trace backend when opening the trace instead of repeating all of it in every exemplar.

```python
def checked_exemplar(trace_id, span_id=None):
    result = {"trace_id": trace_id}
    if span_id is not None:
        result["span_id"] = span_id
    if sum(len(k) + len(v) for k, v in result.items()) > 128:
        raise ValueError("exemplar context exceeds OpenMetrics limit")
    return result
```

Validate identifier syntax separately before this function. Do not truncate trace IDs to satisfy the size limit: a shortened identifier no longer locates the same trace. Remove optional context or omit the exemplar while still recording the metric observation.

Avoid letting untrusted request headers become arbitrary exemplar labels. Besides size problems, such fields may include sensitive identifiers or attacker-controlled values with no operational use. A fixed schema keeps the instrumentation predictable.

## Keep exemplars out of metric labels

This distinction controls time-series cardinality:

```text
api_duration_seconds_bucket{route="/checkout",le="0.5"} 8 # {trace_id="4bf92f3577b34da6a3ce929d0e0e4736"} 0.32
```

`route` and `le` determine the metric series. The trace ID belongs to the exemplar after `#`. If it moves into the bucket's ordinary label set, each unique trace produces a different series, multiplied across the histogram's components.

Exemplar identifiers can vary without creating a new ordinary metric series for each value. That does not imply they are free: they consume exemplar storage and processing capacity. Keep request URLs, user IDs, and arbitrary baggage out of both metric labels and exemplar context unless they serve a carefully defined purpose.

## Budget retained exemplars independently

Prometheus enables exemplar storage with the `exemplar-storage` feature flag. Its [storage documentation](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage) describes a shared circular buffer and the configurable exemplar capacity:

```yaml
storage:
  exemplars:
    max_exemplars: 100000
```

The value is a number of exemplars, not a per-series cardinality limit or a retention duration. Actual time coverage depends on arrival rate. As a rough planning example, a buffer of 100,000 receiving 1,000 retained exemplars per second covers about 100 seconds before turnover, ignoring traffic variation and implementation details.

Select exemplars intentionally in instrumentation: retain context for useful observations, coordinate with sampled traces, and measure the achieved rate. Increasing the buffer alone may still leave the incident interval too short if traffic is much higher than expected.

## Test boundaries and observable behavior

Build fixtures whose decoded label budget is 127, 128, and 129 code points. Verify the first two are accepted and the last is rejected by your chosen client or parser. Add a non-ASCII value to catch code-unit and byte-count mistakes.

The [Python OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py) explicitly checks combined exemplar label length. Follow that syntax check with an actual scrape and exemplar API query, because an intermediary can discard exemplars even when the original payload is valid.

Finally compare ordinary series counts before and after enabling exemplars. A sudden increase proportional to requests suggests trace identifiers entered metric labels. The healthy outcome is bounded metric identity, small exemplar context, and enough retained exemplars to navigate from a recent anomaly to a trace that still exists.

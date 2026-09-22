# How to Encode `NaN`, `+Inf`, and `-Inf` Correctly in OpenMetrics Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Data Validation

Description: Serialize OpenMetrics non-finite values correctly while respecting metric-type restrictions and keeping missing observations distinct from NaN.

---

OpenMetrics can represent non-finite numeric values, but not every metric component can use every value. A gauge containing `NaN` can be valid; a counter total containing `NaN` is not. Treat numeric serialization and metric semantics as separate checks.

Use the canonical spellings `NaN`, `+Inf`, and `-Inf` for portable output. Do not surround sample values with quotes or copy language-specific display strings into a metrics response without checking them.

## Start with valid gauge examples

```text
# TYPE sensor_ratio gauge
# HELP sensor_ratio Latest calculated sensor ratio.
sensor_ratio{sensor="undefined"} NaN
sensor_ratio{sensor="positive_overflow"} +Inf
sensor_ratio{sensor="negative_overflow"} -Inf
# EOF
```

The [OpenMetrics value definition](https://prometheus.io/docs/specs/om/open_metrics_spec/#values) requires support for non-real values and explicitly distinguishes NaN from a missing value. A missing sample has no observation in the response. A NaN sample is an observation whose numeric result is not a real number.

That distinction affects operational meaning. The specification forbids using `NaN` as a marker for missing or otherwise bad data. If a source is unreachable, expose collection success separately and choose an explicit policy for unavailable measurements. Do not silently replace every missing value with zero, since zero is a real measurement.

## Encode numbers explicitly at the boundary

A small Python encoder for float-valued gauges is:

```python
import math


def openmetrics_float(value):
    value = float(value)
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "+Inf" if value > 0 else "-Inf"
    return repr(value)


assert openmetrics_float(float("nan")) == "NaN"
assert openmetrics_float(float("inf")) == "+Inf"
assert openmetrics_float(float("-inf")) == "-Inf"
assert openmetrics_float(0.25) == "0.25"
```

This function handles floating-point formatting, not type validation or exact arbitrary-precision integers. Keep those concerns outside it. A JSON serializer is not a substitute: JSON's handling of NaN and infinity differs, and a string such as `"NaN"` is not a numeric sample token.

Use a client library when possible, particularly when labels, HELP escaping, timestamps, and metadata are also involved. The [Python OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py) provides a useful independent round-trip check for hand-built fixtures.

## Apply component-specific restrictions

Counter totals cannot be NaN or negative. Classic histogram buckets and counts must be nonnegative integers, so infinities and NaN are not valid bucket *counts*. The `le="+Inf"` label is a bucket *boundary*, which is a separate concept.

```text
# TYPE request_duration_seconds histogram
request_duration_seconds_bucket{le="0.5"} 7
request_duration_seconds_bucket{le="+Inf"} 9
request_duration_seconds_count 9
request_duration_seconds_sum 4.2
# EOF
```

Here `+Inf` means the final bucket covers every observation; its stored count is the finite integer 9. Do not use `request_duration_seconds_bucket{le="+Inf"} +Inf` to mean “unlimited.” The bucket holds a count, not a capacity.

A GaugeHistogram also requires nonnegative integer buckets and a non-NaN sum. StateSet values are Boolean zero or one, and Info values are one. An explicit sample timestamp must be an actual numeric epoch time, not NaN or infinity. Validate these restrictions before the generic number formatter runs.

For a summary with no observations in its relevant window, a NaN quantile value can express the undefined quantile. That does not authorize NaN in its cumulative count or sum. Preserve the distinction between an estimated result and the counters supporting it.

## Verify parsing and downstream interpretation

Save the gauge fixture to `sample.om` and decode it with strict UTF-8:

```python
from pathlib import Path
from prometheus_client.openmetrics.parser import text_string_to_metric_families

payload = Path("sample.om").read_text(encoding="utf-8")
families = list(text_string_to_metric_families(payload))
assert families[0].type == "gauge"
```

Consume the parser iterator fully so errors near the end are not missed. Add negative fixtures for NaN counter totals, a NaN timestamp, and a noninteger histogram bucket count. Parsing alone will not prove that a source failure was modeled correctly, so test that policy separately.

In PromQL, arithmetic follows floating-point behavior; a non-finite input can propagate into a result. See the [operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/) when diagnosing a panel that becomes undefined after division. Inspect raw samples and denominator values before assuming the serializer is at fault. Correct wire tokens preserve information; useful monitoring still depends on deciding which measurement that information represents.

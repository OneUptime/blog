# Convert Exponential Histograms for Explicit-Bucket Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Choose native explicit histograms and verify OTTL conversion invariants, including a reproduced bucket-shape defect in Collector 0.160.0.

If a backend accepts only explicit histograms, prefer configuring the producer to emit explicit buckets. The Collector transform function `convert_exponential_histogram_to_histogram` looks like a convenient fallback, but its behavior must be checked against the OTLP data model before production use.

In OpenTelemetry Collector Contrib **0.160.0**, source inspection and a local OTLP fixture reveal an invalid bucket-array shape from this converter. The diagnostic configuration below demonstrates the problem; it is not a production recommendation for that release.

## Know the Required Histogram Invariants

An explicit histogram with `N` finite boundaries needs `N + 1` bucket counts. The final bucket represents observations above the largest boundary. When bucket counts are present, their sum must equal the point's total count.

For example, boundaries `[0, 1, 2, 4]` require five counts. A histogram can represent negative observations through suitable boundaries; negative values are not forbidden by the explicit histogram data model. The [OTLP metric definition](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto) specifies these relationships.

Also preserve units, temporality, timestamps, attributes, and whether optional sum, minimum, and maximum values were present. A successful Collector startup does not check every exported data point's semantic consistency.

## Reproduce the Version-Specific Conversion

Use this processor only in a disposable local pipeline with a file or debug exporter:

```yaml
processors:
  transform/histogram_diagnostic:
    error_mode: ignore
    metric_statements:
      - statements:
          - convert_exponential_histogram_to_histogram("upper", [0.0, 1.0, 2.0, 4.0]) where metric.name == "example.duration" and metric.type == METRIC_DATA_TYPE_EXPONENTIAL_HISTOGRAM
```

The `upper` policy assigns observations using an exponential bucket's upper edge. Other documented policies are `midpoint`, `uniform`, and `random`. None can recover the individual measurements that were already aggregated into the source buckets.

The [0.160.0 implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_convert_exponential_hist_to_explicit_hist.go) allocates `len(boundaries)` bucket counts rather than `len(boundaries) + 1`. A nonnegative fixture with four boundaries produced this relevant output:

```json
{
  "count": "6",
  "bucketCounts": ["4", "0", "2", "0"],
  "explicitBounds": [0, 1, 2, 4]
}
```

The total count happens to match the bucket sum, but the array lengths violate the OTLP requirement. Do not append a zero as a workaround: the implementation also uses the last allocated slot for overflow and has distribution behavior that requires a real fix.

## Check Additional Loss and Metadata Behavior

The same implementation iterates positive-side exponential buckets and ignores the negative side. This is a limitation of the converter, not of explicit histograms. A fixture with negative observations can retain the original total count while losing those observations from bucket counts.

Zero-count observations are copied only when the first explicit boundary equals zero. Omitting that boundary can create another count discrepancy. The implementation also sets sum, minimum, and maximum unconditionally from accessors, so originally absent optional values can become zero-valued output fields.

The [transform documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#convert_exponential_histogram_to_histogram) warns that this conversion approach is outside the OpenTelemetry specification and can lose precision. The reproduced structural defect is an additional reason to reject this release's output for a strict backend.

## Configure Explicit Buckets at the Producer

For a Python application, an SDK view can select explicit aggregation before measurements are reduced into exponential buckets. In a fresh test directory, install the SDK into a virtual environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install opentelemetry-sdk
```

Save the following as `explicit_histogram.py` and run it with `python explicit_histogram.py`:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation
from opentelemetry.sdk.metrics.view import View

reader = PeriodicExportingMetricReader(ConsoleMetricExporter())
provider = MeterProvider(
    metric_readers=[reader],
    views=[View(
        instrument_name="example.duration",
        aggregation=ExplicitBucketHistogramAggregation(
            boundaries=[0.0, 0.1, 0.5, 1.0, 2.0, 5.0]
        ),
    )],
)
metrics.set_meter_provider(provider)
histogram = metrics.get_meter("example").create_histogram(
    "example.duration", unit="s"
)
histogram.record(0.25)
provider.force_flush()
provider.shutdown()
```

This is a standalone demonstration; merge the view into an application's existing provider instead of creating a competing provider. Replace the console exporter with the deployed exporter after verifying the shape. The [Python SDK view reference](https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html) documents explicit bucket aggregation.

## Gate Any Future Converter with Output Checks

If you evaluate a later release, use known zero, positive, negative, and overflow observations and verify the exported OTLP payload:

```python
bounds = point["explicitBounds"]
counts = [int(value) for value in point["bucketCounts"]]
assert len(counts) == len(bounds) + 1
assert sum(counts) == int(point["count"])
assert all(a < b for a, b in zip(bounds, bounds[1:]))
```

Also compare expected bucket allocation, optional metadata presence, units, and backend acceptance. Passing these structural checks alone does not establish acceptable quantile accuracy.

## Conclusion

Generate explicit histograms upstream when possible. Collector 0.160.0's OTTL converter fails a basic bucket-shape invariant in a reproducible fixture, so treat it as unsuitable for this production conversion. Reassess a fixed release using actual exported data and representative distribution tests.

## Official Documentation

- [Tagged converter implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_convert_exponential_hist_to_explicit_hist.go)
- [Converter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#convert_exponential_histogram_to_histogram)
- [OTLP histogram fields](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto)
- [Python SDK histogram views](https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html)

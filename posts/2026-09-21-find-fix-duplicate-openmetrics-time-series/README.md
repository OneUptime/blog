# How to Find and Fix Duplicate Time Series in an OpenMetrics Payload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Diagnose duplicate OpenMetrics samples by canonicalizing series identity, preserving source dimensions, and checking exporter and relabeling collisions.

---

Two samples describe the same time series when their metric name and complete label set are identical. Label order does not distinguish them. Prometheus treats an empty label value as equivalent to an absent label, so remove empty-valued labels when comparing identities for ingestion. In a normal scrape snapshot, accidentally emitting that identity twice is a producer bug even if the two values happen to agree.

The [OpenMetrics data model](https://prometheus.io/docs/specs/om/open_metrics_spec/#metric) requires unique label sets within each metric family. It also permits multiple explicitly timestamped points under ordering rules, so a historical file needs a more precise check than simply rejecting every repeated series name.

## Recognize a duplicate despite reordered labels

This ordinary scrape is ambiguous:

```text
# TYPE worker_queue_depth gauge
# HELP worker_queue_depth Jobs currently waiting.
worker_queue_depth{queue="default",region="west"} 8
worker_queue_depth{region="west",queue="default"} 9
# EOF
```

Both samples have the same identity. The values do not add up automatically, and the second line is not a supported instruction to overwrite the first.

Start by saving one complete failing response, including its content type separately. Confirm whether the duplicate is already present in the payload. A duplicate error after ingestion can also originate in metric relabeling or a collision between targets, which requires a different repair.

## Parse identities instead of splitting strings

Avoid regular expressions that split labels on commas. A quoted label value can contain commas and escaped quotes. Use a format-aware parser and canonicalize the parsed label map.

For an ordinary one-point-per-series classic OpenMetrics scrape, the following diagnostic inspects every original sample. Pin `prometheus-client==0.26.0` for this example: it deliberately uses a private helper, `_parse_sample`, whose interface can change between releases.

```python
from io import StringIO
from pathlib import Path
from prometheus_client.openmetrics.parser import (
    _parse_sample,
    text_string_to_metric_families,
)

text = Path("metrics.om").read_bytes().decode("utf-8", errors="strict")
seen = set()

try:
    # Check document structure, then inspect every original sample line.
    list(text_string_to_metric_families(text))
    for line_number, line in enumerate(StringIO(text), start=1):
        line = line.removesuffix("\n")
        if line.startswith("#"):
            continue
        sample = _parse_sample(line)
        labels = tuple(sorted((k, v) for k, v in sample.labels.items() if v != ""))
        identity = (sample.name, labels)
        if identity in seen:
            raise ValueError(f"line {line_number}: repeated series {identity}")
        seen.add(identity)
except ValueError as error:
    raise SystemExit(f"Invalid or duplicate OpenMetrics payload: {error}")

print(f"Checked {len(seen)} distinct sample series")
```

The [Python OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py) can coalesce repeated samples within a group. Checking only the samples yielded by its family iterator can therefore miss the duplicate. The second pass splits only at line feeds, preserves other valid characters in label values, and reports the duplicate's line number. Successful parsing is not a complete specification-conformance check; this parser deliberately accepts some nonconforming input. Keep this version-pinned diagnostic outside the exporter's production request path.

For a historical multi-point exposition, track `(identity, timestamp)` instead, and separately enforce increasing timestamps within each metric. Compound histogram and summary points add grouping requirements. Do not use the snapshot checker above to declare a legitimate backfill file invalid.

## Trace the collision to its source

Common producer causes include merging registries and exporting several upstream objects after dropping their distinguishing attribute. Registering duplicate collectors is another possible cause when registry collision checks cannot detect their names; the Python registry normally rejects overlapping names at registration. Concatenating complete OpenMetrics responses also puts data after the first `# EOF`, which is invalid.

Suppose two queue backends both contain a queue named `default`. Exporting only `queue="default"` collapses two measurements into one identity. Either include a bounded `backend` label or aggregate values according to the metric's meaning before encoding.

For queue depths, summing may represent a meaningful total. For cumulative counters from independent processes, preserve source identity and calculate rates before aggregating; blindly summing changing populations can create misleading resets. For histograms, aggregation requires compatible bucket boundaries and consistent labels across buckets, sum, and count.

Assign one owner to every metric-family definition. Two collectors claiming the same family may also produce duplicate HELP or TYPE declarations, which is a separate format violation even before sample identity is considered.

## Check name translation and relabeling

Name normalization can create collisions: `queue.depth` and `queue-depth` may both become `queue_depth`. The [Prometheus escaping rules](https://prometheus.io/docs/instrumenting/escaping_schemes/) make these translation choices explicit. Detect collisions in the exported schema rather than adding unstable suffixes during each scrape.

Metric relabeling can also remove the label that kept samples distinct. A `labeldrop` rule does not aggregate the remaining samples. The [configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) warns that label removal must preserve unique metric identity.

Compare the raw payload's labels with the stored labels after scrape configuration is applied. If two targets receive identical final target labels, repair discovery or relabeling so each source remains distinguishable. Fix collisions introduced by scrape configuration there; a payload change only helps if a distinguishing label survives the scraper's transformations.

## Prove the fix with representative cases

Create fixtures containing two distinct sources, identical label values, reordered label keys, and names that collide after translation. Assert that valid source distinctions survive and that actual duplicate identities fail before a successful response is emitted.

Then scrape the corrected exporter and inspect both target errors and expected series counts. Do not use “keep first” or “keep last” as the default repair: it hides which measurement was discarded. A trustworthy fix defines who owns the series and what its value represents.

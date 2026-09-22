# How to Represent Stable Build and Version Metadata with OpenMetrics Info Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring

Description: Expose stable build metadata with the OpenMetrics Info type, correct family naming, bounded labels, and safe PromQL joins.

---

A version string belongs in a label, while the sample value tells the metrics system that the metadata is present. OpenMetrics has a dedicated Info type for this purpose. A useful build metric identifies the running artifact without adding its revision to every request counter or latency histogram.

This example targets OpenMetrics 1.0. The family is `checkout_build`; its sample is `checkout_build_info`. Keeping those two names distinct prevents an exporter from accidentally declaring a different family than the one it emits.

## Define a stable metadata contract

Choose fields that describe the artifact: release version, source revision, and perhaps the compiler version. Set them from the built artifact or its immutable deployment configuration. Reading the current Git checkout on every scrape can report a revision unrelated to the executable actually serving requests.

```text
# TYPE checkout_build info
# HELP checkout_build Identity of the running checkout build.
checkout_build_info{version="3.8.1",revision="7c12a90"} 1
# EOF
```

The [OpenMetrics Info definition](https://prometheus.io/docs/specs/om/open_metrics_spec/#info) requires a value of one and an empty unit. Do not add `# UNIT checkout_build seconds`, and do not put a changing quantity into the sample value. A feature flag that toggles between zero and one is better represented with a gauge or StateSet.

Keep request IDs, customer IDs, and scrape timestamps out of this metric. A new revision legitimately creates a new series during a deployment; a new scrape timestamp creates one on every collection. A single build series per target is usually enough.

## Let a client library encode the family

The [Python Info API](https://prometheus.github.io/client_python/instrumenting/info/) supplies the `_info` sample suffix and manages the key-value metadata. Use a dedicated registry here so the example has predictable output:

```python
from prometheus_client import CollectorRegistry, Info
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
build = Info(
    "checkout_build",
    "Identity of the running checkout build.",
    registry=registry,
)
build.info({"version": "3.8.1", "revision": "7c12a90"})

payload = generate_latest(registry)
print(payload.decode("utf-8"), end="")
```

Supply `checkout_build` to the constructor, not an already suffixed sample name. The dictionary values must be strings. If the Info object also declares ordinary label names, those names must not overlap with dictionary keys passed to `info()`.

For a standalone process, `start_http_server(8000, registry=registry)` can expose this registry. Keep the process alive as part of the application's normal lifecycle. Python Info metrics are not supported by the client's multiprocess mode; do not assume a working single-process example automatically applies to Gunicorn multiprocess aggregation.

## Verify the actual negotiated output

Request the intended format explicitly:

```bash
curl --fail-with-body -sS -D headers.txt \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://localhost:8000/metrics -o metrics.om
```

Inspect the content type, the `info` declaration on `checkout_build`, the sample value, and the final EOF marker. A legacy Prometheus text response may represent the same metadata using a gauge family. That compatibility representation does not mean the OpenMetrics encoder should declare `checkout_build_info` as the Info family.

The [Python encoders](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/exposition.py) are a useful reference when debugging this difference. Test the endpoint through the same proxy and negotiation path used by the production scraper.

## Add version context when querying

Prometheus adds target labels such as `job` and `instance`. Use them to join the metadata onto request rates:

```promql
rate(checkout_requests_total[5m])
  * on (job, instance) group_left(version, revision)
    checkout_build_info
```

Before deploying that join, check that each matching target has exactly one metadata series:

```promql
count by (job, instance) (checkout_build_info) != 1
```

A nonempty result indicates ambiguous metadata. It does not detect targets with no Info series at all; compare against the application's expected target inventory for that case. If multiple clusters share a Prometheus query layer, include the cluster identity in both the join and uniqueness check.

The [PromQL vector matching rules](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching) require an unambiguous matching side. Do not fix a many-to-many error by arbitrarily aggregating away competing versions. Remove obsolete exported metadata, separate legitimately distinct targets, or correct the matching labels.

Finally, run a small rollout and confirm that version counts reflect the old and new replicas. Build metadata should explain which code produced a measurement without changing the identity of the measurement itself.

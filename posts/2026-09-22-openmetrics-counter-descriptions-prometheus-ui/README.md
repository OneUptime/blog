# How to Diagnose Missing OpenMetrics Counter Descriptions in the Prometheus UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Troubleshooting

Description: Trace missing counter help text from OpenMetrics family naming through scrape metadata APIs and Prometheus UI discovery.

A counter can return samples in PromQL while its description is missing from the Prometheus UI. Samples and help text travel through related but distinct paths. Diagnose the payload and metadata API before renaming a working metric or assuming that the exporter lost its documentation.

OpenMetrics also has a naming detail that makes counters especially confusing: the family metadata uses the base name, while the counter sample has a `_total` suffix.

## Capture the format Prometheus actually receives

Request the endpoint explicitly and keep both headers and body:

```bash
curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D openmetrics.headers -o openmetrics.txt \
  http://127.0.0.1:8000/metrics
```

Expect `application/openmetrics-text` in the response content type and `# EOF` at the end. Inspect the source target directly and through any proxy, because middleware that removes comment-looking lines can accidentally remove metric metadata.

A valid OpenMetrics counter looks like this:

```text
# TYPE invoice_payments counter
# HELP invoice_payments Completed invoice payments.
invoice_payments_total{result="accepted"} 42
# EOF
```

The family is `invoice_payments`; `invoice_payments_total` is its total sample. Declaring the OpenMetrics family as `invoice_payments_total` would require a corresponding total sample named `invoice_payments_total_total`. Do not fix missing descriptions by moving only HELP onto the sample name. [OpenMetrics counter naming](https://prometheus.io/docs/specs/om/open_metrics_spec/#counter-1)

## Compare the Prometheus text representation

If the exporter supports both formats, request the older text format separately:

```bash
curl --fail --silent --show-error \
  -H 'Accept: text/plain; version=0.0.4' \
  -D prometheus.headers -o prometheus.txt \
  http://127.0.0.1:8000/metrics
```

For the same logical counter, Prometheus text commonly exposes:

```text
# HELP invoice_payments_total Completed invoice payments.
# TYPE invoice_payments_total counter
invoice_payments_total{result="accepted"} 42
```

That difference is intentional. A proxy that changes only the content type, or a serializer that reuses metadata naming from the other format, can create a mismatch. Follow the rules for the format actually returned. [Prometheus text exposition](https://prometheus.io/docs/instrumenting/exposition_formats/)

With the Python client, provide the description when constructing the counter and let the encoder handle names:

```python
from prometheus_client import CollectorRegistry, Counter
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
payments = Counter(
    "invoice_payments_total", "Completed invoice payments.",
    ["result"], registry=registry,
)
payments.labels("accepted").inc(42)
print(generate_latest(registry).decode("utf-8"))
```

The client removes a supplied trailing `_total` internally and restores it on samples. This is documented in the [Python Counter API](https://prometheus.github.io/client_python/instrumenting/counter/). Do not hand-edit generated output to force both formats to look identical.

## Inspect metadata independently of query results

First confirm the target is healthy and the expected sample exists:

```promql
up{job="billing"}
```

```promql
invoice_payments_total{job="billing"}
```

Then retrieve all metadata for that target rather than filtering immediately on one spelling:

```bash
curl --fail --silent --show-error --get \
  http://localhost:9090/api/v1/targets/metadata \
  --data-urlencode 'match_target={job="billing"}'
```

Look for the family and sample names, a `counter` type, and the expected help string. This avoids confusing an empty name-filtered response with absent metadata. You can also inspect `/api/v1/metadata`, which groups unique metadata entries across targets. Multiple help strings for one metric suggest inconsistent exporter versions or definitions.

For example, a direct scrape of the payload above with Prometheus 3.13.2 returned target metadata under `invoice_payments`, while the queryable sample was `invoice_payments_total`. A UI or integration looking up only the sample spelling can miss that association. Check the actual response from your deployed version before concluding that HELP was dropped.

The [Prometheus metadata API documentation](https://prometheus.io/docs/prometheus/3.13/querying/api/#querying-target-metadata) notes a significant limitation: target metadata comes from directly scraped targets. Data received through Remote Write or OTLP does not populate that target-metadata endpoint or the associated Explore Metrics view. Existing samples therefore do not guarantee that this UI can display their description.

## Fix the layer that lost the description

If HELP is absent in the captured response, add a meaningful description to the instrument or custom family. If HELP is present but targets show a scrape error, correct format negotiation and parsing first. If metadata exists in the API but the UI lacks it, reproduce against the same Prometheus server without a proxy cache and record the server version, payload, and API response for a focused UI report.

When metric relabeling changes `__name__`, compare the ingested series name against the original exposed family and metadata. Do not assume that rewriting a sample name rewrites every metadata association used by every UI version.

Finally, verify the raw counter and its description after a fresh successful scrape. Derived expressions such as `sum(rate(invoice_payments_total[5m]))` create query results rather than an exported counter family; missing original HELP on those results is a separate concern. Keep descriptions stable across replicas so metadata discovery gives users one consistent explanation of what the counter measures.

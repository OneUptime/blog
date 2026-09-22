# How to Diagnose Precision Loss in Large OpenMetrics Counters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Go, Troubleshooting

Description: Identify where large cumulative counters lose integer precision and choose instrumentation that preserves useful rates without promising exact accounting.

A busy service increments a counter, but the exported value appears unchanged. Later it jumps by several units. This can be a floating-point precision limit rather than a missed request or broken scrape.

OpenMetrics permits integer and floating-point values, while allowing ingestors to support only float64. Prometheus's ordinary scalar samples use float64. Printing a large integer in decimal therefore does not guarantee that every unit survives ingestion. [OpenMetrics values](https://prometheus.io/docs/specs/om/open_metrics_spec/#values), [Prometheus data model](https://prometheus.io/docs/concepts/data_model/#samples)

## Reproduce the boundary with a small experiment

IEEE 754 binary64 has 53 bits of integer precision. Every integer through `2**53`, or 9,007,199,254,740,992, is exactly representable. Above that boundary, consecutive integers are not all representable.

Run this in Python:

```python
import math

n = 2**53
print(n)                       # 9007199254740992
print(float(n) == float(n + 1)) # True
print(float(n + 2) - float(n))  # 2.0
print(math.ulp(float(n)))       # 2.0
print(math.ulp(float(2**60)))   # 256.0
```

From `2**60` up to `2**61`, neighboring float64 values are 256 units apart; immediately below `2**60`, the spacing is 128 units. A single extra event cannot always change the represented total. Scientific notation in an endpoint is not itself evidence of loss: it is just another way to print a number. Compare the numerical value and its representable spacing. Python's [floating-point guide](https://docs.python.org/3/tutorial/floatingpoint.html) explains the underlying representation and rounding.

## Find the first stage that rounds

Inspect the path in order: source storage, client accumulation, serialized payload, Prometheus API result, and dashboard formatting. Keep the source's exact integer alongside the exported representation during the investigation.

An integer-backed source can preserve each increment until export, at which point successive scrapes may form a staircase. An accumulator that performs every increment in floating point can behave worse: rounding can discard each small addition before any scraper sees it.

This illustrates the distinction:

```python
exact = 2**53
accumulated = float(exact)
for _ in range(10):
    exact += 1
    accumulated += 1.0

print(exact)             # 9007199254741002
print(int(accumulated))  # 9007199254740992
print(float(exact))      # 9007199254741002.0
```

For `prometheus-client` 0.26.0, reproduce the instrument's actual behavior rather than assuming Python's arbitrary-precision integers carry through every client operation:

```python
from prometheus_client import CollectorRegistry, Counter
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
events = Counter("precision_events_total", "Events observed", registry=registry)
events.inc(2**53)
events.inc()
print(generate_latest(registry).decode("utf-8"))
```

Compare this output with the source count. The client's [value storage](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/values.py) is the relevant implementation layer, including its different single-process and multiprocess storage paths.

Go's client takes another approach: its counter keeps integer and floating-point contributions separately, using the integer path for `Inc()` and suitable `Add()` values. It still combines them into a float64 when writing the metric. Exact internal accumulation therefore does not eliminate the final representation limit, and converting a large integer to float64 before passing it to `Add()` can already have lost precision. [Go counter implementation](https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/counter.go)

## Quantify whether the error affects the query

Compare the spacing near the current total with the expected increase over your query window. A 256-unit spacing is significant when the process handles ten events per minute, but much less significant when it handles millions per second.

Use `rate(counter_total[5m])` for a rate, choosing a window that contains enough samples and meaningful activity. A longer window can reduce the visible effect of staircase rounding when the source keeps an exact total. It cannot recover increments already discarded by the client's accumulator. Prometheus's [rate documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) also explains reset handling and extrapolation. The result is an average per-second rate, not an event count; even `increase(counter_total[5m])` can return a non-integer estimate because of extrapolation.

Do not diagnose this solely from a dashboard with abbreviated units or rounded decimals. Query the raw metric through the API and inspect the endpoint text to separate display rounding from stored rounding.

## Change the measurement design deliberately

For application events, expose a counter of events observed during the process lifetime instead of repeatedly importing an enormous unrelated historical baseline. If a durable source owns the count, an integer-backed collector can preserve increments before serialization, while still accepting float64's export limit.

Use natural, bounded partitions only when they have operational meaning; creating ever-changing labels to keep totals small exchanges precision concerns for a growing series inventory. Changing units can express the intended physical quantity more appropriately, but it cannot create additional relative precision.

Do not reset a counter on every scrape or subtract an arbitrary modulo from it. Those operations create resets and ambiguous increments. Keep exact financial totals, audit counts, and identifiers in an appropriate transactional store. Metrics should answer operational questions with understood numerical limits, and the verification should demonstrate those limits at the largest values the service can realistically reach.

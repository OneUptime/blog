# Why Averaging Per-Minute Success Rates Produces the Wrong SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, Service Level Objectives, Error Budget, Prometheus, PromQL

Description: Calculate a request-based SLO from total good and eligible events instead of giving every minute equal weight.

---

A request-based SLO asks what fraction of eligible requests were good. Averaging a success percentage calculated separately for every minute answers a different question: what is the unweighted mean of the per-minute success rates. Equal traffic in every minute guarantees that this mean equals the request-based SLI. With uneven traffic, the two can still coincide—for example, when every minute has the same success rate—but they generally differ.

## See the Weighting Error

Suppose an API records these two minutes:

| Minute | Good requests | Total requests | Per-minute success |
|---|---:|---:|---:|
| 12:00 | 1 | 1 | 100% |
| 12:01 | 99 | 100 | 99% |

The unweighted average is `(100% + 99%) / 2 = 99.5%`. The request-based SLI is:

```text
(1 + 99) / (1 + 100) = 100 / 101 = 99.01%
```

The quiet minute received the same weight as the minute containing 100 requests. The error can be much worse when one failed request occurs in a quiet minute: averaging `0/1` and `9,999/10,000` reports roughly 50%, although 99.98% of requests succeeded.

## Aggregate Counts, Then Divide

For an occurrence-based SLO, add good events across the whole compliance window and divide once by all eligible events:

```text
SLI = sum(good events) / sum(eligible events)
```

With Prometheus counters, assuming the query backend retains the full compliance window, a 28-day query can be written as:

```promql
sum(
  increase(http_requests_total{
    service="checkout",
    sli_eligible="true",
    sli_result="good"
  }[28d])
)
/
sum(
  increase(http_requests_total{
    service="checkout",
    sli_eligible="true"
  }[28d])
)
```

For a short-window error ratio, including one used in a recording rule, apply `rate()` to each counter before summing so counter resets are detected per series:

```promql
sum(rate(http_requests_total{service="checkout",sli_eligible="true",sli_result="bad"}[5m]))
/
sum(rate(http_requests_total{service="checkout",sli_eligible="true"}[5m]))
```

Do not calculate `avg_over_time()` over a previously recorded success-ratio series and call it request availability. Once counts have been collapsed into ratios, the traffic weight needed to reconstruct the correct answer has been lost. Record the good and total rates separately, or record both the numerator and denominator alongside any convenience ratio.

## When Equal-Weight Minutes Are Correct

Giving each evaluated minute equal weight is valid when a minute is deliberately the unit of the promise. For example:

> At least 99% of one-minute periods will have a request success rate of 99.9% or better.

That is a time-slice or windows-based SLO. Evaluate it by classifying each minute as good or bad against the 99.9% threshold, then dividing the number of good minutes by the number of evaluated minutes; do not average the raw minute-level success percentages. It limits how many bad minutes users experience and can be useful when sustained degradation matters more than the exact number of failed requests. It also has different behavior:

- A bad minute containing 10,000 failures consumes the same budget as a minute that misses its threshold by one request.
- A busy minute and a quiet minute have equal weight.
- The definition must say whether an idle minute is good, excluded, or unknown.

Google Cloud's SLO documentation makes the same distinction between request-based compliance (`good requests / total requests`) and windows-based compliance (`good periods / total periods`). Choose one deliberately rather than mixing their calculations.

## Avoid Related Aggregation Traps

- Do not average regional or instance ratios. Sum their good and total counts unless the product promise explicitly gives each region or instance equal weight.
- Do not average customer ratios to represent request availability. That creates an equal-customer-weighted objective, which may be useful but is a different SLO.
- Do not fill empty minutes with 100% merely to make a graph continuous. That silently converts missing evidence into success.
- Keep the eligibility rule stable. Changing which methods, status codes, or tenants enter the denominator changes the SLO even if the query shape stays the same.

## Validate the Implementation

Before adopting a query, replay a small fixture with deliberately uneven traffic. Compute the expected answer from raw event counts and compare it with the query result. Also test a counter reset, an idle interval, a missing scrape, and a newly added instance. These cases catch most apparently plausible but incorrectly weighted SLO queries.

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Concepts in service monitoring](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Prometheus query functions: `rate()` and `increase()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Conclusion

The unit in an SLO definition determines the weighting. For a request-based objective, retain counts, sum all good and eligible requests, and divide once. For a windows-based objective, classify each minute against the stated goodness threshold and divide good minutes by evaluated minutes; do not merely average the per-minute request ratios.

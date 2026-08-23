# Adding Sample Size and Confidence Bounds to MTTR Trends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Confidence Interval, Statistics, Incident Analytics, SRE

Description: Add cohort counts and uncertainty intervals to recovery trends so sparse, skewed incident data does not imply false precision.

---

A recovery-time line can move sharply because performance changed, because one long incident entered the window, or because only three incidents occurred. Displaying sample size and uncertainty does not make incident data perfect, but it makes the limits of the evidence visible.

## Count the Population at Every Stage

Do not show only `n`, the number used in the calculation. Show a small data-quality funnel:

```text
incident records:             47
eligible under policy:        31
completed by report cutoff:   27
valid start and end:          25
used in duration statistic:   25
still open:                    4
```

This distinguishes a quiet month from broken ingestion. It also exposes survivorship bias: a period with many open incidents may show deceptively fast completed recoveries.

Define which timestamp assigns an incident to a period. Grouping by impact start provides stable cohorts after the period closes, while grouping by restoration date shifts long incidents into later periods. Either can answer a question, but the dashboard must say which one it uses.

## Match the Interval to the Estimand

A confidence interval is tied to a statistic and assumptions. It is not a generic error bar.

- For a mean, a Student t interval can be reasonable for independent observations from a roughly well-behaved population, but incident durations are often skewed and clustered.
- For a median or percentile, use a nonparametric order-statistic interval or a documented bootstrap method.
- For a difference between periods, bootstrap the difference directly rather than comparing whether two separate intervals overlap.
- For a long-running open cohort, survival-analysis methods can incorporate right-censoring; a simple completed-only bootstrap cannot.

Incidents from the same outage class or shared dependency may not be independent. A naive incident-level bootstrap then produces bounds that are too narrow. Resample clusters such as incident episodes, failure campaigns, or weeks when that better matches the dependency structure.

## A Practical Bootstrap

For a completed cohort with raw durations, a transparent percentile bootstrap is easy to implement:

1. Start with \(n\) incident durations.
2. Draw \(n\) rows with replacement.
3. Calculate the chosen statistic on that resample.
4. Repeat many times, using a fixed recorded seed for reproducibility.
5. Use the 2.5th and 97.5th percentiles of bootstrap statistics for a nominal 95 percent interval.

Pseudocode:

```text
observed = completed recovery durations
for b in 1..10000:
  sample = resample_with_replacement(observed, size=len(observed))
  estimates[b] = median(sample)
interval = quantile(estimates, [0.025, 0.975])
```

This basic percentile interval has limitations, especially for very small samples and extreme percentiles. Record the method and software version. If `n` is tiny, showing the actual observations is more honest than presenting an impressive-looking bound.

## Compare Periods Directly

Suppose the previous quarter has durations \(A\) and the current quarter has durations \(B\). Define improvement consistently, for example:

\[
\Delta = median(B)-median(A)
\]

For every bootstrap iteration, resample within each period and calculate \(\Delta_b\). A bound that includes zero means the observed data are compatible with both improvement and deterioration under the method. It does not prove that there is no operationally important difference.

Also report the raw effect, such as `median -14 minutes`, and a domain threshold, such as whether the change exceeds a predeclared 10-minute practically meaningful difference. Statistical uncertainty and operational importance are separate questions.

## Avoid Rolling-Window Illusions

Adjacent 30-day rolling points share 29 days of data. They are highly dependent, so a smooth line with a new confidence band each day can suggest far more independent evidence than exists. Prefer non-overlapping monthly or quarterly cohorts for comparisons, or clearly label the rolling window and use it as a descriptive view.

Annotate policy, tooling, and service changes. A new incident-inclusion rule, restoration detector, or timestamp backfill can move the series without changing recovery performance. Recompute a stable historical series when possible; otherwise draw a break.

## Tail Bounds Need More Data

The p90 is based on relatively few upper-tail observations. With ten incidents, its placement is dominated by roughly one observation; with five incidents, many quantile conventions make p90 close to the maximum. Do not hide the number behind decimals.

A useful publication rule is:

- always show `n` and raw points when practical;
- suppress or gray out tail trends below a declared sample threshold;
- retain the maximum and incident list even when the percentile is suppressed;
- widen the reporting window to gain precision only if the service and policy are stable across it.

Never pool unrelated services merely to narrow an interval. More rows from a different population do not improve the estimate you actually care about.

## Build a Reproducible Result Table

Store the result and its lineage:

```text
period_start, period_end, cohort_definition
metric_definition, statistic, estimate_seconds
lower_seconds, upper_seconds, confidence_level
n_used, n_open, n_missing
interval_method, bootstrap_iterations, random_seed
query_version, generated_at
```

Render `median 24 min [95% bootstrap interval: 15-41], n=18`, not `MTTR 24.03`. Precision in the display should reflect precision in the evidence.

Check interval generation in tests using fixed inputs and seeds. Validate that every resample draws only eligible completed incidents, and keep the underlying incident IDs available for audit.

## Use Bounds for Learning, Not Performance Theater

Confidence bounds cannot correct biased clocks, missing severe incidents, inconsistent classifications, or under-reporting. Pair them with coverage measures and postmortem review. Google SRE's incident metrics guidance cautions against conclusions from a single incident and treats these measures as inputs to improving incident response.

Avoid ranking teams by whether two noisy intervals overlap. Differences in architecture, traffic, severity mix, and reporting practice dominate many league tables. Use uncertainty to choose where to investigate or collect more evidence.

## Official Documentation

- [NIST/SEMATECH e-Handbook: Confidence limits](https://www.itl.nist.gov/div898/handbook/prc/section1/prc14.htm)
- [NIST/SEMATECH e-Handbook: Bootstrap](https://www.itl.nist.gov/div898/handbook/eda/section3/eda362.htm)
- [Google SRE incident metrics resource](https://sre.google/static/pdf/IncidentMeticsInSre.pdf)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Conclusion

Every MTTR trend needs its usable count, open and missing counts, and an uncertainty method appropriate to the statistic. Bootstrap raw incident observations when its assumptions fit, compare period differences directly, and show the points when samples are sparse. Error bars should make uncertainty legible, not decorate a biased metric.

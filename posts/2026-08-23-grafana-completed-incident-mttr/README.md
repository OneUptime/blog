# Building a Grafana MTTR Dashboard from Completed Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, MTTR, Prometheus, Incident Analytics, Dashboard

Description: Build Grafana panels from one final duration per completed incident, with distributions, counts, tail percentiles, and open-incident context.

---

A live incident-age gauge is not an MTTR observation. It emits many values for a long incident, changes before recovery is known, and disappears or resets when the incident closes. Build the primary Grafana dashboard from a completion event or canonical incident table containing one final duration per eligible incident.

## Prepare the Incident Fact

The source should expose at least:

```text
incident_id
service
severity
failure_mode
impact_started_at
restored_at
recovery_seconds
measurement_policy_version
```

Validate that restoration follows impact start, the duration unit is seconds, and the row belongs to the declared cohort. Keep open incidents in a separate dataset with `restored_at` null. A ticket's resolved timestamp can be used only if the dashboard explicitly measures declaration-to-resolution workflow time.

## Query a SQL Data Source

For a summary over Grafana's selected range, group incidents by impact start and set the PostgreSQL query format to `Table`:

```sql
SELECT
  COUNT(*) AS completed_n,
  AVG(recovery_seconds) AS mean_seconds,
  percentile_cont(0.50) WITHIN GROUP
    (ORDER BY recovery_seconds) AS median_seconds,
  percentile_cont(0.75) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p75_seconds,
  percentile_cont(0.90) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p90_seconds,
  MAX(recovery_seconds) AS max_seconds
FROM incident_facts
WHERE $__timeFilter(impact_started_at)
  AND restored_at IS NOT NULL
  AND service IN (${service:sqlstring})
  AND measurement_policy_version = 3;
```

Configure units as seconds or convert in SQL. Do not append `mean time to recovery` to a panel whose query actually uses ticket closure.

For a monthly trend, set the PostgreSQL query format to `Time series`:

```sql
SELECT
  date_trunc('month', impact_started_at) AS time,
  COUNT(*) AS n,
  AVG(recovery_seconds) AS mean_seconds,
  percentile_cont(0.5) WITHIN GROUP
    (ORDER BY recovery_seconds) AS median_seconds,
  percentile_cont(0.9) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p90_seconds
FROM incident_facts
WHERE $__timeFilter(impact_started_at)
  AND restored_at IS NOT NULL
  AND service IN (${service:sqlstring})
  AND measurement_policy_version = 3
GROUP BY 1
ORDER BY 1;
```

Show `n` in the tooltip or a companion bar panel. A line based on one incident should not look as authoritative as a line based on forty.

## Feed Grafana from Prometheus Correctly

If incident completion is instrumented, observe each final duration exactly once in a histogram:

```text
incident_recovery_duration_seconds{service, severity, policy_version}
```

Keep labels bounded. Never use incident ID as a Prometheus label; it creates unbounded cardinality. Store IDs in the incident database and use exemplars only where your stack supports them appropriately.

For stat panels backed by Prometheus, set the query type to `Instant` so `$__range` produces one aggregate for the selected dashboard range. Running the same expression as a range query would calculate overlapping whole-range windows at every evaluation step. For classic histogram samples, the selected-range mean is:

```promql
sum(increase(incident_recovery_duration_seconds_sum[$__range]))
/
sum(increase(incident_recovery_duration_seconds_count[$__range]))
```

A p90 estimate is:

```promql
histogram_quantile(
  0.90,
  sum by (le) (
    increase(incident_recovery_duration_seconds_bucket[$__range])
  )
)
```

Choose buckets around operationally meaningful durations. Quantiles are estimates bounded by histogram resolution. Prometheus documentation recommends native histograms when feasible; check client and backend support before changing instrumentation.

Do not average summary quantiles across instances or services. Aggregate histogram observations, then calculate the quantile. Also remember that counter `increase()` semantics and range boundaries assign completion observations to the selected interval, whereas the SQL example assigns by impact start. Pick one cohort convention for comparable panels.

## Build Panels That Reveal the Distribution

A practical layout contains:

1. Stat panels for completed count, median, p75, p90, mean, and maximum.
2. A time series for median and p90 with a count panel beneath it.
3. A histogram fed one `recovery_seconds` value per incident.
4. A table of the slowest incidents with service, severity, impact, and postmortem link.
5. A separate open-incidents panel with current age and impact-to-date.
6. Coverage stats for missing start, missing restoration, and excluded records.

Grafana's histogram visualization accepts table data with numerical fields. Do not feed it monthly averages; that displays a distribution of monthly averages, not incident durations.

Grafana transformations can rename, join, calculate, and reduce fields. Use them for presentation, but keep cohort filtering and critical duration logic in the governed data layer. Transformation order affects results, and hidden panel logic is harder to audit than a versioned SQL view.

## Separate Open Incidents

Open incidents are right-censored: their final duration is not yet known. Show current age with a clearly different label:

```sql
SELECT
  incident_id,
  service,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - impact_started_at))
    AS current_age_seconds
FROM incident_facts
WHERE restored_at IS NULL
  AND impact_started_at IS NOT NULL;
```

Do not union current age into the completed histogram. Excluding open incidents from the completed aggregate is necessary, but show their count and age so the completed series cannot imply that everything recovered quickly.

## Add Variables Without Creating Misleading Comparisons

Use variables for service, severity, failure mode, policy version, and environment. Keep the `All` option, and show active filter values in panel titles. If a dimension produces a tiny cohort, display raw incident rows and suppress confident-looking tail trends.

Do not sum or average service-level means to obtain an organization mean. Query the underlying observations for the organization scope. Similarly, do not average p90 values.

## Verify the Dashboard

Create a fixture cohort with known durations and calculate expected count, mean, median, and p90 outside Grafana. Check time-range boundaries, time zones, units, null behavior, variable escaping, and histogram bucket output. Reconcile several linked incident IDs against source timelines.

Record dashboard, query, and measurement-policy versions. Annotate definition changes rather than connecting incompatible periods with one continuous line.

## Official Documentation

- [Grafana transform data](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/)
- [Grafana histogram visualization](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/histogram/)
- [Grafana PostgreSQL query editor](https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/)
- [Grafana Prometheus query editor](https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus querying functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Conclusion

A sound Grafana MTTR dashboard begins with one validated duration per completed incident. Show the distribution, tails, sample size, missingness, and open-incident context; use histograms correctly; and keep metric semantics in a versioned data model. Live age belongs in an operational panel, not in completed recovery statistics.

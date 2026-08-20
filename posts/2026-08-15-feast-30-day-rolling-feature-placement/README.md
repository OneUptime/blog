# Place a 30-Day Rolling Feature in the Right Feast Layer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Rolling Window, Feature Engineering, Aggregation, OnDemandFeatureView, Streaming

Description: Choose batch, streaming, native Feast aggregation, or request-time transformation from freshness, scale, and point-in-time needs.

---

A 30-day rolling feature is stateful time-window computation. The safest default is to compute it in the data platform that owns the raw events, publish time-stamped results, and let a Feast FeatureView make those results available for historical and online retrieval.

Use a request-time OnDemandFeatureView only when the 30-day state is already summarized. Use Feast's evolving native aggregation APIs only after verifying the exact compute engine and Feast release against production semantics.

## Start with the Feature Contract

For `purchases_30d`, define:

- entity key, such as `customer_id`;
- included event interval, such as `[T - 30 days, T]`;
- event-time versus processing-time semantics;
- handling of refunds and corrections;
- allowed lateness and watermark;
- output cadence and freshness objective;
- behavior before 30 days of history exists.

The output row's timestamp must represent the snapshot time `T`. Historical retrieval can then select the newest snapshot at or before each entity DataFrame observation without event-time leakage, provided each snapshot contains only information allowed by the feature contract at `T`.

## Prefer Batch for Hourly or Daily Freshness

Compute rolling snapshots in BigQuery, Snowflake, Spark, dbt, or the existing batch engine when an hourly or daily update satisfies the model. For example, with a BigQuery `TIMESTAMP` event column:

```sql
SELECT
  customer_id,
  event_timestamp,
  SUM(amount) OVER (
    PARTITION BY customer_id
    ORDER BY UNIX_MICROS(event_timestamp)
    RANGE BETWEEN 2592000000000 PRECEDING AND CURRENT ROW
  ) AS purchase_amount_30d
FROM analytics.customer_events;
```

SQL window syntax differs by warehouse, and a raw transaction table may require a time spine or incremental state table to emit a snapshot even when no event occurs at `T`. Validate the query in the official documentation for the selected warehouse.

Expose the result through a FeatureView:

```python
customer_rolling = FeatureView(
    name="customer_rolling_v1",
    entities=[customer],
    ttl=timedelta(days=2),
    schema=[Field(name="purchase_amount_30d", dtype=Float64)],
    source=customer_rolling_source,
    online=True,
)
```

`online=True` enables the view for online serving; it does not load the batch rows. Register the definition and schedule Feast materialization to copy snapshots from the offline source into the online store.

For historical retrieval, the FeatureView TTL bounds how far Feast scans backward from each entity DataFrame timestamp for a precomputed snapshot; it is not the 30-day aggregation window. A daily output might use a two-day TTL for historical-join headroom while the value itself summarizes 30 days. FeatureView TTL is not a universal online-store expiry setting; online expiry depends on the selected store.

## Use Streaming for Low-Latency Rolling State

Choose a streaming processor when the value must update within seconds or minutes. The processor should maintain event-time window state, define watermarks and late-event corrections, and emit identical entity keys, feature values, and event timestamps to:

- the online path for fresh serving;
- a durable offline history for point-in-time training.

With a configured `batch_source` and an offline store that supports batch writes, `FeatureStore.push(..., to=PushMode.ONLINE_AND_OFFLINE)` can propagate rows through a PushSource to both destinations. The producer remains responsible for computation, job operation, and consistency. Periodic batch materialization can repair the online store from canonical offline history.

Streaming adds state recovery, replay, deduplication, and dual-write failure modes. Do not choose it solely because the model is served online.

## Keep ODFVs Lightweight

An ODFV is appropriate for a final request-time calculation over already aggregated inputs:

```text
stored purchase_amount_30d / request credit_limit
stored purchases_30d + purchases_in_current_request
```

It is not the place to scan 30 days of raw events for each request. Feast documents ODFVs as local transformations in retrieval paths and notes that this can scale poorly for offline retrieval. The dedicated current reference labels the feature Beta and documents both transformations and grouped aggregations.

In Feast 0.65, ODFV aggregation groups only the rows already present in the retrieval response, and its online-serving path rejects a non-null `time_window`. Use it only when those input rows and grouping semantics already represent the intended population. Grouping whatever rows happen to arrive at request time is not a point-in-time 30-day window.

## Evaluate Native Feast Aggregation Carefully

Current Feast architecture documentation includes an `Aggregation` API with a function, column, and optional `time_window`, and compute engines expose aggregation nodes. This surface is developing and engine capabilities differ.

It can be a good fit when:

- the pinned compute engine supports the aggregation in both required paths;
- materialization and historical retrieval produce identical windows;
- data volume fits the engine;
- watermark, late-data, and deduplication behavior is tested;
- the team accepts the integration's stability level.

Do not assume that adding `time_window=timedelta(days=30)` alone defines snapshot cadence, closed/open interval boundaries, or correction behavior. Build golden tests at exactly `T - 30 days`, exactly `T`, and just outside both boundaries.

For an established warehouse pipeline, moving a stable rolling computation into a newer Feast aggregation surface may add risk without reducing ownership.

## Use a Decision Matrix

| Requirement | Best starting point |
| --- | --- |
| daily freshness, large warehouse history | batch pipeline plus FeatureView |
| minute freshness, event stream already exists | streaming state plus PushSource |
| ratio using one stored rolling value and request input | ODFV |
| supported Feast engine, tested window semantics | native Feast aggregation |
| strict reproducibility and mature SQL lineage | batch pipeline plus versioned table |

Whichever path computes the value, use the same definition for offline and online data. Comparing only column names does not prevent training-serving skew.

## Official Documentation

- [Feast feature transformation architecture](https://docs.feast.dev/getting-started/architecture/feature-transformation)
- [Feast architecture overview](https://docs.feast.dev/getting-started/architecture/overview)
- [Feast FeatureViews](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Feast Beta OnDemandFeatureView](https://docs.feast.dev/reference/beta-on-demand-feature-view)
- [Feast PushSource](https://docs.feast.dev/reference/data-sources/push)
- [Feast compute engines](https://docs.feast.dev/reference/compute-engine)
- [BigQuery window function calls](https://cloud.google.com/bigquery/docs/reference/standard-sql/window-function-calls)

## Conclusion

Precompute a 30-day rolling feature in batch unless freshness requires streaming or a pinned Feast compute engine has proven native aggregation parity. Let ODFVs combine already summarized state with request data, and keep the FeatureView TTL separate from the aggregation window.

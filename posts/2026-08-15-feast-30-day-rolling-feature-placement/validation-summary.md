# Validation Summary: Place a 30-Day Rolling Feature in the Right Feast Layer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Feast 0.65 FeatureViews, materialization, and point-in-time historical retrieval
- Feast OnDemandFeatureView and grouped aggregation
- Feast `Aggregation` API and compute engines
- Feast PushSource and streaming feature pipelines
- BigQuery GoogleSQL analytic window functions
- Python Feast SDK
- Batch processing with BigQuery, Snowflake, Spark, and dbt

## Sources Consulted
- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0) - latest released version used for the version-specific review.
- [Feast architecture overview](https://docs.feast.dev/getting-started/architecture/overview) - precomputation and transformation-engine guidance.
- [Feast feature transformation architecture](https://docs.feast.dev/getting-started/architecture/feature-transformation) - the developing `Aggregation` surface.
- [Feast FeatureViews](https://docs.feast.dev/getting-started/concepts/feature-view) and [point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) - current constructor concepts, timestamp selection, and historical TTL behavior.
- [Feast component overview](https://docs.feast.dev/getting-started/components/overview) and [online store](https://docs.feast.dev/getting-started/components/online-store) - registration, materialization, and online retrieval responsibilities.
- [Feast online-store capability overview](https://docs.feast.dev/reference/online-stores/overview) - provider-specific TTL-at-retrieval and expired-data deletion support.
- [Feast Beta OnDemandFeatureView](https://docs.feast.dev/reference/beta-on-demand-feature-view) - retrieval transformations, grouped aggregations, and experimental status.
- [Feast v0.65.0 ODFV online aggregation implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/utils.py#L670-L717) - response-row grouping and rejection of time-window aggregation during online serving.
- [Feast v0.65.0 `Aggregation` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/aggregation/__init__.py#L14-L54) - supported fields and the `datetime.timedelta` type required by `time_window`.
- [Feast PushSource](https://docs.feast.dev/reference/data-sources/push) - `batch_source`, `PushMode.ONLINE_AND_OFFLINE`, offline writes, and repair by materialization.
- [Feast compute engines](https://docs.feast.dev/reference/compute-engine) - aggregation DAG nodes and engine-dependent execution capabilities.
- [BigQuery window function calls](https://cloud.google.com/bigquery/docs/reference/standard-sql/window-function-calls) and [timestamp functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions) - numeric `RANGE` frames and `UNIX_MICROS` semantics.

## Issues Found
1. The point-in-time statement implied that a snapshot event timestamp alone prevents every form of future leakage. It now limits the claim to event-time leakage and states that each snapshot must contain only information allowed by the feature contract at `T`; late rewrites or corrections otherwise require their own availability policy.
2. The BigQuery query ordered the `RANGE` frame by `UNIX_SECONDS(event_timestamp)`. Because that conversion discards subsecond precision, rows just outside either exact boundary could become peers and enter the nominally closed 30-day interval. The query now uses `UNIX_MICROS` and a 2,592,000,000,000-microsecond boundary, matching BigQuery `TIMESTAMP` precision.
3. The FeatureView example did not distinguish enabling online serving from loading online data. The post now states that `online=True` does not load batch rows and that Feast materialization must copy snapshots from the offline source into the online store.
4. The TTL explanation could be read as a universal retrieval or online-expiry rule. It now scopes `FeatureView.ttl` to the historical point-in-time lookback in this example and notes that online expiry depends on the selected online-store implementation.
5. The PushSource wording implied unconditional propagation to both stores. It now specifies a configured `batch_source`, an offline store with batch-write support, and `PushMode.ONLINE_AND_OFFLINE`; Feast's default push mode is online only.
6. The ODFV section did not state the current runtime limit on windowed grouping. It now explains that Feast 0.65 groups only rows already present in the retrieval response and rejects a non-null `time_window` in the online-serving ODFV path.
7. The native aggregation example used `time_window="30d"`, but the current `Aggregation` API requires a `datetime.timedelta`. It was corrected to `time_window=timedelta(days=30)`.

## Review Notes
- Reviewed against Feast v0.65.0, the latest release as of 2026-08-20, and current Feast master commit `e79bd331694ffc7dd6023465b17348470afbe4e6` dated 2026-08-19.
- The FeatureView Python fragment is syntactically valid and uses current, non-deprecated constructor fields. It intentionally assumes prior definitions or imports for `customer`, `customer_rolling_source`, `timedelta`, `Field`, and `Float64`.
- The corrected BigQuery frame is a fixed elapsed interval of 30 times 24 hours with inclusive numeric endpoints. `RANGE` includes peers with the same ordering timestamp, and the query emits snapshots only at input-event timestamps; the post's time-spine caveat is therefore correct.
- Feast's aggregation behavior remains materially engine-dependent. In v0.65.0, the local and Flink compute engines reject non-null aggregation windows, while other engines have their own windowing and tiling semantics. The post's recommendation to pin the engine and release and use boundary tests is technically sound.
- Feast's current documentation is internally inconsistent in two places: the dedicated ODFV reference labels the feature Beta while the FeatureView concept page labels it Alpha, and the ODFV reference shows a time-window example even though the v0.65.0 online ODFV implementation rejects non-null `time_window`. The post follows the verified runtime behavior.
- All seven external documentation links in the post returned HTTP 200 during validation.

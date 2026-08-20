# Validation Summary: What Does `event_timestamp` Mean in a Feast Entity DataFrame?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Feast feature store
- Feast `FeatureStore` historical and online retrieval APIs
- Entity DataFrames and point-in-time joins
- FeatureView TTL and data source timestamps
- Python `datetime`
- pandas datetime and timezone handling

## Sources Consulted
- Feast quickstart: https://docs.feast.dev/getting-started/quickstart
- Feast feature retrieval concepts: https://docs.feast.dev/getting-started/concepts/feature-retrieval
- Feast point-in-time joins: https://docs.feast.dev/getting-started/concepts/point-in-time-joins
- Feast online store concepts: https://docs.feast.dev/getting-started/components/online-store
- Feast 0.65.0 `FeatureStore` source: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py
- Feast 0.65.0 `DataSource` source: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/data_source.py
- Feast master point-in-time documentation for created-timestamp behavior: https://github.com/feast-dev/feast/blob/master/docs/getting-started/concepts/point-in-time-joins.md
- Feast pull request for the newer created-timestamp filter: https://github.com/feast-dev/feast/pull/6617
- Feast 0.65.0 release: https://github.com/feast-dev/feast/releases/tag/v0.65.0
- pandas `to_datetime` API: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.to_datetime.html
- pandas `Timestamp.now` API: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Timestamp.now.html
- pandas time series and timezone guide: https://pandas.pydata.org/docs/user_guide/timeseries.html

## Issues Found
- The post described `event_timestamp` as answering what the model could have known at an instant. By default, Feast guarantees point-in-time correctness with respect to the source event timestamp, but `created_timestamp_column` is only a deduplication tiebreaker. A correction or backfill created after the entity-row timestamp can still be selected if its source event time is eligible. The post now states this limitation, distinguishes occurrence time from availability time, and frames the mental model explicitly in terms of feature event time.
- The post said `event_timestamp` was required for historical retrieval without qualification. Feast 0.65.0 also supports entity-less historical retrieval by date range on supported offline stores. The description and conclusion now scope the timestamp requirement to retrieval that uses an entity DataFrame.
- The online-store explanation said that an online store retains one latest value per entity key. It now says that online stores retain the latest feature values for each entity key, matching Feast's documented storage model.

## Review Notes
- All Python examples are syntactically valid and use current APIs. The pandas timestamp construction, UTC dtype check, and single-cutoff assignment behave as described. The historical retrieval example assumes that the current directory is a Feast feature repository defining the referenced `driver_stats` FeatureView and features.
- The dtype assertion is valid for the DataFrame constructed in the post, although checking a dtype's structured timezone metadata would be more robust than checking its string representation. Production validation should also use explicit exceptions if it must remain active when Python assertions are disabled.
- Feast's `filter_by_created_timestamp=True` option was merged into the official master branch after the latest stable 0.65.0 release and is not universally supported across offline stores. The post therefore documents the default backfill behavior without presenting this newer option as generally available.
- All external links in the post returned HTTP 200 during validation. The `/getting-started` link correctly redirects to the Feast quickstart.

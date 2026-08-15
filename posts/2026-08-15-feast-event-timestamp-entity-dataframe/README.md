# What Does `event_timestamp` Mean in a Feast Entity DataFrame?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Feature Store, Event Time, Entity DataFrame, Point-in-Time Join, Machine Learning

Description: Understand how Feast uses each entity-row timestamp as a historical lookup boundary and why training requests require it.

---

In a Feast entity DataFrame, `event_timestamp` is the time at which you want to reconstruct a feature vector. It is not the time when the retrieval job runs, the time when the label was loaded, or necessarily the timestamp column in a feature source.

That distinction is what makes a historical lookup point-in-time correct. For each entity row, Feast finds feature records for the requested entity key whose source event time is at or before the row's `event_timestamp`. It then selects the latest eligible record, subject to the FeatureView TTL.

The current Feast quickstart calls `event_timestamp` a reserved key and describes it as the upper bound for the point-in-time join.

## Follow the Two-Timestamp Model

Consider a label table and a feature table:

```text
label rows                         feature rows
driver_id  event_timestamp        driver_id  feature_event_time  rating
1001       10:30                  1001       09:00               4.7
1001       14:00                  1001       12:00               4.8
```

The 10:30 label row may receive the 09:00 rating. It must not receive the 12:00 rating because that value was in the future at the requested time. The 14:00 row may receive the 12:00 value.

The entity DataFrame timestamp and source timestamp have different roles:

- `entity_df["event_timestamp"]` is the lookup time for one requested feature vector.
- A source's `timestamp_field` identifies when each feature record occurred.
- An optional `created_timestamp_column` records when a source row was created and can break ties between revisions at the same event time.

Do not substitute ingestion time for event time unless that is genuinely the model's definition of when the fact became true.

## Build a Valid Entity DataFrame

The entity DataFrame must contain every join key needed by the requested FeatureViews and a timestamp for each historical request:

```python
from datetime import datetime, timezone

import pandas as pd
from feast import FeatureStore

entity_df = pd.DataFrame(
    {
        "driver_id": [1001, 1001, 1002],
        "event_timestamp": pd.to_datetime(
            [
                datetime(2026, 8, 1, 10, 30, tzinfo=timezone.utc),
                datetime(2026, 8, 1, 14, 0, tzinfo=timezone.utc),
                datetime(2026, 8, 1, 11, 0, tzinfo=timezone.utc),
            ],
            utc=True,
        ),
        "converted": [0, 1, 0],
    }
)

store = FeatureStore(repo_path=".")
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=["driver_stats:rating", "driver_stats:trips_7d"],
).to_df()
```

Feast preserves extra entity DataFrame columns such as `converted`; it does not interpret them as labels. This makes it practical to pass entity keys, observation times, labels, and request-time inputs together.

Use timezone-aware UTC values at the boundary of your pipeline. Pandas values should have a datetime dtype, not strings or Python objects mixed with nulls. Also confirm that the source timestamp type and the offline store's session timezone agree. A silent local-time assumption can move a lookup across a feature boundary.

## Choose the Timestamp from the Prediction Event

For training, the timestamp should represent when the prediction would have been made. Examples include:

- the checkout time for a fraud label;
- the impression time for a click label;
- the application time for a credit decision;
- the scoring cutoff for a daily batch prediction.

Using the label resolution time can leak information. A chargeback may be confirmed weeks after checkout, but the model must reconstruct features at checkout time, not at confirmation time.

For batch scoring, Feast's documentation uses the current time in the entity DataFrame to request the latest eligible offline values. Online retrieval is different: `get_online_features` accepts entity rows without timestamps because online stores retain one latest value per entity key.

```python
entity_df["event_timestamp"] = pd.Timestamp.now(tz="UTC")
```

Capture one cutoff and reuse it for the entire batch. Calling the clock separately per partition produces subtly different snapshots.

## Diagnose Timestamp Errors Before Retrieval

Validate the request before sending a large job:

```python
required = {"driver_id", "event_timestamp"}
missing = required.difference(entity_df.columns)
assert not missing, f"missing columns: {sorted(missing)}"
assert entity_df["driver_id"].notna().all()
assert entity_df["event_timestamp"].notna().all()
assert str(entity_df["event_timestamp"].dtype).endswith(", UTC]")
```

Then test a few entity rows for which the expected source record is known. Inspect the source rows immediately before and after each lookup timestamp. This reveals four common problems quickly:

1. the entity DataFrame contains the Entity name instead of its physical join key;
2. timestamps were parsed in the wrong timezone;
3. no source record existed before the requested time;
4. the nearest earlier record falls outside the FeatureView TTL.

## Keep the Meaning Stable

Treat `event_timestamp` as part of the training dataset contract. Document its business meaning, timezone, precision, and source. If a pipeline changes from transaction time to settlement time without changing the dataset version, the join may remain technically valid while the model learns from a different world.

The useful mental model is simple: every entity row asks, "What could this model have known for this entity at this instant?" Feast uses `event_timestamp` to answer that question without reading future feature values.

## Official Documentation

- [Feast quickstart](https://docs.feast.dev/getting-started)
- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)

## Conclusion

`event_timestamp` is required for historical retrieval because it supplies the upper time boundary for every requested feature vector. Use the prediction event's time, normalize it to UTC, provide all physical join keys, and verify a few known rows before producing a training dataset.

# Why Does a Feast Point-in-Time Join Return Nulls?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Point-in-Time Join, Feature Retrieval, TTL, Entity Key, Debugging

Description: Debug null historical features by tracing entity keys, timestamps, TTL windows, source rows, schemas, and offline-store execution.

---

A null from `get_historical_features` usually means Feast could not find an eligible source row for one entity, one FeatureView, and one lookup timestamp. Start with that three-part relationship instead of treating the whole training DataFrame as one opaque join.

For a row with entity key `E` and lookup time `T`, a point-in-time join needs a feature record that:

1. has the same complete entity key;
2. has a source event timestamp at or before `T`;
3. is no older than the FeatureView TTL relative to `T`;
4. contains the requested feature with a compatible value.

If no record satisfies those constraints, a null is the correct result.

## Reproduce One Null as a Time Window

Suppose a request contains:

```text
driver_id = 1001
event_timestamp = 2026-08-10T12:00:00Z
FeatureView TTL = 6 hours
```

The eligible source interval is `(2026-08-10T06:00:00Z, 2026-08-10T12:00:00Z]`, subject to the offline store's exact boundary implementation. Inspect the source directly:

```sql
SELECT driver_id, event_timestamp, created_timestamp, conversion_rate
FROM analytics.driver_features
WHERE driver_id = 1001
  AND event_timestamp <= TIMESTAMP '2026-08-10 12:00:00+00'
  AND event_timestamp >= TIMESTAMP '2026-08-10 06:00:00+00'
ORDER BY event_timestamp DESC, created_timestamp DESC;
```

If this query returns nothing, Feast cannot invent a value. If it returns the expected row, continue through the remaining checks.

## Check the Physical Join Keys

An Entity has a registry name and one or more physical `join_keys`. Historical entity columns must match the join keys, unless a FeatureView projection deliberately supplies a `join_key_map` alias.

```python
driver = Entity(name="driver", join_keys=["driver_id"])
```

For this Entity, `driver_id` belongs in the DataFrame. A column called `driver` is not automatically equivalent. Composite FeatureViews require every join key for every row.

Also compare actual types, not just printed values. The string `"1001"` and integer `1001` may not join. Leading zeros, trailing spaces, case normalization, and binary identifiers can create the same symptom. Normalize keys before writing the feature source and before building the entity DataFrame.

## Check Both Sides of Time

The entity DataFrame uses the reserved `event_timestamp` column as the requested snapshot time. The FeatureView source declares its own `timestamp_field`:

```python
source = BigQuerySource(
    table="analytics.driver_features",
    timestamp_field="feature_event_time",
    created_timestamp_column="created_timestamp",
)
```

Verify that both values are real timestamps in a common timezone. A source timestamp accidentally stored as local time, text, a date, or milliseconds interpreted as seconds can put all rows outside the expected interval.

A feature record after the entity timestamp is intentionally excluded. A record before it can still be excluded by TTL. Feast documents TTL as relative to each entity DataFrame timestamp, not relative to the current time when the query runs.

Temporarily widening TTL can be a useful diagnostic, but it is not automatically the correct fix. A long TTL may let obsolete feature values enter training. Choose TTL from the feature's business validity, then build source coverage that satisfies it.

## Separate a Null Row from a Null Feature Value

There are two different cases:

- no eligible feature row joined at all;
- an eligible row joined, but its requested feature column was null.

Query the entity key, source event timestamp, and all features from the same FeatureView. If every feature from that view is null, suspect the join. If only one is null, inspect the upstream feature value and its type.

Use a minimal retrieval to remove unrelated views and on-demand transformations:

```python
probe = entity_df.loc[[failing_index], ["driver_id", "event_timestamp"]]

result = store.get_historical_features(
    entity_df=probe,
    features=["driver_stats:conversion_rate"],
).to_df()

print(result.to_string(index=False))
```

## Verify the Registered Definition

The Python file in your working tree is not necessarily the definition used by the job. The FeatureStore reads a registry selected by `feature_store.yaml`. Check:

- the `project` is the expected environment;
- the registry path is the intended staging or production path;
- `feast apply` registered the current source, entities, TTL, and schema;
- clients have refreshed any registry cache;
- the requested feature reference uses the correct FeatureView name.

Avoid pointing a local diagnostic at a different registry and data warehouse than the failing job. That can produce a successful result that proves nothing about production.

## Check Duplicate Resolution and Source Mapping

When multiple revisions share an entity key and event timestamp, configure `created_timestamp_column` and ensure it increases for newer revisions. Otherwise the chosen row may be nondeterministic in some offline engines.

Field mappings can also rename source columns. Inspect the registered data source and query the mapped physical columns. A correct logical feature name does not help if its source expression is missing or null.

## Use a Small Debug Matrix

Build probes that distinguish failure classes:

| Probe | What it tests |
| --- | --- |
| known entity, known recent time | basic source and registry wiring |
| failing entity, known recent time | join-key coverage |
| known entity, failing time | timestamp and TTL coverage |
| failing entity and time with a wider diagnostic window | whether TTL is the exclusion |
| one raw FeatureView feature | whether an ODFV caused the null |

Do not fill nulls with zero until the cause is known. Zero may be a real measurement and can hide a broken join.

## Official Documentation

- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast entities](https://docs.feast.dev/getting-started/concepts/entity)
- [Feast FeatureViews](https://docs.feast.dev/getting-started/concepts/feature-view)

## Conclusion

Debug one null by writing down its complete entity key, lookup time, source timestamp, and TTL interval. Then verify the raw source row and the exact registered definition. This turns a broad Feast failure into a small, testable join predicate.

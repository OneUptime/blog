# Keep Feast Joins Correct with Duplicate and Late Rows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Point-in-Time Join, Deduplication, Late Data, Event Time, Training Data

Description: Make Feast joins deterministic with explicit event and created timestamps, bounded lateness, replay windows, and regression probes.

---

A point-in-time join is only deterministic when the source defines one winning feature record for each entity key and event time. Duplicate revisions without a reliable tie-breaker can produce unstable training rows. Late records can make a previously generated dataset differ from a later rerun.

Feast prevents future feature values from joining backward in time, but it cannot define your upstream correction policy or lateness contract for you.

## Give Every Timestamp One Meaning

Use three explicit clocks:

- `event_timestamp`: when the feature fact was true;
- `created_timestamp`: when this source revision was created;
- entity DataFrame `event_timestamp`: when the model observation occurred.

```python
source = BigQuerySource(
    table="analytics.merchant_features",
    timestamp_field="feature_event_timestamp",
    created_timestamp_column="feature_created_timestamp",
)
```

For a requested observation, Feast selects a matching feature event at or before the observation time and inside the FeatureView TTL. When source revisions have the same entity key and event timestamp, the created timestamp provides the tie-breaker expected by Feast's point-in-time logic.

Do not overload created time as event time. A correction written today for a transaction last week should still have last week's event time if it describes that past state.

## Make Duplicate Resolution Deterministic Upstream

The strongest source contract is:

```text
logical key = (all entity join keys, feature_event_timestamp)
winner      = greatest feature_created_timestamp
```

If two different rows can still share all three values, add an upstream deterministic revision identifier and publish a view that selects exactly one winner before Feast reads it.

For example, a BigQuery source view could select one revision with a numbering window:

```sql
SELECT * EXCEPT (revision_rank)
FROM (
  SELECT
    f.*,
    ROW_NUMBER() OVER (
      PARTITION BY merchant_id, feature_event_timestamp
      ORDER BY feature_created_timestamp DESC, revision_id DESC
    ) AS revision_rank
  FROM analytics.merchant_feature_revisions AS f
)
WHERE revision_rank = 1;
```

Feast does not need the `revision_id` if the source view has already resolved it. This avoids relying on database row order.

## Distinguish Source Duplicates from Entity Duplicates

Duplicate entity DataFrame rows may be intentional. Two identical entity and observation-time rows can represent two labels or examples with different non-key columns. Feast generally preserves the entity DataFrame rows and joins features onto them.

Do not run `drop_duplicates` blindly. First define the training example key, such as `(application_id, observation_time)`, and reject only duplicates that violate that contract.

Source duplicates are different: they compete to supply one feature state. Resolve those using the event and created timestamp policy.

## Model Late Arrival Explicitly

A late row has an old event timestamp but appears in the source after a materialization or training dataset was generated. It can affect two paths:

- a future historical retrieval can select it for old observations;
- an incremental materialization may miss it because its event time is behind the saved start watermark.

Use a published upstream watermark for closed event-time intervals. For normal bounded lateness, let the scheduler call explicit `materialize` windows with overlap:

```python
store.materialize(
    start_date=data_interval_start - timedelta(hours=2),
    end_date=data_interval_end,
    feature_views=["merchant_stats"],
)
```

Set two hours from an observed lateness distribution and a stated guarantee, not a guess. Keep a separate backfill path for records later than the normal overlap.

Repeated windows should be tested against the chosen online-store plugin. Online serving retains only the latest event-time value per entity, so an older late row should not displace a valid newer state.

## Decide Whether Training Datasets Are Mutable

If late corrections are accepted indefinitely, rerunning the same Feast request can produce different historical features. That may be desired, but it must be governed.

Choose one policy:

- freeze source snapshots and registry revision for reproducible model training;
- accept corrections until a dataset close time, then freeze;
- always use best-known history and record the extraction time and source revision.

Persist or version the resulting training dataset together with:

- entity-dataframe identity and hash;
- requested FeatureService name;
- Feast and feature-repository versions;
- source snapshot or warehouse time-travel reference;
- extraction timestamp and lateness cutoff.

Point-in-time correctness prevents future leakage within one retrieval. It does not make a changing source immutable.

## Test Boundary Cases

Create a small fixture with:

1. a feature exactly at the observation time;
2. one just after it, which must not join;
3. one just inside TTL;
4. one just outside TTL;
5. two revisions at the same event time with different created times;
6. a late row inside replay overlap;
7. a late row beyond replay overlap.

Run this fixture through the actual offline store. Point-in-time SQL varies by provider, and contributed integrations may have different maturity. Assert the full resulting values, not only row counts.

Also verify timezone and precision. Truncating source timestamps to seconds while created timestamps retain microseconds can unintentionally create more ties.

## Official Documentation

- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast FeatureViews](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Load data into the online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store)
- [BigQuery numbering functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions)

## Conclusion

Use event time for truth, created time for revision order, and an upstream deterministic winner for remaining ties. Bound normal lateness with watermarks and overlapping materialization windows, then version training snapshots whenever late corrections could change a rerun.

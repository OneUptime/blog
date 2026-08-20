# Push Streaming Features to Both Feast Stores Without Skew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, PushSource, Streaming Features, Training-Serving Skew, Online Store, Offline Store

Description: Push one computed feature row to online serving and durable history while designing for partial writes, replay, and event-time parity.

---

Feast PushSource can send fresh feature rows to the online store, the offline store, or both. `ONLINE_AND_OFFLINE` is useful, but it is not a substitute for an end-to-end consistency design. The two destinations have different storage semantics, and the documentation does not promise one distributed transaction across them.

Prevent training-serving skew by computing each feature once, preserving one event timestamp, keeping a durable replay source, and continuously comparing online values with offline history.

## Register One Push Contract

A PushSource can point to a batch source that supports historical retrieval and later materialization:

```python
from datetime import timedelta
from feast import Entity, FeatureView, Field, PushSource, ValueType
from feast.types import Float64, Int64

account = Entity(
    name="account",
    join_keys=["account_id"],
    value_type=ValueType.INT64,
)

account_push = PushSource(
    name="account_activity_push",
    batch_source=account_batch_source,
)

account_activity = FeatureView(
    name="account_activity_v1",
    entities=[account],
    ttl=timedelta(hours=6),
    schema=[
        Field(name="spend_1h", dtype=Float64),
        Field(name="transactions_1h", dtype=Int64),
    ],
    source=account_push,
    online=True,
)
```

For an online push, the DataFrame must contain every entity join key, the batch source's configured timestamp field, every declared feature, and the configured created-timestamp field when present. For `OFFLINE` or `ONLINE_AND_OFFLINE`, the current SDK additionally requires the DataFrame's column set to match the batch source table exactly:

```python
from feast import FeatureStore
from feast.data_source import PushMode

store = FeatureStore(repo_path="production")
store.push(
    "account_activity_push",
    feature_rows,
    to=PushMode.ONLINE_AND_OFFLINE,
)
```

Feast propagates a push to FeatureViews that consume the PushSource. The current documentation says users remain responsible for ensuring data reaches the batch data source when one is configured. Confirm that the selected offline-store plugin supports writes and test the actual path.

## Compute Once Before the Push

Do not implement one rolling-window function in the streaming service and another in the training warehouse. Produce a canonical feature record:

```text
account_id
feature event_timestamp
spend_1h
transactions_1h
producer revision
source event or window identifier
```

The online and offline copies must share the same entity values, Feast types, feature values, and event timestamp. Preserve extra revision and source identifiers in the canonical log even if they are not Feast features.

On-demand transformations can create derived values in retrieval paths, but they do not repair divergent base values.

## Make a Durable Log the Recovery Source

Before acknowledging input events, ensure they are recoverable from Kafka, Kinesis, an immutable object log, or another durable source. A practical sequence is:

```text
consume source event
  -> update deterministic window state
  -> emit canonical feature record to durable output topic
  -> push record to Feast destinations
  -> record outcome and retry from durable topic
```

For one synchronous `ONLINE_AND_OFFLINE` push to one FeatureView, Feast attempts the online write first and then the offline write, with no rollback. If the online write succeeds and the offline write fails, retrying must not create a different feature value or timestamp. Across retries or separate destination writers, the offline record may already exist while an online repair fails; replay should safely repair serving.

Use a stable feature-record identifier for producer deduplication. Online stores retain only one current value per entity and feature, but whether an older event-time write is rejected is store-specific. Offline stores may append duplicate rows. Configure `created_timestamp_column` or publish a deduplicated warehouse view so historical joins choose one deterministic revision.

By default, `created_timestamp_column` only breaks ties between rows with the same event timestamp; it is not an as-known-at-time cutoff. If training must reproduce what was available at each entity timestamp, use an installed Feast version and offline store that support `filter_by_created_timestamp=True`, or enforce the equivalent cutoff in a warehouse view.

## Treat Late Events Differently from Retries

A retry republishes the same logical feature record. A late source event may change an already emitted window.

For late corrections:

- emit the corrected window with the original feature event time and a later created or revision time;
- update canonical offline history deterministically;
- ensure an older corrected window does not displace a genuinely newer online feature state;
- emit a new latest snapshot if the current online state itself must change.

Do not assign a false future event time simply to win an online write.

## Use Periodic Materialization as Reconciliation

Feast's streaming guidance describes periodically materializing from the offline store to reduce training-serving skew. This only works if offline history is canonical and explicit windows include late corrections.

Run a reconciliation job that:

1. samples entity and event-time pairs from the durable record log;
2. reads their offline point-in-time value;
3. reads the latest online value where the pair represents current state;
4. compares value, type, missing status, and event timestamp;
5. replays an explicit materialization interval when safe;
6. pages on persistent divergence.

Materialization is a repair path, not proof of atomic push.

## Respect Online-Store Write Capabilities

The Feast online-store matrix differs on concurrent same-key writes. The current Redis matrix marks that capability supported; the current DynamoDB and PostgreSQL matrices mark it unsupported. A stream writer racing a batch materializer must match the selected plugin's contract.

Partition or fence writers by FeatureView and entity when necessary. With concurrent materialization jobs, use the SQL registry so materialization metadata updates are serialized, but remember that it does not make online and offline feature values transactional.

## Monitor Skew Directly

Track:

- push attempts and outcomes by `online`, `offline`, and `online_and_offline` mode;
- durable output-topic lag and retry age;
- offline append or merge success;
- online feature freshness;
- duplicate revisions per logical feature key;
- sampled online-versus-offline mismatch rate;
- periodic materialization repair counts.

The current Python feature server documents push counters and optional offline batching for `/push`. With `online_and_offline`, online writes remain immediate while the offline portion can be batched. Account for that expected lag in comparisons.

## Official Documentation

- [Feast PushSource](https://docs.feast.dev/reference/data-sources/push)
- [Feast data ingestion](https://docs.feast.dev/getting-started/concepts/data-ingestion)
- [Feast Kafka source](https://docs.feast.dev/reference/data-sources/kafka)
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store)
- [Feast Python feature server push endpoint](https://docs.feast.dev/reference/feature-servers/python-feature-server)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)

## Conclusion

Push one canonical feature record with one event timestamp to both destinations, but assume either write can fail independently. Recover from a durable log, make retries deterministic, deduplicate offline revisions, reconcile with periodic materialization, and measure skew directly.

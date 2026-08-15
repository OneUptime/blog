# Evolve a Feast FeatureView Schema Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, FeatureView, Schema Evolution, Type System, FeatureService, Migration

Description: Evolve Feast schemas additively when compatible and use versioned FeatureViews for type, key, timestamp, or semantic changes.

---

A Feast FeatureView schema is shared by source reads, historical joins, online storage, FeatureServices, and model clients. A change that a warehouse accepts can still break online serialization, a feature server, or a model's preprocessing.

The safest rule is: treat a FeatureView used by a deployed FeatureService as immutable. Add a field cautiously when compatibility is proven; create a new FeatureView name for type, entity, time, transformation, or semantic changes.

## Declare the Schema Explicitly

Feast can infer fields from a data source during `feast apply`, but inference makes an upstream column change part of deployment behavior. Pin public features and types:

```python
from feast import FeatureView, Field
from feast.types import Float64, Int64

account_stats_v1 = FeatureView(
    name="account_stats_v1",
    entities=[account],
    schema=[
        Field(name="account_age_days", dtype=Int64),
        Field(name="lifetime_value", dtype=Float64),
    ],
    source=account_stats_source,
    online=True,
    enable_validation=True,
)
```

Current FeatureView documentation says validation checks required columns and expected Feast types during materialization and historical retrieval. A missing required column raises `ValueError`, but type mismatches are logged as warnings and do not block execution. Make those warnings fatal in your own CI or preflight checks.

## Classify the Change

| Change | Typical treatment |
| --- | --- |
| add an optional independent field | potentially additive after backend and client tests |
| remove or rename a field | breaking, new FeatureView and FeatureService |
| `Int32` to `Int64` or scalar to list | breaking for serialization and consumers |
| change entity or join-key type | breaking storage identity |
| change source event timestamp or granularity | breaking temporal semantics |
| change TTL meaning | behavior change requiring model review |
| change transformation or unit | semantic break even if type is unchanged |

Do not rely on a language's implicit numeric cast. Feast's type system maps source types into Feast values and then into client-native values. Test both the offline-store mapping and online-store serialization.

## Add a Compatible Field in Stages

For a genuinely additive field:

1. publish and backfill the source column without changing Feast;
2. verify it is populated and maps to the intended Feast type;
3. add the explicit `Field` and apply it in staging;
4. materialize representative data and query it online;
5. add a new FeatureService for consumers that need it;
6. deploy the new model or client;
7. keep old FeatureServices selecting only the original fields.

An old FeatureService projection should not start requesting the new field automatically. Explicit selections provide a narrower contract than including the whole FeatureView.

Check the selected online store's infrastructure update behavior. The functionality matrix can say that infrastructure updates are supported without guaranteeing that every in-place type or layout mutation is safe.

## Version Every Breaking Change

Create parallel definitions:

```python
account_stats_v2 = FeatureView(
    name="account_stats_v2",
    entities=[account_v2],
    schema=[
        Field(name="account_age_days", dtype=Int64),
        Field(name="lifetime_value_minor_units", dtype=Int64),
    ],
    source=account_stats_v2_source,
    online=True,
)

risk_model_v9 = FeatureService(
    name="risk_model_v9",
    features=[account_stats_v2],
)
```

Apply `v2`, backfill or dual-write it, validate historical and online data, then canary the new FeatureService. Keep `v1` intact for the old model and rollback.

Changing only the FeatureService name is insufficient if both services point at one mutated FeatureView name.

## Understand Feast's Alpha FeatureView Versioning

Feast 0.65 introduces automatic FeatureView versioning as an alpha feature. Applying a schema or UDF change creates a new internal version, and `feast apply --no-promote` can register that version without making it active. This is useful for auditing changes and staging a rollout, but it is not yet a portable replacement for parallel FeatureView names:

- version-qualified online reads are supported only by the SQLite online store;
- offline historical retrieval cannot select a specific FeatureView version;
- a FeatureService resolves the active, promoted version rather than pinning its own version;
- each version needs its own materialization before it can serve online values.

Use the alpha mechanism where those constraints fit. For production migrations that need simultaneous old and new contracts across other stores or historical retrieval, keep the explicit `v1` and `v2` FeatureViews described above.

## Test Historical and Online Parity

Build golden cases for:

- null and default values;
- minimum and maximum numeric values;
- arrays, maps, JSON, or structs when used;
- timezone and timestamp precision;
- composite entity keys;
- values immediately inside and outside TTL;
- old and new schemas read side by side.

```python
old = store.get_online_features(
    features=store.get_feature_service("risk_model_v8"),
    entity_rows=canary_entities,
).to_dict()

new = store.get_online_features(
    features=store.get_feature_service("risk_model_v9"),
    entity_rows=canary_entities,
).to_dict()
```

Compare values after an explicit, documented conversion. For a units change, exact equality is not the right assertion, but a declared cents-to-currency relationship is.

## Coordinate Writers and Caches

Batch materializers, push producers, and feature servers must roll out in a compatible order. Do not let an old producer write a new view with the old shape. For streaming changes, dual-publish versioned records from one canonical computation or deploy a translator with clear ownership.

Registry and feature-server caches can keep old schemas visible temporarily. Allow the configured cache TTL before sending new requests, and monitor type errors and missing features by service version.

Current CLI documentation also says `feast apply` does not delete objects removed from repository Python. Retire `v1` only after all online, batch, retraining, and rollback consumers are gone, using an explicit deletion workflow.

## Official Documentation

- [Feast FeatureViews and schema validation](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Feast type system](https://docs.feast.dev/reference/type-system)
- [Feast FAQ on FeatureView immutability](https://docs.feast.dev/getting-started/faq)
- [Feast alpha FeatureView versioning](https://docs.feast.dev/reference/alpha-feature-view-versioning)
- [Feast FeatureServices and retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast CLI apply behavior](https://docs.feast.dev/reference/feast-cli-commands)
- [Feast online-store functionality overview](https://docs.feast.dev/reference/online-stores/overview)

## Conclusion

Pin explicit fields and treat validation warnings seriously. Roll out compatible additions source-first and expose them through a new FeatureService. For any type, key, timestamp, or meaning change, create and populate a versioned FeatureView, canary it, and retain the old contract for rollback.

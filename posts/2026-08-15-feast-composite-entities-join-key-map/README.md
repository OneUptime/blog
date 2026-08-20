# Feast Composite Entities and `join_key_map` Aliases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Entity, Composite Key, join_key_map, FeatureService, FeatureView

Description: Model true multi-key features with composite entities and reuse one FeatureView for role-based aliases through projections.

---

Composite entities and `join_key_map` solve different problems in Feast.

- A composite entity key says a feature belongs to a combination such as `(user, merchant_category)`.
- A join-key map gives an existing entity join key a request-side alias such as `origin_id` or `destination_id`.

An alias does not remove a key from a composite entity, change the physical source schema, or merge two entities.

## Define a Composite Entity Key

Create one Entity per reusable domain concept, then attach multiple Entities to the FeatureView:

```python
from datetime import timedelta

import pandas as pd
from feast import Entity, FeatureView, Field, ValueType
from feast.types import Int64

user = Entity(
    name="user",
    join_keys=["user_id"],
    value_type=ValueType.INT64,
)
merchant_category = Entity(
    name="merchant_category",
    join_keys=["merchant_category_id"],
    value_type=ValueType.INT64,
)

user_category_stats = FeatureView(
    name="user_category_stats",
    entities=[user, merchant_category],
    ttl=timedelta(days=30),
    schema=[Field(name="purchases_30d", dtype=Int64)],
    source=user_category_source,
)
```

The entity key is now the tuple of both join-key values. Without a projection, historical entity rows must contain both join-key columns:

```python
entity_df = pd.DataFrame(
    {
        "user_id": [101, 101],
        "merchant_category_id": [7, 12],
        "event_timestamp": pd.to_datetime(
            ["2026-08-01T10:00:00Z", "2026-08-01T10:00:00Z"], utc=True
        ),
    }
)
```

Online reads also supply the complete key:

```python
store.get_online_features(
    features=["user_category_stats:purchases_30d"],
    entity_rows=[{"user_id": 101, "merchant_category_id": 7}],
)
```

Omitting a component is not a request for all categories for one user. Feast online lookup is key-based and does not provide a scan or partial-key query through this API.

## Reuse One Entity in Two Roles

Suppose one `location_stats` FeatureView is keyed by `location_id`, but a route model needs both origin and destination features. Duplicating the underlying FeatureView definition would split ownership and metadata.

Project the same FeatureView twice inside a FeatureService:

```python
from feast import FeatureService

route_features_v1 = FeatureService(
    name="route_features_v1",
    features=[
        location_stats.with_name("origin_stats").with_join_key_map(
            {"location_id": "origin_id"}
        ),
        location_stats.with_name("destination_stats").with_join_key_map(
            {"location_id": "destination_id"}
        ),
    ],
)
```

The map direction is original FeatureView join key to the alias expected in the request. `.with_name(...)` gives each projection a distinct FeatureView reference. With `full_feature_names=True`, those projected names also prefix the outputs, for example `origin_stats__temperature` and `destination_stats__temperature`.

The corresponding entity rows use the aliases:

```python
route_entities = [
    {"origin_id": "LHR", "destination_id": "JFK"},
    {"origin_id": "CDG", "destination_id": "LHR"},
]

store.get_online_features(
    features=store.get_feature_service("route_features_v1"),
    entity_rows=route_entities,
    full_feature_names=True,
)
```

Use the same FeatureService projection and `full_feature_names=True` for training so historical and online requests share alias and output-name semantics.

## Do Not Use Aliases as Source Mappings

`join_key_map` is a retrieval projection. It is not the mechanism for saying a warehouse column called `account_number` represents the Entity join key `account_id`. Source field mappings or an upstream view should normalize physical source columns according to the selected data-source integration.

Similarly, aliases do not change storage identity. If a FeatureView is genuinely keyed by both account and region, aliasing `account_id` to `payer_id` does not make region optional.

For portable behavior across Feast integrations, provide a complete map for a composite projection: map every changed key and include identity mappings for unchanged keys.

```python
pair_features.with_join_key_map(
    {
        "user_id": "sender_id",
        "merchant_id": "recipient_merchant_id",
    }
)
```

A complete mapping follows Feast's documented contract and is easier to audit for role-heavy models.

## Avoid Ambiguous Output Names

If the same FeatureView appears twice, output features such as `temperature` or `risk_score` need distinct projected view names. Set `full_feature_names=True` whenever repeated projections expose the same feature names, and inspect the resulting columns during development.

Write a contract test that asserts:

- every required alias is present;
- swapping origin and destination swaps the expected features;
- missing one composite key produces a clear failure or missing status;
- historical and online retrieval use the same FeatureService;
- entity key types remain stable.

Entity-key type changes are schema changes. The integer `7` and string `"7"` may serialize differently online even if a warehouse casts them during an offline join.

## Choose the Right Model

Use a composite key when the feature is a property of the combination. `purchases_30d` for user and merchant category belongs to both.

Use aliases when one domain entity plays multiple roles in one request. Origin and destination are both locations.

Use separate entities when the concepts have different identity, governance, or lifecycle even if their physical ID types happen to match.

## Official Documentation

- [Feast entities](https://docs.feast.dev/getting-started/concepts/entity)
- [Feast FeatureViews and entity aliasing](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast FeatureServices and retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)

## Conclusion

Composite entities create one multi-part storage and join key. `join_key_map` aliases existing keys in a FeatureView projection, most usefully when one FeatureView plays several roles in a FeatureService. Supply every real key, map aliases in the documented direction, and test the same projection offline and online.

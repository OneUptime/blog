# Validation Summary: Feast Composite Entities and `join_key_map` Aliases

## Status

validated

## Post Type

Technical guide / reference

## Technologies Covered

- Feast 0.65.0 Python SDK
- Python and pandas
- Feast entities and composite entity keys
- FeatureViews and FeatureView projections
- FeatureServices
- Online and historical feature retrieval
- `join_key_map`, `with_name`, and `full_feature_names`
- Data-source field mappings

## Sources Consulted

- Feast entity concepts: https://docs.feast.dev/getting-started/concepts/entity
- Feast FeatureView and entity-aliasing concepts: https://docs.feast.dev/getting-started/concepts/feature-view
- Feast feature retrieval and FeatureService concepts: https://docs.feast.dev/getting-started/concepts/feature-retrieval
- Feast v0.65.0 release: https://github.com/feast-dev/feast/releases/tag/v0.65.0
- Feast v0.65.0 `Entity` implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/entity.py
- Feast v0.65.0 `FeatureView.with_join_key_map` implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py
- Feast v0.65.0 online aliasing integration tests: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/tests/integration/online_store/test_universal_online.py
- Feast v0.65.0 historical aliasing and collision tests: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/tests/utils/feature_records.py
- Feast ADR-0004, Entity Join Key Mapping: https://github.com/feast-dev/feast/blob/v0.65.0/docs/adr/ADR-0004-entity-join-key-mapping.md
- Feast v0.65.0 Ibis historical retrieval implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/ibis.py

## Issues Found

- The pandas example used `pd` without importing pandas. Added `import pandas as pd` to the composite-entity example.
- The two `Entity` definitions omitted `value_type`. Feast 0.65.0 still infers it, but emits a `DeprecationWarning` that an explicit value type will become mandatory. Added `ValueType.INT64` to both entities.
- The post called the columns in the historical `entity_df` “physical columns.” Those are request-side join-key columns; physical feature-source columns can differ through a data-source field mapping. Changed the wording to require both join-key columns when no projection is used.
- The aliased online retrieval example omitted `full_feature_names=True`. With two projections exposing the same feature names, current Feast raises `FeatureNameCollisionError` under the default unqualified naming mode. Added the flag, explained the projected output prefixes, and required the same setting for historical retrieval of this FeatureService.
- The composite-map guidance allowed unmapped unchanged keys based only on version testing. Feast's accepted mapping contract requires a complete map, and Ibis-backed offline stores build joins only from the supplied entries. Updated the guidance to require identity mappings for unchanged keys for portable behavior across integrations.

## Review Notes

- The examples intentionally assume that `user_category_source`, `location_stats`, and a configured `store` have already been defined.
- The remaining claims about composite keys, map direction, query-only projections, complete-key online lookup, source mappings, and entity-key type stability agree with the official documentation and v0.65.0 implementation.
- All four official documentation links in the post returned HTTP 200 during validation.

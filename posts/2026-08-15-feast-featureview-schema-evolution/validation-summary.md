# Validation Summary: Evolve a Feast FeatureView Schema Safely

## Status
validated

## Post Type
Technical guide / migration guide

## Technologies Covered
- Feast 0.65 Python SDK
- FeatureView and Field schemas
- Feast type system and schema validation
- FeatureService projections and feature retrieval
- Offline and online stores
- Materialization and PushSource ingestion
- Alpha FeatureView versioning
- Feast CLI and registry caching

## Sources Consulted
- Feast FeatureView, schema inference, and schema validation documentation: https://docs.feast.dev/getting-started/concepts/feature-view
- Feast type-system documentation: https://docs.feast.dev/reference/type-system
- Feast FeatureService and retrieval documentation: https://docs.feast.dev/getting-started/concepts/feature-retrieval
- Feast FeatureView immutability FAQ: https://docs.feast.dev/getting-started/faq
- Feast alpha FeatureView versioning reference: https://docs.feast.dev/reference/alpha-feature-view-versioning
- Feast 0.62 release notes, which introduce FeatureView version tracking: https://github.com/feast-dev/feast/releases/tag/v0.62.0
- Feast 0.63 release notes, which add versioning support to more online stores: https://github.com/feast-dev/feast/releases/tag/v0.63.0
- Feast 0.65 online-store versioned-read implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/online_store.py
- Feast 0.65 FeatureView, FeatureService, and projection implementations: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_service.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/base_feature_view.py
- Feast 0.65 historical-retrieval and validation-node implementations: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/passthrough_provider.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/compute_engines/local/nodes.py
- Feast 0.65 `--no-promote` and registry implementations: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/cli/cli.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/registry.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/sql.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/snowflake.py
- Feast 0.65 Go feature-server feature-reference parser: https://github.com/feast-dev/feast/blob/v0.65.0/go/internal/feast/onlineserving/serving.go
- Feast CLI and registry deletion documentation: https://docs.feast.dev/reference/feast-cli-commands, https://docs.feast.dev/getting-started/components/registry#deleting-objects-from-the-registry
- Feast online-store functionality matrix and registry-cache guidance: https://docs.feast.dev/reference/online-stores/overview, https://docs.feast.dev/how-to-guides/online-server-performance-tuning#registry-cache-tuning
- Feast point-in-time join and PushSource documentation: https://docs.feast.dev/getting-started/concepts/point-in-time-joins, https://docs.feast.dev/reference/data-sources/push

## Issues Found
1. **Schema-validation behavior was stated too broadly.** The documentation describes validation during materialization and historical retrieval, but Feast 0.65's passthrough historical-retrieval path delegates directly to the offline store rather than running the compute-engine validation node. Qualified the guarantee by execution path and advised verifying enforcement for the selected provider and compute engine.

2. **The additive-change classification called a field "optional."** Feast does not declare optional fields in this example, and schema validation treats every declared feature column as required. Reworded the row to mean a field that existing consumers do not select.

3. **FeatureService projection behavior was ambiguous.** A service declared with `features=[feature_view]` selects all current fields and can expand when its definition is rebuilt and reapplied after a schema addition. Added the explicit `feature_view[[...]]` projection syntax required to keep the old contract narrow.

4. **The second Python snippet omitted the `FeatureService` import.** Added `from feast import FeatureService` so the API symbol used by the snippet is defined.

5. **The FeatureView versioning release attribution was incorrect.** Automatic FeatureView version tracking was introduced in Feast 0.62, not 0.65. Corrected the version while noting that the feature remains alpha in 0.65.

6. **The alpha-versioning limitations were outdated and incomplete.** The post repeated the older SQLite-only limitation. Feast 0.65 implements Python version-qualified online reads for SQLite, MySQL, PostgreSQL, FAISS, Redis, DynamoDB, and Milvus. Added the required `registry.enable_online_feature_view_versioning` setting, the Go feature-server limitation, and the registry-backend qualification for `--no-promote`.

## Review Notes
- The `FeatureView`, `Field`, Feast type aliases, `FeatureService`, `get_feature_service`, `get_online_features`, and `to_dict` APIs used in the examples are current in Feast 0.65.
- Missing-column `ValueError` behavior and type-mismatch warnings are accurate for execution paths that invoke Feast's validation node; backend-native failures may differ when a path bypasses that node.
- Feast 0.65's alpha-versioning documentation still contains a stale SQLite-only support statement and overstates registry portability. The corrections follow the tagged release history and implementation.
- FeatureView TTL defines the offline point-in-time lookup window; online expiry support remains online-store-specific. The post's backend-testing advice covers this distinction.
- The immutability guidance, explicit deletion requirement after `feast apply`, online-store infrastructure caveat, cache-staleness warning, type/key/timestamp migration advice, and retrieval examples were verified as correct.
- All seven external documentation links in the post resolved successfully and pointed to the intended official Feast pages.

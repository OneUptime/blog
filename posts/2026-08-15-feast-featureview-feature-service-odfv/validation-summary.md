# Validation Summary: Choose a Feast Object: FeatureView, FeatureService, or ODFV

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Feast 0.65.0
- Python and pandas
- FeatureView, BatchFeatureView, and StreamFeatureView
- FeatureService and feature projections
- OnDemandFeatureView (ODFV) and RequestSource
- Historical and online feature retrieval
- Online materialization and feature-view versioning

## Sources Consulted

- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0)
- [Feast FeatureView concepts](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Feast feature retrieval and FeatureService concepts](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast data ingestion and materialization](https://docs.feast.dev/getting-started/concepts/data-ingestion)
- [Feast Beta OnDemandFeatureView reference](https://docs.feast.dev/reference/beta-on-demand-feature-view)
- [Feast BatchFeatureView documentation](https://docs.feast.dev/getting-started/concepts/batch-feature-view)
- [Feast Alpha feature-view versioning](https://docs.feast.dev/reference/alpha-feature-view-versioning)
- [Feast 0.65.0 FeatureView implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py)
- [Feast 0.65.0 FeatureService implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_service.py)
- [Feast 0.65.0 OnDemandFeatureView implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/on_demand_feature_view.py)
- [Feast 0.65.0 FeatureStore retrieval implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py)

## Issues Found

- The post attributed transformation and aggregation fields to a plain `FeatureView`. In Feast 0.65.0, those fields belong to specialized, experimental types such as `BatchFeatureView` and `StreamFeatureView`. The text now names the correct types and retains the compute-engine caveat.
- The statement that a FeatureService “only selects references” was too absolute for current Feast, which also exposes service-level logging and online precomputation configuration. The text now describes reference selection as its core role while correctly stating that it does not define transformations, run model inference, or deploy a server.
- The projection sentence could imply that `.with_name()` and `.with_join_key_map()` are FeatureService methods. They are called on a FeatureView while constructing a FeatureService, so the sentence was updated to identify the owning object.

## Review Notes

All Python examples match the Feast 0.65.0 constructor and retrieval APIs. The ODFV Beta/experimental caveat, local offline-scaling warning, write-time behavior, aggregation support, materialization advice, and versioning guidance agree with current official documentation. `OnlineResponse.to_dict()` does not include Feast field-status enums; tests that need exact statuses should inspect the raw response proto or feature-server response before conversion. The Official Documentation section contains two labels for the same feature-retrieval URL, which is redundant but not technically incorrect.

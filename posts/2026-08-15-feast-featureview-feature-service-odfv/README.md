# Choose a Feast Object: FeatureView, FeatureService, or ODFV

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, FeatureView, FeatureService, OnDemandFeatureView, Feature Engineering, MLOps

Description: Choose the Feast object that models stored feature data, a model input contract, or a lightweight request-time transformation.

---

FeatureView, FeatureService, and OnDemandFeatureView are complementary Feast objects. They are not three ways to name the same collection.

- A FeatureView models time-series feature data and its source, entities, schema, TTL, and online behavior.
- A FeatureService groups the exact features consumed by a model version.
- An OnDemandFeatureView, or ODFV, defines a lightweight derived transformation from existing features and request-time data.

Choose by responsibility, then compose them.

## Use a FeatureView for a Data Product

A FeatureView describes where feature records live and how Feast should interpret them:

```python
from datetime import timedelta
from feast import FeatureView, Field
from feast.types import Float32, Int64

driver_stats = FeatureView(
    name="driver_stats_v1",
    entities=[driver],
    ttl=timedelta(days=7),
    schema=[
        Field(name="acceptance_rate", dtype=Float32),
        Field(name="trips_30d", dtype=Int64),
    ],
    source=driver_stats_source,
    online=True,
)
```

Use the classic form when values already exist in a batch or push source and need historical retrieval, online materialization, or both. Current Feast also exposes transformation and aggregation fields that compatible compute engines can execute, but the FeatureView still defines the resulting data product and its retrieval contract. Treat those newer surfaces as version-specific engine capabilities.

Keep fields with the same entities, source cadence, ownership, and freshness contract together. Do not make one giant FeatureView solely to reduce the number of objects.

## Use a FeatureService for a Model Contract

A FeatureService selects all or part of one or more views for one model version:

```python
from feast import FeatureService

fraud_model_v3 = FeatureService(
    name="fraud_model_v3",
    features=[
        driver_stats[["acceptance_rate"]],
        account_risk[["chargebacks_90d", "account_age_days"]],
    ],
)
```

Use the same FeatureService for training and online inference:

```python
service = store.get_feature_service("fraud_model_v3")

training = store.get_historical_features(
    entity_df=training_entities,
    features=service,
).to_df()

online = store.get_online_features(
    features=service,
    entity_rows=request_entities,
).to_dict()
```

Applying a FeatureService does not deploy a network service. It stores metadata that groups feature references. Feast recommends one FeatureService per model version, which gives models an explicit dependency contract.

## Use an ODFV for Lightweight Derived Features

An ODFV combines existing features with request-only inputs and executes equivalent logic in historical and online paths:

```python
import pandas as pd
from feast import Field, RequestSource
from feast.on_demand_feature_view import on_demand_feature_view
from feast.types import Float64

request = RequestSource(
    name="request_context",
    schema=[Field(name="requested_amount", dtype=Float64)],
)

@on_demand_feature_view(
    sources=[account_risk, request],
    schema=[Field(name="amount_to_limit", dtype=Float64)],
    mode="pandas",
)
def amount_to_limit(inputs: pd.DataFrame) -> pd.DataFrame:
    output = pd.DataFrame()
    output["amount_to_limit"] = (
        inputs["requested_amount"] / inputs["credit_limit"]
    )
    return output
```

Use an ODFV for small, deterministic transformations that must combine request context with stored features. Examples include ratios, thresholds, and encoding request attributes.

The dedicated current Feast reference labels ODFVs Beta, while some concept pages still describe experimental status. Pin the Feast version, review its documented modes, and regression-test both retrieval paths. Current documentation also notes that local execution is acceptable for online serving but can scale poorly for large offline retrieval.

ODFVs can also be configured to transform on write, and the current reference documents aggregation support. Those options have different storage and execution semantics. Do not enable them without testing the pinned release.

## Do Not Put Heavy Pipelines in an ODFV

A 30-day rolling window over billions of raw events is not a lightweight request transform. Compute it in a batch warehouse or streaming pipeline, persist time-stamped results, and expose them through a FeatureView.

Likewise, a FeatureService does not compute features, enforce model inference, or deploy a server. It only selects references. A FeatureView does not identify which subset one deployed model uses.

Use this decision table:

| Need | Object |
| --- | --- |
| locate typed, time-stamped feature data | FeatureView |
| materialize latest values online | FeatureView |
| define exact inputs for model version 7 | FeatureService |
| select two fields from a large view | FeatureService projection |
| combine stored value with request amount | ODFV |
| run large rolling aggregation over raw events | upstream batch or stream job, then FeatureView |

## Compose and Version Deliberately

A common production graph is:

```text
upstream computation
  -> FeatureView v1
  -> optional ODFV
  -> FeatureService model_v3
  -> training and serving clients
```

If a FeatureView's schema or meaning changes incompatibly, create a new FeatureView name. Merely creating `model_v4` does not isolate it if both services point to one mutated view name. Add the new service, materialize required online data, canary it, and retain the old graph for rollback.

FeatureServices may also use `.with_name()` and `.with_join_key_map()` projections to reuse one FeatureView in roles such as origin and destination.

## Test the Object Boundaries

For every model FeatureService:

- retrieve a small point-in-time dataset;
- retrieve the same logical cases online;
- assert feature names, types, and missing statuses;
- test ODFV edge cases such as division by zero and null inputs;
- verify the service name recorded with the model artifact;
- load test transformations in the actual feature server.

This catches a correct individual object assembled into an incorrect model contract.

## Official Documentation

- [Feast FeatureViews](https://docs.feast.dev/getting-started/concepts/feature-view)
- [Feast FeatureServices and retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast Beta OnDemandFeatureView reference](https://docs.feast.dev/reference/beta-on-demand-feature-view)

## Conclusion

Put sourced, time-stamped data in a FeatureView; put one model version's dependency set in a FeatureService; and use an ODFV only for lightweight derived logic that must run consistently at retrieval. Compose all three when necessary, but keep each responsibility visible and versioned.

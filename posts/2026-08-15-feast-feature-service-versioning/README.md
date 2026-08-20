# Version Feast Feature Services Without Breaking Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, FeatureService, Model Versioning, Feature Contract, Deployment, MLOps

Description: Bind every model version to an immutable Feast feature contract, deploy new services additively, and retain a tested rollback path.

---

Feast recommends one FeatureService per model version. That works only if the service name, its selected fields, and every referenced FeatureView keep stable semantics for the lifetime of the deployed model.

A FeatureService is registry metadata, not a network deployment and not a snapshot of FeatureView definitions. If two services reference the same FeatureView name and that view is changed incompatibly, both model versions can break.

## Make the Model-to-Service Binding Explicit

Name the service from an immutable model contract:

```python
from feast import FeatureService

fraud_model_v17 = FeatureService(
    name="fraud_model_v17",
    features=[
        account_stats_v2[["chargebacks_90d", "account_age_days"]],
        payment_stats_v3[["amount_zscore_30d"]],
    ],
)
```

Store at least these values with the model artifact:

```json
{
  "model_name": "fraud-model",
  "model_version": "17",
  "feast_project": "fraud_prod",
  "feature_service": "fraud_model_v17",
  "feature_repo_commit": "8d7b3f1",
  "feast_version": "<pinned release>"
}
```

Training and serving must resolve the same service:

```python
service = store.get_feature_service(model_metadata["feature_service"])

training_df = store.get_historical_features(
    entity_df=training_entities,
    features=service,
).to_df()

online_values = store.get_online_features(
    features=service,
    entity_rows=request_entities,
).to_dict()
```

Do not reconstruct a list of string feature references separately in the serving repository. That creates a second, drifting contract.

## Treat Used FeatureViews as Immutable

The Feast FAQ says FeatureViews used by a FeatureService are intended to be immutable and not deleted until the service is removed. Follow that rule even if the current `apply` command does not block every incompatible mutation.

Create a new FeatureView name when changing:

- entity or join-key identity (use a new Entity name as well as a new FeatureView name);
- field type or shape;
- event-time or TTL semantics;
- transformation logic or feature meaning;
- source granularity or normalization;
- online storage behavior.

An additive field can sometimes remain in the same FeatureView, but it still changes the FeatureView schema and may update deployment infrastructure. Explicit schemas and a staged compatibility test are safer. If rollback or independent materialization matters, use a new FeatureView name.

## Deploy Additively

Use this order:

1. add new FeatureViews and `fraud_model_v18` without editing `v17`;
2. run repository tests and historical point-in-time probes;
3. apply the new definitions to staging;
4. materialize the new online FeatureViews or push values through their configured PushSources;
5. test online values through the real feature server;
6. train and register model version 18 with the service name;
7. canary the new model and service together;
8. shift traffic gradually;
9. keep version 17 and its data available for rollback.

The CLI `feast apply` computes a full diff between the feature repository and registry. It can delete registry objects that are no longer declared and remove their associated infrastructure. Keep the old definitions in the repository during an additive rollout, review `feast plan` before applying, and retire them only in a separate reviewed change.

## Validate the Contract Before Traffic

Generate a manifest from the FeatureService and its resolved FeatureViews and ODFVs, and assert:

- exact output column names and order expected by preprocessing;
- Feast field types and model-required array lengths or shapes;
- all required entity join keys and request fields;
- TTL and missing-value policy;
- ODFV transformation code, mode, `singleton`, and `write_to_online_store` settings;
- historical and online results for golden entities.

Model input order should come from named columns, not accidental dictionary iteration. Fail closed if a required feature is absent or has the wrong type. Default values must be versioned model behavior, not a feature adapter's undocumented fallback.

Historical retrieval always recomputes an ODFV. For a read-time ODFV, test both historical and online retrieval; for a write-time ODFV, also test materialization or ingestion and the stored online result. The ODFV's `mode` and `singleton` settings define its UDF input representation, while the paths differ in batch size and execution context.

## Handle A/B Tests and Rollback

Load the FeatureService specified by each model variant. Do not make a mutable alias such as `fraud_model_current` the only binding stored with the artifact.

```text
10% traffic -> model 18 -> fraud_model_v18
90% traffic -> model 17 -> fraud_model_v17
```

Monitor missing rate, feature age, type errors, feature distribution, latency, and model outcomes by service name. A single aggregate hides a fault isolated to the canary.

Rollback should switch model and FeatureService together. If `v18` writes a new online schema, leaving the model on `v17` while fetching `v18` is not a rollback.

## Retire Only After Dependency Proof

Before deleting a FeatureService or FeatureView:

- query the model registry and deployment inventory for references;
- include batch scoring and retraining jobs, not only online services;
- wait through the rollback and reproducibility retention periods;
- remove consumers first;
- use Feast's explicit deletion workflow;
- verify registry caches and infrastructure cleanup separately.

Keep an archived feature-repository commit even after operational data retention ends. It explains what a historical model expected.

## Official Documentation

- [Feast FeatureServices and retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast on-demand feature views](https://docs.feast.dev/reference/beta-on-demand-feature-view)
- [Feast FAQ on model and feature versioning](https://docs.feast.dev/getting-started/faq)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast CLI reference](https://docs.feast.dev/reference/feast-cli-commands)
- [Feast 0.65 CLI apply implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/repo_operations.py)

## Conclusion

Bind each model artifact to one immutable FeatureService name and repository revision. Add new services and incompatible FeatureViews alongside old ones, validate and materialize before traffic, and roll back the model and feature contract as one unit.
